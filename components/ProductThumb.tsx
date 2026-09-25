"use client";

import { useEffect, useRef, useState } from "react";
import Viewer3D from "@/components/Viewer3D";
import { DEFAULT_FINISH } from "@/lib/finishes";

// Une scène 3D par carte coûte cher : la vignette ne se monte que lorsqu'elle
// approche de l'écran, et se démonte une fois éloignée.
export default function ProductThumb({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: "300px 0px",
      threshold: 0.01,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      title={title}
      className="aspect-[4/3] w-full bg-gradient-to-b from-sable-50 to-sable-200"
    >
      {visible ? (
        <Viewer3D src={src} finish={DEFAULT_FINISH} interactive={false} autoRotate />
      ) : null}
    </div>
  );
}
