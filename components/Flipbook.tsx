"use client";

import HTMLFlipBook from "react-pageflip";

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
        showCover={false}
        className="shadow-card"
      >
        {pages.map((src) => (
          <div key={src} className="bg-white">
            <img src={src} alt="" className="h-full w-full object-contain" />
          </div>
        ))}
      </HTMLFlipBook>
    </div>
  );
}
