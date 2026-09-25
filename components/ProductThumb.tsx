"use client";

import { useEffect, useRef, useState } from "react";
import ModelViewer from "@/components/ModelViewer";
import { DEFAULT_FINISH } from "@/lib/finishes";

// A 3D scene per card is expensive, so a thumbnail only mounts while it is
// near the viewport and unmounts once it scrolls away.
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
      className="aspect-[4/3] w-full bg-gradient-to-b from-leaf-50 to-leaf-100"
    >
      {visible ? (
        <ModelViewer src={src} alt={title} finish={DEFAULT_FINISH} interactive={false} />
      ) : null}
    </div>
  );
}
