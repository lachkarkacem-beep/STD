"use client";

import { useEffect, useState } from "react";
import Viewer3D from "@/components/Viewer3D";
import { FINISHES, DEFAULT_FINISH } from "@/lib/finishes";

// Vue agrandie d'une pièce, ouverte depuis une carte du catalogue : on tourne
// l'objet et on zoome à la molette sans quitter la grille.
// `ref` étant réservé par React, la référence produit passe sous un autre nom.
export default function ZoomViewer({
  productRef,
  name,
  src,
  onClose,
}: {
  productRef: string;
  name: string;
  src: string;
  onClose: () => void;
}) {
  const [finish, setFinish] = useState(DEFAULT_FINISH);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Vue agrandie — ${name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 border-b border-line px-5 py-3">
          <div className="flex flex-col">
            <span className="text-xs text-grass-600">Réf. {productRef}</span>
            <span className="font-heading text-xl font-normal text-ink">{name}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="ml-auto rounded-full border border-line px-3 py-1 text-sm text-ink-soft hover:border-brand-300 hover:text-brand-600"
          >
            Fermer
          </button>
        </div>

        <div className="flex-1 bg-gradient-to-b from-leaf-50 to-leaf-100">
          <Viewer3D src={src} finish={finish} autoRotate={false} />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
          {FINISHES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFinish(f.id)}
              title={f.label}
              aria-label={f.label}
              className={`h-7 w-7 rounded-full border-2 ${
                finish === f.id ? "border-brand-500" : "border-line"
              }`}
              style={{ background: f.swatch }}
            />
          ))}
          <span className="ml-auto text-xs text-ink-faint">
            Molette pour zoomer · glissez pour tourner
          </span>
          <a href={`/catalogue/${productRef}`} className="btn-secondary text-xs">
            Voir la fiche
          </a>
        </div>
      </div>
    </div>
  );
}
