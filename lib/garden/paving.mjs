// Pavage du sol avec les dallages du catalogue.
//
// Les GLB des références DAL* ne contiennent pas une dalle isolée mais une
// plaque posée de 4 × 2 dalles : le motif ne se referme qu'en travers des
// joints. Leur boîte englobante dépasse le module de 1 à 2 cm, débord du
// relief de joint — paver au pas de la boîte laisserait donc un vide entre
// chaque plaque. Le pas de pose est le module exact : 4 dalles en longueur,
// 2 en largeur. Les reliefs voisins se recouvrent au joint, comme sur un
// chantier réel.
//
// DALPLINTHE est absente : c'est une barrette de bordure (40 × 10), pas une
// dalle de champ.

const COLS = 4;
const ROWS = 2;

/** Côté de la dalle unitaire, en mètres. */
const TILE = {
  DAL301: 0.3,
  DAL45: 0.45,
  DAL50R: 0.5,
  DALBOIS: 0.5,
  DALBRIQUE: 0.3,
  DALTAPIS: 0.3,
  DALTAPIS1: 0.4,
  DALHUIT: 0.27,
  DALHUITR: 0.27,
  DALMOULIN: 0.25,
};

export const PAVINGS = [
  { ref: "DAL301", label: "Dalle 30 × 30" },
  { ref: "DAL45", label: "Dalle 45 × 45" },
  { ref: "DAL50R", label: "Dalle 50 × 50" },
  { ref: "DALBOIS", label: "Motif bois" },
  { ref: "DALBRIQUE", label: "Motif brique" },
  { ref: "DALTAPIS", label: "Motif tapis" },
  { ref: "DALTAPIS1", label: "Motif tapis 40" },
  { ref: "DALHUIT", label: "Autobloquante" },
  { ref: "DALHUITR", label: "Autobloquante à relief" },
  { ref: "DALMOULIN", label: "Pavé croix" },
];

export function isPavable(ref) {
  return ref in TILE;
}

/** Pas de pose d'une plaque, en mètres. */
export function pavingPitch(ref) {
  const tile = TILE[ref];
  if (!tile) return null;
  return { x: tile * COLS, z: tile * ROWS };
}

/**
 * Positions des plaques couvrant une surface, sans vide ni débord notable.
 * La surface est couverte au moins entièrement : on arrondit le nombre de
 * plaques au supérieur et on centre le pavage.
 *
 * @param {string} ref
 * @param {{ width: number, depth: number, x?: number, z?: number }} area
 */
export function pavingLayout(ref, area) {
  const pitch = pavingPitch(ref);
  if (!pitch) return null;

  const cols = Math.ceil(area.width / pitch.x);
  const rows = Math.ceil(area.depth / pitch.z);
  const originX = (area.x ?? 0) - (cols * pitch.x) / 2 + pitch.x / 2;
  const originZ = (area.z ?? 0) - (rows * pitch.z) / 2 + pitch.z / 2;

  const positions = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      positions.push({ x: originX + c * pitch.x, z: originZ + r * pitch.z });
    }
  }
  return { pitch, cols, rows, positions };
}

/** Nombre de dalles et surface couverte, pour le récapitulatif du projet. */
export function pavingCount(ref, area) {
  const layout = pavingLayout(ref, area);
  if (!layout) return null;
  const perPatch = COLS * ROWS;
  return {
    patches: layout.positions.length,
    tiles: layout.positions.length * perPatch,
    m2: layout.cols * layout.pitch.x * layout.rows * layout.pitch.z,
  };
}
