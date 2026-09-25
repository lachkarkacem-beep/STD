"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { ATELIER, orthodromie } from "@/lib/geo.mjs";
import { COMPANY } from "@/lib/company";

// Carte de l'atelier.
//
// Leaflet plutôt que Google Maps ou Mapbox : ni l'un ni l'autre ne fonctionne
// sans clé de compte facturable, et l'habillage y est bridé. Les tuiles
// satellite viennent d'Esri, libres d'usage avec attribution.
//
// Tout le chrome de Leaflet est réhabillé dans globals.css : sans cela, la
// bulle et les boutons de zoom trahiraient immédiatement le module ajouté.

const TUILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const ZOOM_ATELIER = 16;

export type Depart = {
  lat: number;
  lon: number;
  label: string;
  distance: string;
  duree: string | null;
};

export default function AtelierMap({ depart }: { depart?: Depart | null }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const carteRef = useRef<import("leaflet").Map | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  // Ce que le tracé a posé sur la carte, pour pouvoir tout retirer d'un coup
  // au calcul suivant.
  const tracéRef = useRef<import("leaflet").Layer[]>([]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let observer: ResizeObserver | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !mountRef.current) return;
      LRef.current = L;

      const carte = L.map(mount, {
        center: [ATELIER.lat, ATELIER.lon],
        zoom: ZOOM_ATELIER,
        // Le défilement de la page ne doit pas être capté par la carte quand
        // on la traverse : on zoome à la molette seulement après un clic.
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true,
      });
      carteRef.current = carte;

      L.tileLayer(TUILES, {
        maxZoom: 19,
        attribution: "Imagerie Esri, Maxar, Earthstar Geographics",
      }).addTo(carte);

      // Le marqueur est du HTML, pas une image : c'est ce qui permet d'y
      // mettre le logo, l'étiquette et la pointe, et de les styler comme le
      // reste du site.
      const icone = L.divIcon({
        className: "atelier-pin",
        html: `
          <span class="atelier-pin__logo">
            <img src="/brand/logo.jpg" alt="" />
          </span>
          <span class="atelier-pin__pointe"></span>
          <span class="atelier-pin__label">Atelier de ${COMPANY.city}</span>
        `,
        iconSize: [56, 56],
        iconAnchor: [28, 56],
        popupAnchor: [0, -58],
      });

      const marqueur = L.marker([ATELIER.lat, ATELIER.lon], {
        icon: icone,
        title: COMPANY.name,
        keyboard: true,
        alt: `${COMPANY.name}, ${COMPANY.city}`,
      }).addTo(carte);

      marqueur.bindPopup(
        `<p class="atelier-popup__titre">Bienvenue à l'atelier.</p>
         <p class="atelier-popup__corps">
           Nous sommes à ${COMPANY.city}, au Km 51 de la GP8, au rond-point Hriza.
           Passez voir les pièces, ou appelez avant de venir.
         </p>
         <a class="atelier-popup__tel" href="${COMPANY.phoneHref}">${COMPANY.phone}</a>`,
        { className: "atelier-popup", closeButton: true, maxWidth: 280 }
      );

      // Ouverte d'emblée : c'est l'accueil, autant qu'il soit dit tout de suite.
      marqueur.openPopup();

      // La carte est montée dans un bloc qui vient d'apparaître : ses tuiles
      // se calculent sur une taille parfois encore nulle.
      observer = new ResizeObserver(() => carte.invalidateSize());
      observer.observe(mount);
    })();

    return () => {
      disposed = true;
      observer?.disconnect();
      carteRef.current?.remove();
      carteRef.current = null;
    };
  }, []);

  // Tracé du trajet. Se rejoue à chaque nouveau calcul de distance.
  useEffect(() => {
    const L = LRef.current;
    const carte = carteRef.current;
    if (!L || !carte) return;

    for (const couche of tracéRef.current) carte.removeLayer(couche);
    tracéRef.current = [];

    if (!depart) {
      carte.flyTo([ATELIER.lat, ATELIER.lon], ZOOM_ATELIER, { duration: 0.8 });
      return;
    }

    const couches: import("leaflet").Layer[] = [];

    // Le trait est en pointillés, et non plein : il dit une distance directe,
    // pas un itinéraire routier. Un trait plein promettrait un tracé de route
    // que nous n'avons pas.
    const ligne = L.polyline(orthodromie(depart, ATELIER) as [number, number][], {
      color: "#c73e1d",
      weight: 3,
      opacity: 0.9,
      dashArray: "8 9",
      lineCap: "round",
    }).addTo(carte);
    couches.push(ligne);

    const pinDepart = L.marker([depart.lat, depart.lon], {
      icon: L.divIcon({
        className: "depart-pin",
        html: `
          <span class="depart-pin__point"></span>
          <span class="depart-pin__label">${depart.label}</span>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
      title: depart.label,
      alt: `Votre point de départ : ${depart.label}`,
    }).addTo(carte);
    couches.push(pinDepart);

    // L'étiquette de distance au milieu du trait, comme sur une carte
    // routière. Sans marqueur porteur, Leaflet n'a pas d'objet à positionner.
    const points = orthodromie(depart, ATELIER);
    const milieu = points[Math.floor(points.length / 2)];
    const etiquette = L.marker(milieu as [number, number], {
      icon: L.divIcon({
        className: "trajet-chip",
        html: `<span>${depart.distance}${depart.duree ? ` · ${depart.duree}` : " à vol d'oiseau"}</span>`,
        iconSize: [0, 0],
      }),
      interactive: false,
      keyboard: false,
    }).addTo(carte);
    couches.push(etiquette);

    tracéRef.current = couches;

    // Les deux extrémités doivent tenir à l'écran, avec assez de marge pour
    // que les étiquettes ne débordent pas du cadre.
    carte.flyToBounds(
      L.latLngBounds([depart.lat, depart.lon], [ATELIER.lat, ATELIER.lon]),
      { padding: [60, 60], maxZoom: 14, duration: 1 }
    );
  }, [depart]);

  return (
    <div
      ref={mountRef}
      role="application"
      aria-label={`Carte satellite : ${COMPANY.name}, ${COMPANY.address}`}
      className="h-[320px] w-full sm:h-[420px]"
    />
  );
}
