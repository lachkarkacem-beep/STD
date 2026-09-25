"use client";

import { forwardRef, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { pageNumbers } from "@/lib/pagination.mjs";

// react-pageflip exige que chaque page soit un élément capable de porter une
// ref : d'où ces enveloppes, et non des <div> directement dans le livre.
const Page = forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  function Page({ children, className = "" }, ref) {
    return (
      <div ref={ref} className={`h-full w-full overflow-hidden ${className}`}>
        {children}
      </div>
    );
  }
);

function Cover() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-brand-500 px-10 text-center text-white">
      <img
        src="/brand/logo.jpg"
        alt=""
        className="h-24 w-24 rounded-full border-4 border-white/90 object-cover shadow-lg"
      />
      <div className="h-px w-16 bg-white/40" />
      <h2 className="font-heading text-3xl font-medium leading-tight tracking-wide">
        Société Tunisienne
        <br />
        de Décoration
      </h2>
      <p className="max-w-[22ch] font-heading text-lg font-light italic leading-snug text-white/90">
        La pierre qui embellit vos jardins et vos maisons
      </p>
      <div className="h-px w-16 bg-white/40" />
      <span className="text-[11px] uppercase tracking-[0.3em] text-white/80">Catalogue</span>
    </div>
  );
}

function BackCover() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-brand-500 px-10 text-center text-white">
      <div className="h-px w-16 bg-white/40" />
      <p className="max-w-[26ch] font-heading text-xl font-light italic leading-snug">
        Un projet d&apos;aménagement ? Composez votre devis en ligne.
      </p>
      <span className="text-[11px] uppercase tracking-[0.3em] text-white/80">
        societetunisennededecoration.vercel.app
      </span>
      <div className="h-px w-16 bg-white/40" />
    </div>
  );
}

export default function Flipbook({ pages }: { pages: string[] }) {
  const bookRef = useRef<{ pageFlip: () => { flip: (i: number) => void; flipNext: () => void; flipPrev: () => void } } | null>(null);
  const [page, setPage] = useState(0);

  // Couverture + pages + quatrième de couverture.
  const total = pages.length + 2;
  const current = page + 1;

  const flipTo = (n: number) => bookRef.current?.pageFlip()?.flip(n - 1);

  const numberClass = (active: boolean) =>
    `h-9 min-w-9 rounded-full border px-3 text-sm transition-colors ${
      active
        ? "border-brand-500 bg-brand-500 text-white"
        : "border-line text-ink-soft hover:border-brand-300 hover:text-brand-600"
    }`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-center">
        {/* @ts-expect-error react-pageflip's types don't model children/ref cleanly */}
        <HTMLFlipBook
          ref={bookRef}
          width={420}
          height={594}
          size="stretch"
          minWidth={280}
          maxWidth={700}
          minHeight={396}
          maxHeight={990}
          showCover
          maxShadowOpacity={0.4}
          className="shadow-card"
          onFlip={(e: { data: number }) => setPage(e.data)}
        >
          <Page>
            <Cover />
          </Page>
          {pages.map((src) => (
            <Page key={src} className="bg-white">
              <img src={src} alt="" className="h-full w-full object-contain" />
            </Page>
          ))}
          <Page>
            <BackCover />
          </Page>
        </HTMLFlipBook>
      </div>

      <nav
        aria-label="Pages du catalogue photo"
        className="flex flex-wrap items-center justify-center gap-2 border-t border-line pt-6"
      >
        <button
          type="button"
          onClick={() => bookRef.current?.pageFlip()?.flipPrev()}
          disabled={current === 1}
          aria-label="Page précédente"
          className="flex h-9 items-center gap-1 rounded-full border border-line px-4 text-sm text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-line disabled:hover:text-ink-soft"
        >
          ‹ Précédent
        </button>

        {pageNumbers(current, total).map((n, i) =>
          n === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-sm text-ink-faint">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => flipTo(n)}
              aria-label={`Page ${n}`}
              aria-current={n === current ? "page" : undefined}
              className={numberClass(n === current)}
            >
              {n}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => bookRef.current?.pageFlip()?.flipNext()}
          disabled={current === total}
          aria-label="Page suivante"
          className="flex h-9 items-center gap-1 rounded-full border border-line px-4 text-sm text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-line disabled:hover:text-ink-soft"
        >
          Suivant ›
        </button>

        <span className="ml-3 text-xs text-ink-faint">
          Page {current} sur {total}
        </span>
      </nav>
    </div>
  );
}
