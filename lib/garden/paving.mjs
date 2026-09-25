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
 * `exclude` retire les plaques qui tomberaient sur une réserve — un bassin,
 * typiquement. Sans cela le dallage se poserait par-dessus l'ouverture creusée
 * dans le sol et la piscine paraîtrait pleine de dalles.
 *
 * @param {string} ref
 * @param {{ width: number, depth: number, x?: number, z?: number }} area
 * @param {{ width: number, depth: number, x?: number, z?: number } | null} [exclude]
 */
export function pavingLayout(ref, area, exclude = null) {
  const pitch = pavingPitch(ref);
  if (!pitch) return null;

  const cols = Math.ceil(area.width / pitch.x);
  const rows = Math.ceil(area.depth / pitch.z);
  const originX = (area.x ?? 0) - (cols * pitch.x) / 2 + pitch.x / 2;
  const originZ = (area.z ?? 0) - (rows * pitch.z) / 2 + pitch.z / 2;

  // La réserve est élargie de la margelle : la plaque suivante ne doit pas
  // venir mordre dessus.
  const MARGELLE = 0.4;
  const res = exclude
    ? {
        minX: (exclude.x ?? 0) - exclude.width / 2 - MARGELLE,
        maxX: (exclude.x ?? 0) + exclude.width / 2 + MARGELLE,
        minZ: (exclude.z ?? 0) - exclude.depth / 2 - MARGELLE,
        maxZ: (exclude.z ?? 0) + exclude.depth / 2 + MARGELLE,
      }
    : null;

  const positions = [];
  let skipped = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = originX + c * pitch.x;
      const z = originZ + r * pitch.z;
      if (res) {
        const overlaps =
          x + pitch.x / 2 > res.minX &&
          x - pitch.x / 2 < res.maxX &&
          z + pitch.z / 2 > res.minZ &&
          z - pitch.z / 2 < res.maxZ;
        if (overlaps) {
          skipped++;
          continue;
        }
      }
      positions.push({ x, z });
    }
  }
  return { pitch, cols, rows, positions, skipped };
}

/** Nombre de dalles et surface réellement pavée, pour le récapitulatif. */
export function pavingCount(ref, area, exclude = null) {
  const layout = pavingLayout(ref, area, exclude);
  if (!layout) return null;
  const perPatch = COLS * ROWS;
  return {
    patches: layout.positions.length,
    tiles: layout.positions.length * perPatch,
    // Surface des plaques posées, réserve déduite : c'est ce qui sera commandé.
    m2: layout.positions.length * layout.pitch.x * layout.pitch.z,
  };
}
