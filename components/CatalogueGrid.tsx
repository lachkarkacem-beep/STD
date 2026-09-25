"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ProductThumb from "@/components/ProductThumb";
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
          <Link key={p.id} href={`/catalogue/${p.id}`} className="card flex flex-col overflow-hidden p-0">
            {has3D(p) ? (
              <ProductThumb src={glbSrc(p)} title={p.name} />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-surface-soft text-sm text-ink-faint">
                Photo à venir
              </div>
            )}
            <div className="flex flex-col gap-1 border-t border-line p-5">
              <span className="text-xs font-medium text-brand-600">Réf. {p.id}</span>
              <span className="text-sm font-medium text-ink">{p.name}</span>
              <span className="text-xs text-ink-faint">{dimLine(p)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
