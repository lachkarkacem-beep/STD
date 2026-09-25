"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ProductThumb from "@/components/ProductThumb";
import ZoomViewer from "@/components/ZoomViewer";
import { dimLine, has3D, glbSrc, type Category, type Product } from "@/lib/catalog";

export default function CatalogueGrid({
  products,
  categories,
  initialCat,
}: {
  products: Product[];
  categories: Category[];
  initialCat: string | null;
}) {
  const [cat, setCat] = useState<string | null>(initialCat);
  const [zoomed, setZoomed] = useState<Product | null>(null);

  const filtered = useMemo(
    () => (cat ? products.filter((p) => p.category === cat) : products),
    [cat, products]
  );

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCat(null)}
          className={`rounded-full border px-4 py-1.5 text-sm ${
            cat === null
              ? "border-brand-500 bg-brand-500 text-white"
              : "border-line text-ink-soft hover:border-brand-300"
          }`}
        >
          Tout
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              cat === c.id
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-line text-ink-soft hover:border-brand-300"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <div key={p.id} className="card group relative flex flex-col overflow-hidden p-0">
            {has3D(p) ? (
              <>
                <ProductThumb src={glbSrc(p)} title={p.name} />
                <button
                  type="button"
                  onClick={() => setZoomed(p)}
                  aria-label={`Agrandir ${p.name}`}
                  className="absolute right-3 top-3 rounded-full border border-line bg-surface/90 px-3 py-1 text-xs text-ink-soft shadow-card transition-colors hover:border-brand-300 hover:text-brand-600"
                >
                  Agrandir
                </button>
              </>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-surface-soft text-sm text-ink-faint">
                Photo à venir
              </div>
            )}
            <Link href={`/catalogue/${p.id}`} className="flex flex-col gap-1 border-t border-line p-5">
              <span className="text-xs font-medium text-brand-600">Réf. {p.id}</span>
              <span className="text-sm font-medium text-ink">{p.name}</span>
              <span className="text-xs text-ink-faint">{dimLine(p)}</span>
            </Link>
          </div>
        ))}
      </div>

      {zoomed && (
        <ZoomViewer
          productRef={zoomed.id}
          name={zoomed.name}
          src={glbSrc(zoomed)}
          onClose={() => setZoomed(null)}
        />
      )}
    </div>
  );
}
