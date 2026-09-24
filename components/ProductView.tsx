"use client";

import { useEffect, useRef, useState } from "react";
import { addToCart, cartCount, readCart, readFinish, writeFinish } from "@/lib/cart";
import { FINISHES, DEFAULT_FINISH } from "@/lib/finishes";
import type { Product } from "@/lib/catalog";

export default function ProductView({
  product,
  viewerBaseSrc,
  has3D,
}: {
  product: Product;
  viewerBaseSrc: string;
  has3D: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [finish, setFinish] = useState(DEFAULT_FINISH);
  const [qty, setQty] = useState(1);
  const [feedback, setFeedback] = useState("");
  const [cartTotal, setCartTotal] = useState(0);
  const viewerSrcRef = useRef<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const f = readFinish(DEFAULT_FINISH);
    const valid = FINISHES.some((x) => x.id === f) ? f : DEFAULT_FINISH;
    setFinish(valid);
    setCartTotal(cartCount(readCart()));
    setReady(true);
  }, []);

  if (viewerSrcRef.current === null && ready) {
    const sep = viewerBaseSrc.includes("?") ? "&" : "?";
    viewerSrcRef.current = `${viewerBaseSrc}${sep}finish=${finish}`;
  }

  function selectFinish(id: string) {
    setFinish(id);
    writeFinish(id);
    iframeRef.current?.contentWindow?.postMessage({ type: "set-finish", finish: id }, "*");
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
        <div className="relative overflow-hidden rounded-lg border border-line bg-[#1b1d2a]">
          {ready && has3D && viewerSrcRef.current ? (
            <iframe
              ref={iframeRef}
              src={viewerSrcRef.current}
              title={`Vue 3D — ${product.id} ${product.name}`}
              className="block h-[64vh] max-h-[600px] w-full border-0"
            />
          ) : (
            <div className="flex h-[64vh] max-h-[600px] w-full flex-col justify-end gap-3 bg-ink p-8">
              <span className="font-heading text-lg font-medium text-white">
                {has3D ? "Chargement de la vue 3D…" : "Vue 3D bientôt disponible"}
              </span>
              <span className="max-w-md text-sm text-white/70">
                {has3D
                  ? ""
                  : "La photographie du produit s'affiche ici dès qu'elle est fournie."}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-6 px-2 py-4 text-xs text-ink-faint">
          <span>Glisser pour orienter · molette pour zoomer</span>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <span className="text-xs uppercase tracking-widest text-brand-600">
            Réf. {product.id} · {product.category}
          </span>
          <h1 className="font-heading text-3xl font-medium leading-tight text-ink">{product.name}</h1>
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
      </div>
    </div>
  );
}
