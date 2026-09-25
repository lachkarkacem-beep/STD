// Mirrors public/3d/finishes.js and the `finishes` block of
// public/models_web/models.json — same ids, same body tones.

export type Finish = { id: string; label: string; swatch: string; body: string };

export const FINISHES: Finish[] = [
  { id: "blanc", label: "Blanc", body: "#f2f0ec", swatch: "#f2f0ec" },
  { id: "gris", label: "Gris", body: "#9b9b98", swatch: "#9b9b98" },
  { id: "noir", label: "Noir", body: "#33322f", swatch: "#33322f" },
  { id: "saumon", label: "Saumon", body: "#dfa189", swatch: "#dfa189" },
  { id: "rouge-clair", label: "Rouge clair", body: "#c2614c", swatch: "#c2614c" },
];

export const DEFAULT_FINISH = "blanc";

export function getFinish(id: string | null | undefined): Finish {
  return FINISHES.find((f) => f.id === id) ?? FINISHES[0];
}

// Lightness offset per material name, copied from public/3d/finishes.js so the
// GLB viewer shades mouldings, linings and relief exactly like the procedural
// one did. `soil` and `iron` are absent on purpose: earth and wrought iron are
// not part of the finish.
const STEPS: Record<string, number> = {
  body: 0,
  molding: -0.07,
  inner: -0.2,
  relief: 0.05,
  weave: 0.05,
  scales: 0.05,
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// k > 0 lightens toward white, k < 0 darkens toward black.
function shift(hex: string, k: number): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const f = (v: number) => (k >= 0 ? v + (255 - v) * k : v * (1 + k));
  return [f(r), f(g), f(b)];
}

// Linear-space RGBA in 0..1, the form glTF base-colour factors take.
function toLinear(c: number) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function paletteFor(finishId: string): Record<string, [number, number, number, number]> {
  const finish = getFinish(finishId);
  const out: Record<string, [number, number, number, number]> = {};
  for (const [name, k] of Object.entries(STEPS)) {
    const [r, g, b] = shift(finish.body, k);
    out[name] = [toLinear(r), toLinear(g), toLinear(b), 1];
  }
  return out;
}
