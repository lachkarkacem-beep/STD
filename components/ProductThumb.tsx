"use client";

import { useEffect, useRef, useState } from "react";

// Live three.js contexts are expensive, so a card's iframe only mounts while
// it is near the viewport and unmounts again once it scrolls away — the same
// spirit as the original catalog's WebGL context pooling, without a global
// pool manager.
export default function ProductThumb({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: "200px 0px",
      threshold: 0.01,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="aspect-[4/3] w-full bg-[#1b1d2a]">
      {visible ? (
        <iframe
          src={src}
          title={title}
          loading="lazy"
          scrolling="no"
          tabIndex={-1}
          className="pointer-events-none block h-full w-full border-0"
        />
      ) : null}
    </div>
  );
}
