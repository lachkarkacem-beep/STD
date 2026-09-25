"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { ATELIER } from "@/lib/geo.mjs";
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

export default function AtelierMap() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let carte: import("leaflet").Map | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !mountRef.current) return;

      carte = L.map(mount, {
        center: [ATELIER.lat, ATELIER.lon],
        zoom: 16,
        // Le défilement de la page ne doit pas être capté par la carte quand
        // on la traverse : on zoome à la molette seulement après un clic.
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true,
      });

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
      const observer = new ResizeObserver(() => carte?.invalidateSize());
      observer.observe(mount);

      return () => observer.disconnect();
    })();

    return () => {
      disposed = true;
      carte?.remove();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      role="application"
      aria-label={`Carte satellite : ${COMPANY.name}, ${COMPANY.address}`}
      className="h-[320px] w-full sm:h-[420px]"
    />
  );
}
