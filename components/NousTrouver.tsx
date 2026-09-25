"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ATELIER } from "@/lib/geo.mjs";
import { COMPANY } from "@/lib/company";

// La carte embarque Leaflet et ses tuiles : elle ne se charge qu'à l'approche
// du regard, en bas de page, plutôt que de peser sur l'arrivée sur le site.
const AtelierMap = dynamic(() => import("@/components/AtelierMap"), { ssr: false });

type Resultat = {
  distance: string;
  /** Absente depuis l'étranger : on n'invente pas un temps de voiture. */
  duree: string | null;
  routier: boolean;
  depuis: string;
  volOiseau: number;
};

const ITINERAIRE = `https://www.google.com/maps/dir/?api=1&destination=${ATELIER.lat},${ATELIER.lon}`;

export default function NousTrouver() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [etat, setEtat] = useState<"repos" | "calcul">("repos");
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  async function demander(params: string) {
    setEtat("calcul");
    setErreur(null);
    setResultat(null);
    try {
      const r = await fetch(`/api/distance?${params}`);
      const data = await r.json();
      if (!r.ok) {
        setErreur(data.erreur ?? "Le calcul n'a pas abouti.");
      } else {
        setResultat(data);
      }
    } catch {
      // Réseau coupé, requête bloquée : on ne laisse pas l'interface muette.
      setErreur("Le calcul n'a pas abouti. Réessayez, ou appelez-nous.");
    } finally {
      setEtat("repos");
    }
  }

  function calculer(e: React.FormEvent) {
    e.preventDefault();
    if (saisie.trim().length < 2) {
      setErreur("Indiquez au moins le nom de votre ville.");
      return;
    }
    void demander(`q=${encodeURIComponent(saisie.trim())}`);
  }

  function localiser() {
    if (!navigator.geolocation) {
      setErreur("Votre navigateur ne sait pas vous localiser. Indiquez votre ville.");
      return;
    }
    setEtat("calcul");
    setErreur(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => void demander(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
      () => {
        // Refus, ou position indisponible : ce n'est pas une panne, il y a
        // l'autre chemin.
        setEtat("repos");
        setErreur("Position non communiquée. Indiquez votre ville dans le champ.");
      },
      { timeout: 8000, maximumAge: 300000 }
    );
  }

  return (
    <section ref={sectionRef} className="mx-auto mb-20 max-w-6xl px-6">
      <span className="mb-4 block text-xs font-semibold uppercase tracking-widest text-brand-600">
        Nous trouver
      </span>
      <h2 className="text-2xl font-normal text-ink sm:text-3xl">L&apos;atelier</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
        L&apos;atelier se trouve à {COMPANY.city}, au Km 51 de la GP8, au rond-point Hriza. Les
        pièces y sont moulées et stockées : on peut les voir en vrai avant de commander.
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-sable-200 bg-surface shadow-card">
        {visible ? (
          <AtelierMap />
        ) : (
          <div className="flex h-[320px] w-full items-center justify-center bg-sable-100 text-sm text-ink-faint sm:h-[420px]">
            Chargement de la carte…
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 border-t border-sable-200 p-6 sm:p-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-normal text-ink">Adresse</h3>
            <address className="not-italic text-sm leading-relaxed text-ink-soft">
              {COMPANY.address}
            </address>
            <p className="text-sm text-ink-soft">
              <a href={COMPANY.phoneHref} className="text-brand-600 hover:text-grass-700">
                {COMPANY.phone}
              </a>
            </p>
            <div>
              <a
                href={ITINERAIRE}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Ouvrir l&apos;itinéraire
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:border-l lg:border-sable-200 lg:pl-8">
            <h3 className="text-lg font-normal text-ink">Vous êtes loin ?</h3>
            <p className="text-sm leading-relaxed text-ink-soft">
              Indiquez votre adresse pour connaître la distance.
            </p>

            <form onSubmit={calculer} className="flex flex-col gap-3">
              <label htmlFor="depart" className="sr-only">
                D&apos;où venez-vous ?
              </label>
              <input
                id="depart"
                type="text"
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                placeholder="Votre ville, ou une adresse"
                autoComplete="address-level2"
                className="input"
              />
              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={etat === "calcul"} className="btn-primary disabled:opacity-50">
                  {etat === "calcul" ? "Calcul en cours…" : "Calculer la distance"}
                </button>
                <button
                  type="button"
                  onClick={localiser}
                  disabled={etat === "calcul"}
                  className="text-sm text-grass-700 underline-offset-4 hover:underline disabled:opacity-50"
                >
                  Me localiser
                </button>
              </div>
            </form>

            {/* Le résultat est annoncé aux lecteurs d'écran : il apparaît
                après coup, sans que le focus bouge. */}
            <div aria-live="polite" className="min-h-[3.5rem]">
              {erreur && <p className="text-sm text-brand-600">{erreur}</p>}
              {resultat && (
                <div className="rounded-lg border border-sable-200 bg-sable-50 p-4">
                  {resultat.routier ? (
                    <>
                      <p className="text-sm text-ink">
                        Depuis <span className="font-medium">{resultat.depuis}</span> :{" "}
                        <span className="font-medium text-brand-600">{resultat.distance}</span> par
                        la route, <span className="font-medium">{resultat.duree}</span> en voiture.
                      </p>
                      {/* On ne fait pas passer une estimation pour un calcul
                          d'itinéraire : le lien ci-dessus, lui, en donne un vrai. */}
                      <p className="mt-1 text-xs text-ink-faint">
                        Estimation d&apos;après la distance à vol d&apos;oiseau (
                        {resultat.volOiseau < 1
                          ? "moins d'un kilomètre"
                          : `${Math.round(resultat.volOiseau)} km`}
                        ). Le trajet réel dépend de la route prise.
                      </p>
                    </>
                  ) : (
                    // Depuis l'étranger, pas de temps de voiture : la mer est
                    // entre les deux, et un chiffre inventé ne rendrait service
                    // à personne.
                    <>
                      <p className="text-sm text-ink">
                        Depuis <span className="font-medium">{resultat.depuis}</span> :{" "}
                        <span className="font-medium text-brand-600">{resultat.distance}</span> à
                        vol d&apos;oiseau.
                      </p>
                      <p className="mt-1 text-xs text-ink-faint">
                        Vous êtes hors de Tunisie : la route passe par un bateau, nous ne
                        l&apos;estimons pas.{" "}
                        <a href={COMPANY.phoneHref} className="text-brand-600 hover:text-grass-700">
                          Appelez-nous
                        </a>{" "}
                        pour l&apos;expédition.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
