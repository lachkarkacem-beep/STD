// Distance et temps de trajet jusqu'à l'atelier.
//
// Aucun service de routage n'est appelé : ceux qui sont gratuits sont des
// serveurs de démonstration, qu'on n'a pas le droit d'exploiter en production,
// et les autres réclament une clé payante. On calcule donc l'orthodromie —
// exacte, elle — puis on l'ajuste par un coefficient de détour routier et une
// vitesse moyenne. Le résultat est une ESTIMATION, et l'interface le dit.
//
// Tout est ici, en JavaScript simple, pour que le harnais vérifie exactement
// ce qui tourne en production.

/** L'atelier, relevé sur la parcelle. */
export const ATELIER = { lat: 37.179625, lon: 9.9591517 };

const R_TERRE = 6371.0088; // rayon moyen, en km

const rad = (d) => (d * Math.PI) / 180;

/**
 * Orthodromie entre deux points, en kilomètres. C'est la seule valeur
 * réellement exacte de ce module.
 */
export function haversine(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_TERRE * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Coefficient de détour : une route ne va jamais tout droit. Il est plus fort
 * sur les courts trajets, où l'on suit le dessin des rues, et se rapproche de
 * 1,2 sur les longs parcours qui empruntent les grands axes.
 */
export function detour(volOiseau) {
  if (volOiseau < 5) return 1.45;
  if (volOiseau < 25) return 1.35;
  if (volOiseau < 100) return 1.28;
  return 1.2;
}

/** Distance routière estimée, en kilomètres. */
export function routeKm(volOiseau) {
  return volOiseau * detour(volOiseau);
}

/**
 * Vitesse moyenne retenue, en km/h — porte-à-porte, arrêts compris. En ville
 * on avance peu ; sur la GP8 et l'autoroute, nettement mieux.
 *
 * La courbe est continue, et non en paliers. Par paliers, franchir un seuil
 * faisait gagner du temps : 39 km prenaient 45 min et 41 km seulement 34. Le
 * harnais l'a relevé — deux villes voisines se seraient contredites à
 * l'écran.
 */
const V_MIN = 28; // sortie de ville, ronds-points
const V_MAX = 95; // autoroute, à l'asymptote
const V_DEMI = 45; // distance à laquelle on a fait la moitié du chemin vers V_MAX

export function vitesse(km) {
  return V_MIN + (V_MAX - V_MIN) * (km / (km + V_DEMI));
}

/** Durée estimée, en minutes. */
export function minutes(km) {
  return (km / vitesse(km)) * 60;
}

/** « 1,2 km », « 14 km », « 240 km » — jamais plus de précision qu'on n'en a. */
export function formatKm(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

/** « 25 min », « 1 h 10 ». Jamais « 0 min » : en deçà, on dit « moins d'une minute ». */
export function formatDuree(min) {
  const m = Math.round(min);
  if (m < 1) return "moins d'une minute";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const reste = m % 60;
  return reste === 0 ? `${h} h` : `${h} h ${String(reste).padStart(2, "0")}`;
}

/**
 * Emprise de la Tunisie continentale, Djerba comprise.
 * @param {{lat: number, lon: number}} p
 */
export function enTunisie(p) {
  return p.lat >= 30.2 && p.lat <= 37.6 && p.lon >= 7.5 && p.lon <= 11.65;
}

/**
 * Le trajet depuis un point.
 *
 * Depuis l'étranger, on ne donne QUE le vol d'oiseau. Annoncer « 940 km par la
 * route, 10 h en voiture » depuis Marseille serait faux : il y a la
 * Méditerranée entre les deux, et le trajet passe par un bateau. Mieux vaut
 * ne pas répondre à une question qu'y répondre de travers.
 *
 * @param {{lat: number, lon: number}} depart
 */
export function trajet(depart) {
  const vol = haversine(depart, ATELIER);

  if (!enTunisie(depart)) {
    return {
      volOiseau: vol,
      routier: false,
      km: null,
      minutes: null,
      distance: formatKm(vol),
      duree: null,
    };
  }

  const km = routeKm(vol);
  const min = minutes(km);
  return {
    volOiseau: vol,
    routier: true,
    km,
    minutes: min,
    distance: formatKm(km),
    duree: formatDuree(min),
  };
}

/**
 * Villes tunisiennes les plus courantes, pour répondre sans appeler personne.
 * C'est aussi le filet de secours si le géocodeur est injoignable.
 * Coordonnées des centres-villes.
 */
export const VILLES = [
  { nom: "Bizerte", lat: 37.2744, lon: 9.8739 },
  { nom: "Menzel Bourguiba", lat: 37.1536, lon: 9.7856 },
  { nom: "Mateur", lat: 37.0403, lon: 9.6636 },
  { nom: "Ras Jebel", lat: 37.2153, lon: 10.1186 },
  { nom: "Tunis", lat: 36.8065, lon: 10.1815 },
  { nom: "Ariana", lat: 36.8625, lon: 10.1956 },
  { nom: "La Marsa", lat: 36.8783, lon: 10.3247 },
  { nom: "Ben Arous", lat: 36.7533, lon: 10.2189 },
  { nom: "Manouba", lat: 36.8081, lon: 10.0972 },
  { nom: "Nabeul", lat: 36.4561, lon: 10.7376 },
  { nom: "Hammamet", lat: 36.4, lon: 10.6167 },
  { nom: "Zaghouan", lat: 36.4028, lon: 10.1425 },
  { nom: "Béja", lat: 36.7256, lon: 9.1817 },
  { nom: "Jendouba", lat: 36.5011, lon: 8.7803 },
  { nom: "Le Kef", lat: 36.1742, lon: 8.7049 },
  { nom: "Siliana", lat: 36.0819, lon: 9.3708 },
  { nom: "Sousse", lat: 35.8256, lon: 10.6369 },
  { nom: "Monastir", lat: 35.7776, lon: 10.8262 },
  { nom: "Mahdia", lat: 35.5047, lon: 11.0622 },
  { nom: "Kairouan", lat: 35.6781, lon: 10.0963 },
  { nom: "Sfax", lat: 34.7406, lon: 10.7603 },
  { nom: "Gabès", lat: 33.8815, lon: 10.0982 },
  { nom: "Médenine", lat: 33.3547, lon: 10.5055 },
  { nom: "Tataouine", lat: 32.9297, lon: 10.4518 },
  { nom: "Djerba", lat: 33.8076, lon: 10.8451 },
  { nom: "Gafsa", lat: 34.425, lon: 8.7842 },
  { nom: "Tozeur", lat: 33.9197, lon: 8.1335 },
  { nom: "Kébili", lat: 33.7044, lon: 8.969 },
  { nom: "Kasserine", lat: 35.1676, lon: 8.8365 },
  { nom: "Sidi Bouzid", lat: 35.0382, lon: 9.4849 },
];

/** Enlève accents, ponctuation et articles : « L'Ariana » trouve « Ariana ». */
export function normalise(texte) {
  return (texte ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Cherche une ville connue dans ce que le visiteur a tapé. On accepte une
 * adresse complète : « 12 rue de Carthage, Sousse » doit trouver Sousse.
 *
 * On retient la correspondance la plus longue — sans quoi « Menzel Bourguiba »
 * serait capté par une entrée plus courte qui y figure.
 */
export function chercheVille(saisie) {
  const q = normalise(saisie);
  if (!q) return null;
  let trouve = null;
  for (const ville of VILLES) {
    const n = normalise(ville.nom);
    const mot = new RegExp(`(^| )${n}( |$)`);
    if (!mot.test(q)) continue;
    if (!trouve || n.length > normalise(trouve.nom).length) trouve = ville;
  }
  return trouve;
}
