"use client";

import { useEffect, useRef, useState } from "react";
import { paletteFor } from "@/lib/finishes";

type ModelViewerElement = HTMLElement & {
  model?: {
    materials: {
      name: string;
      pbrMetallicRoughness: { setBaseColorFactor: (rgba: number[]) => void };
    }[];
  };
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        "camera-controls"?: boolean | string;
        "auto-rotate"?: boolean | string;
        "shadow-intensity"?: string;
        "touch-action"?: string;
        "interaction-prompt"?: string;
        exposure?: string;
        ar?: boolean | string;
        "ar-modes"?: string;
        loading?: string;
        reveal?: string;
      };
    }
  }
}

export default function ModelViewer({
  src,
  alt,
  finish,
  interactive = true,
  className = "",
}: {
  src: string;
  alt: string;
  finish: string;
  interactive?: boolean;
  className?: string;
}) {
  const ref = useRef<ModelViewerElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // The web component only exists in the browser.
    import("@google/model-viewer").then(() => setLoaded(true));
  }, []);

  // Recolour the stone materials whenever the finish changes (and once the
  // model itself has finished loading). Soil and iron keep their own colours.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const apply = () => {
      const materials = el.model?.materials;
      if (!materials) return;
      const palette = paletteFor(finish);
      for (const material of materials) {
        const rgba = palette[material.name];
        if (rgba) material.pbrMetallicRoughness.setBaseColorFactor(rgba);
      }
    };

    apply();
    el.addEventListener("load", apply);
    return () => el.removeEventListener("load", apply);
  }, [finish, loaded, src]);

  return (
    <model-viewer
      ref={ref}
      src={src}
      alt={alt}
      camera-controls={interactive ? true : undefined}
      auto-rotate
      ar={interactive ? true : undefined}
      ar-modes="webxr scene-viewer quick-look"
      shadow-intensity="1"
      exposure="1.1"
      touch-action={interactive ? "pan-y" : "none"}
      interaction-prompt="none"
      loading="lazy"
      className={className}
      style={{ width: "100%", height: "100%", backgroundColor: "#f2f2f2" }}
    />
  );
}
