"use client";

import { forwardRef } from "react";
import HTMLFlipBook from "react-pageflip";

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
  return (
    <div className="flex justify-center">
      {/* @ts-expect-error react-pageflip's types don't model children/ref cleanly */}
      <HTMLFlipBook
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
  );
}
