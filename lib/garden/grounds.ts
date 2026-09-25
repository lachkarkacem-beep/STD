// Types de sol disponibles. Volontairement séparé de scene.ts, qui importe
// three.js : l'interface peut ainsi proposer les sols sans embarquer le moteur
// 3D dans le bundle initial.

export type GroundKind = "pelouse" | "terre" | "sable" | "gravier" | "dallage";

export const GROUNDS: { id: GroundKind; label: string; color: number }[] = [
  { id: "pelouse", label: "Pelouse", color: 0x7fa65c },
  { id: "terre", label: "Terre", color: 0x8a6748 },
  { id: "sable", label: "Sable", color: 0xd9c9a3 },
  { id: "gravier", label: "Gravier", color: 0xa8a49c },
  { id: "dallage", label: "Dallage", color: 0xbfb8ad },
];

export function groundColor(kind: GroundKind) {
  return (GROUNDS.find((g) => g.id === kind) ?? GROUNDS[0]).color;
}

/** Couleur CSS, pour les pastilles de l'interface. */
export function groundCss(kind: GroundKind) {
  return `#${groundColor(kind).toString(16).padStart(6, "0")}`;
}
