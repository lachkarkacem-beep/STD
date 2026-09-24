// Mirrors public/3d/finishes.js (the source of truth for the 3D engine).
// Duplicated here as plain data for the React finish picker UI.

export type Finish = { id: string; label: string; swatch: string };

export const FINISHES: Finish[] = [
  { id: "blanc", label: "Blanc", swatch: "#f2f0ec" },
  { id: "gris", label: "Gris", swatch: "#9b9b98" },
  { id: "noir", label: "Noir", swatch: "#33322f" },
  { id: "saumon", label: "Saumon", swatch: "#dfa189" },
  { id: "rouge-clair", label: "Rouge clair", swatch: "#c2614c" },
];

export const DEFAULT_FINISH = "blanc";
