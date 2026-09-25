"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addToCart, cartCount, readCart, readFinish, writeFinish } from "@/lib/cart";
import { FINISHES, DEFAULT_FINISH } from "@/lib/finishes";
import { PLANT_SPECIES } from "@/lib/plants";
import Viewer3D from "@/components/Viewer3D";
import { CATEGORY_TEASERS } from "@/lib/marketing";
import type { Product } from "@/lib/catalog";

export default function ProductView({
  product,
  glbSrc,
  has3D,
  plantable,
}: {
  product: Product;
  glbSrc: string;
  has3D: boolean;
  plantable: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [finish, setFinish] = useState(DEFAULT_FINISH);
  const [species, setSpecies] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [feedback, setFeedback] = useState("");
  const [cartTotal, setCartTotal] = useState(0);
  const teaser = CATEGORY_TEASERS[product.category];
  const exportRef = useRef<((withPlants: boolean) => Promise<Blob>) | null>(null);

  const onExportReady = useCallback((fn: (withPlants: boolean) => Promise<Blob>) => {
    exportRef.current = fn;
  }, []);

  async function downloadGlb(withPlants: boolean) {
    if (!exportRef.current) return;
    const blob = await exportRef.current(withPlants);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${product.id}${withPlants ? "-plante" : ""}.glb`;
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    const f = readFinish(DEFAULT_FINISH);
    const valid = FINISHES.some((x) => x.id === f) ? f : DEFAULT_FINISH;
    setFinish(valid);
    setCartTotal(cartCount(readCart()));
    setReady(true);
  }, []);

  function selectFinish(id: string) {
    setFinish(id);
    writeFinish(id);
  }

  function onAddToCart() {
    const cart = addToCart(product.id, finish, qty);
    const label = FINISHES.find((f) => f.id === finish)?.label ?? "";
    setFeedback(`${qty} × ${product.id}${label ? " — " + label.toLowerCase() : ""} ajouté au devis.`);
    setCartTotal(cartCount(cart));
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.5fr_1fr]">
      <div>
        <div className="relative h-[64vh] max-h-[600px] overflow-hidden rounded-xl border border-leaf-200 bg-gradient-to-b from-leaf-50 to-leaf-100">
          {ready && has3D ? (
            <Viewer3D src={glbSrc} finish={finish} species={species} onExportReady={onExportReady} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-ink-faint">
              {has3D ? "Chargement de la vue 3D…" : "Vue 3D bientôt disponible"}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 px-2 py-4 text-xs text-ink-faint">
          <span>Glissez pour tourner l&apos;objet · molette pour zoomer</span>
          {has3D && (
            <span className="ml-auto flex gap-3">
              <button
                type="button"
                onClick={() => downloadGlb(false)}
                className="text-brand-600 hover:text-brand-700"
              >
                Télécharger le modèle 3D
              </button>
              {species && (
                <button
                  type="button"
                  onClick={() => downloadGlb(true)}
                  className="text-brand-600 hover:text-brand-700"
                >
                  …avec les plantes
                </button>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <span className="text-xs uppercase tracking-widest text-brand-600">
            Réf. {product.id} · {product.category}
          </span>
          <h1 className="font-heading text-4xl font-normal leading-tight text-ink">
            {product.name}
          </h1>
          {teaser && <p className="text-base leading-relaxed text-ink">{teaser}</p>}
          <p className="text-sm leading-relaxed text-ink-soft">{product.description}</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-baseline gap-3">
            <span className="text-xs uppercase tracking-widest text-ink-faint">Coloris</span>
            <span className="text-sm text-ink-soft">
              {FINISHES.find((f) => f.id === finish)?.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {FINISHES.map((f) => {
              const active = f.id === finish;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => selectFinish(f.id)}
                  className={`flex items-center gap-2 rounded-md border py-1.5 pl-2 pr-3 text-sm ${
                    active ? "border-brand-500 bg-brand-50 font-medium" : "border-line"
                  }`}
                >
                  <span
                    className="h-5 w-5 rounded-full border border-line"
                    style={{ background: f.swatch }}
                  />
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {plantable && (
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline gap-3">
              <span className="text-xs uppercase tracking-widest text-ink-faint">Plantation</span>
              <span className="text-sm text-ink-soft">
                {species ? PLANT_SPECIES.find((s) => s.id === species)?.label : "Bac nu"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSpecies(null)}
                className={`rounded-full border px-4 py-1.5 text-sm ${
                  species === null
                    ? "border-grass-500 bg-leaf-50 font-medium text-grass-700"
                    : "border-line text-ink-soft hover:border-leaf-300"
                }`}
              >
                Sans
              </button>
              {PLANT_SPECIES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSpecies(s.id)}
                  className={`rounded-full border px-4 py-1.5 text-sm ${
                    species === s.id
                      ? "border-grass-500 bg-leaf-50 font-medium text-grass-700"
                      : "border-line text-ink-soft hover:border-leaf-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-ink-faint">
              Les végétaux sont une suggestion d&apos;aménagement : ils ne sont pas vendus avec la
              pièce et ne suivent pas le choix de coloris.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <label htmlFor="qty" className="text-xs uppercase tracking-widest text-ink-faint">
              Quantité
            </label>
            <input
              id="qty"
              type="number"
              min={1}
              step={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="input w-20"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onAddToCart} className="btn-primary">
              Ajouter au devis
            </button>
            <a href="/devis" className="btn-secondary">
              Voir mon devis ({cartTotal})
            </a>
          </div>
          {feedback && <span className="text-sm text-grass-700">{feedback}</span>}
        </div>

        {product.notes && (
          <p className="rounded-lg border border-line bg-surface-soft p-4 text-xs leading-relaxed text-ink-soft">
            {product.notes}
          </p>
        )}
      </div>
    </div>
  );
}
