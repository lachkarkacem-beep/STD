import { NextResponse } from "next/server";
import { chercheVille, trajet } from "@/lib/geo.mjs";

// Distance jusqu'à l'atelier depuis une adresse saisie.
//
// Le géocodage passe par ici, et non par le navigateur, pour deux raisons :
// Nominatim exige un User-Agent qui identifie l'application — qu'un fetch
// côté navigateur ne peut pas poser — et le cache mis en place ici évite de
// réinterroger le service pour « Tunis » cent fois par jour.

export const runtime = "nodejs";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

// Politique d'usage de Nominatim : se nommer, et rester léger.
const AGENT =
  "SocieteTunisienneDeDecoration/1.0 (site vitrine, calcul de distance atelier; societetunisennededecoration.vercel.app)";

type Point = { lat: number; lon: number; label: string };

// Cache mémoire. Il ne survit pas à un redémarrage d'instance, et c'est très
// bien : il n'est là que pour absorber les saisies répétées.
const cache = new Map<string, { at: number; value: Point | null }>();
const JOUR = 24 * 60 * 60 * 1000;

// Garde-fou de débit : Nominatim demande au plus une requête par seconde.
let dernierAppel = 0;

async function geocode(q: string): Promise<Point | null> {
  const cle = q.toLowerCase().trim();
  const vu = cache.get(cle);
  if (vu && Date.now() - vu.at < JOUR) return vu.value;

  const attente = 1100 - (Date.now() - dernierAppel);
  if (attente > 0) await new Promise((r) => setTimeout(r, attente));
  dernierAppel = Date.now();

  const url = `${NOMINATIM}?q=${encodeURIComponent(q)}&format=jsonv2&limit=1&addressdetails=0`;
  const reponse = await fetch(url, {
    headers: { "User-Agent": AGENT, "Accept-Language": "fr" },
    signal: AbortSignal.timeout(6000),
  });
  if (!reponse.ok) throw new Error(`nominatim ${reponse.status}`);

  const data = (await reponse.json()) as { lat: string; lon: string; display_name: string }[];
  const premier = data[0];
  const point = premier
    ? {
        lat: Number(premier.lat),
        lon: Number(premier.lon),
        label: premier.display_name.split(",").slice(0, 3).join(",").trim(),
      }
    : null;

  cache.set(cle, { at: Date.now(), value: point });
  return point;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim();
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));

  // Coordonnées fournies directement : le visiteur s'est géolocalisé, il n'y
  // a rien à chercher.
  if (Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
    return NextResponse.json({
      ...trajet({ lat, lon }),
      depuis: "Votre position",
      // Renvoyées telles quelles : c'est avec elles que la carte trace la
      // ligne jusqu'à l'atelier.
      depart: { lat, lon },
      source: "position",
    });
  }

  if (q.length < 2) {
    return NextResponse.json({ erreur: "Indiquez une ville ou une adresse." }, { status: 400 });
  }

  // Ville connue : réponse immédiate, sans solliciter personne.
  const ville = chercheVille(q);
  if (ville) {
    return NextResponse.json({
      ...trajet(ville),
      depuis: ville.nom,
      depart: { lat: ville.lat, lon: ville.lon },
      source: "villes",
    });
  }

  try {
    const point = await geocode(q);
    if (!point) {
      return NextResponse.json(
        { erreur: "Adresse introuvable. Essayez seulement le nom de la ville." },
        { status: 404 }
      );
    }
    return NextResponse.json({
      ...trajet(point),
      depuis: point.label,
      depart: { lat: point.lat, lon: point.lon },
      source: "nominatim",
    });
  } catch {
    // Le géocodeur est injoignable : on le dit, sans faire semblant d'avoir
    // un résultat.
    return NextResponse.json(
      {
        erreur:
          "La recherche d'adresse est momentanément indisponible. Indiquez une grande ville, ou appelez-nous.",
      },
      { status: 503 }
    );
  }
}
