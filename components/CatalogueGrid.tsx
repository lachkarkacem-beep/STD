"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ProductThumb from "@/components/ProductThumb";
import ZoomViewer from "@/components/ZoomViewer";
import { dimLine, has3D, glbSrc, type Category, type Product } from "@/lib/catalog";

const PER_PAGE = 12;

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
  const [page, setPage] = useState(1);
  // Sens du feuilletage : l'animation d'entrée part du bord vers lequel on
  // tourne, comme une page qu'on rabat.
  const [direction, setDirection] = useState<"avant" | "arriere">("avant");
  const topRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => (cat ? products.filter((p) => p.category === cat) : products),
    [cat, products]
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const shown = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  // Changer de famille ramène à la première page : rester en page 4 d'une
  // famille qui n'en compte que deux n'aurait aucun sens.
  useEffect(() => {
    setPage(1);
    setDirection("avant");
  }, [cat]);

  function goTo(next: number) {
    if (next === current || next < 1 || next > pageCount) return;
    setDirection(next > current ? "avant" : "arriere");
    setPage(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div ref={topRef}>
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

      <div
        key={`${cat ?? "tout"}-${current}`}
        className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 ${
          direction === "avant" ? "page-tourne-avant" : "page-tourne-arriere"
        }`}
      >
        {shown.map((p) => (
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

      {pageCount > 1 && (
        <nav
          aria-label="Pages du catalogue"
          className="mt-10 flex flex-wrap items-center justify-center gap-2 border-t border-line pt-8"
        >
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            disabled={current === 1}
            aria-label="Page précédente"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-line disabled:hover:text-ink-soft"
          >
            ‹
          </button>

          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => goTo(n)}
              aria-label={`Page ${n}`}
              aria-current={n === current ? "page" : undefined}
              className={`h-9 min-w-9 rounded-full border px-3 text-sm transition-colors ${
                n === current
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-line text-ink-soft hover:border-brand-300 hover:text-brand-600"
              }`}
            >
              {n}
            </button>
          ))}

          <button
            type="button"
            onClick={() => goTo(current + 1)}
            disabled={current === pageCount}
            aria-label="Page suivante"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-line disabled:hover:text-ink-soft"
          >
            ›
          </button>

          <span className="ml-3 text-xs text-ink-faint">
            Page {current} sur {pageCount} · {filtered.length} références
          </span>
        </nav>
      )}

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
