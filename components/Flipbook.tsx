"use client";

import { forwardRef, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { pageNumbers } from "@/lib/pagination.mjs";
import { COMPANY } from "@/lib/company";
import { FLIPBOOK_HINT } from "@/lib/marketing";

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
      {/* Le logo porte lui-même un cercle terracotta : posé à même le fond
          rouge, il disparaîtrait. Il lui faut son propre plateau blanc. */}
      <span className="rounded-full bg-white p-2 shadow-lg">
        <img src="/brand/logo.jpg" alt="" className="h-20 w-20 rounded-full object-cover" />
      </span>
      <div className="h-px w-16 bg-white/40" />
      <h2 className="font-heading text-3xl font-medium leading-tight tracking-wide">
        Société Tunisienne
        <br />
        de Décoration
      </h2>
      <p className="max-w-[24ch] font-heading text-lg font-light leading-snug text-white/90">
        {COMPANY.tagline}
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
      <p className="max-w-[26ch] font-heading text-2xl font-light leading-snug">
        Dites-nous le projet.
      </p>
      <p className="max-w-[30ch] text-sm leading-relaxed text-white/85">
        Composez votre devis en ligne, ou passez à l&apos;atelier.
      </p>
      <div className="flex flex-col gap-1 text-[11px] uppercase tracking-[0.2em] text-white/80">
        <span>{COMPANY.phone}</span>
        <span>{COMPANY.city}</span>
      </div>
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

  // Un anneau de focus visible au clavier, identique sur tous les contrôles.
  const focus =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-sable-50";

  // Page courante en terracotta ; le survol passe au vert, l'accent secondaire
  // de la charte. Les chiffres sont en Cormorant, comme ceux de l'accueil, et
  // tabulaires pour que la barre ne tressaute pas d'une page à l'autre.
  const numberClass = (active: boolean) =>
    `h-9 min-w-9 rounded-full border px-3 font-heading text-base tabular-nums transition-colors ${focus} ${
      active
        ? "border-brand-500 bg-brand-500 text-white"
        : "border-line text-ink-soft hover:border-grass-500 hover:text-grass-700"
    }`;

  const arrowClass =
    `flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-sm text-ink-soft transition-colors ` +
    `hover:border-grass-500 hover:text-grass-700 ${focus} ` +
    `disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-line disabled:hover:text-ink-soft`;

  return (
    <div className="flex flex-col gap-6">
      {/* Le livre est posé sur un fond de pierre plutôt que sur le blanc de la
          page : il s'y détache, et l'ombre portée a quelque chose sur quoi
          tomber. Même matière que les encarts de l'accueil. */}
      <div className="flex justify-center rounded-xl border border-sable-200 bg-sable-50 px-4 py-8 sm:px-10 sm:py-12">
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
        aria-label="Pages du catalogue papier"
        className="flex flex-wrap items-center justify-center gap-2 border-t border-line pt-6"
      >
        <button
          type="button"
          onClick={() => bookRef.current?.pageFlip()?.flipPrev()}
          disabled={current === 1}
          aria-label="Page précédente"
          className={arrowClass}
        >
          {/* Le chevron est décoratif : le libellé porte déjà le sens, et sur
              mobile c'est lui qui disparaît, pas l'inverse. */}
          <span aria-hidden>‹</span>
          <span className="hidden sm:inline">Précédent</span>
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
          className={arrowClass}
        >
          <span className="hidden sm:inline">Suivant</span>
          <span aria-hidden>›</span>
        </button>
      </nav>

      {/* Le compteur et le mode d'emploi sous la barre, et non dedans : à
          l'étroit sur un téléphone, ils la faisaient passer à la ligne. */}
      <div className="flex flex-col items-center gap-1 text-xs text-ink-faint">
        <span className="tabular-nums">
          Page {current} sur {total}
        </span>
        <span>{FLIPBOOK_HINT}</span>
      </div>
    </div>
  );
}
