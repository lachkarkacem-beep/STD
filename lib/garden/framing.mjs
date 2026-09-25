// Encadrement d'un jardin par des bordures en pierre reconstituée.
//
// Le point délicat est le coin. Poser quatre courses de bordures bout à bout
// sur les quatre côtés les fait se chevaucher aux angles : deux pièces
// occupent le même carré. On fait donc courir les deux longs côtés sur toute
// la longueur, et on rentre les deux petits côtés de l'épaisseur d'une
// bordure. Les angles se ferment alors franchement, sans recouvrement — ce
// que le moteur de scène refuserait de toute façon.

/**
 * @typedef {{ ref: string, x: number, z: number, rotation?: number, finish?: string }} FrameItem
 */

const T = Math.PI / 2;

/** Modules proposés, du plus bas au plus haut. */
export const FRAME_KINDS = [
  {
    id: "basse",
    label: "Bordure basse (20 cm)",
    ref: "BORDURES",
    length: 0.5,
    thickness: 0.1,
    height: 0.2,
  },
  {
    id: "moyenne",
    label: "Bordure ajourée (35 cm)",
    ref: "BP27-100",
    length: 1,
    thickness: 0.05,
    height: 0.35,
  },
];

export function frameKind(id) {
  return FRAME_KINDS.find((k) => k.id === id) ?? FRAME_KINDS[0];
}

/**
 * Dimensions ajustées pour tomber juste sur un nombre entier de bordures :
 * un cadre qui se termine par une demi-pièce n'a pas l'air fini.
 */
export function frameFit(kindId, width, depth) {
  const kind = frameKind(kindId);
  const cols = Math.max(2, Math.round(width / kind.length));
  const rows = Math.max(2, Math.round((depth - 2 * kind.thickness) / kind.length));
  return {
    kind,
    cols,
    rows,
    width: cols * kind.length,
    depth: rows * kind.length + 2 * kind.thickness,
  };
}

/**
 * Bordures formant un rectangle fermé, centré sur (x, z).
 *
 * @param {string} kindId
 * @param {number} width @param {number} depth  dimensions souhaitées, en mètres
 * @param {{x?: number, z?: number, finish?: string}} [opts]
 * @returns {FrameItem[]}
 */
export function frameLayout(kindId, width, depth, opts = {}) {
  const fit = frameFit(kindId, width, depth);
  const { kind, cols, rows } = fit;
  const cx = opts.x ?? 0;
  const cz = opts.z ?? 0;
  const finish = opts.finish;

  const hw = fit.width / 2;
  const hd = fit.depth / 2;
  /** @type {FrameItem[]} */
  const items = [];
  const put = (x, z, rotation) => items.push({ ref: kind.ref, x: +x.toFixed(3), z: +z.toFixed(3), rotation, ...(finish ? { finish } : {}) });

  // Les deux longs côtés, sur toute la largeur.
  for (let i = 0; i < cols; i++) {
    const x = cx - hw + kind.length * (i + 0.5);
    put(x, cz - hd + kind.thickness / 2, 0);
    put(x, cz + hd - kind.thickness / 2, 0);
  }

  // Les deux petits côtés, rentrés de l'épaisseur d'une bordure pour que les
  // angles se ferment sans que deux pièces se marchent dessus.
  for (let j = 0; j < rows; j++) {
    const z = cz - hd + kind.thickness + kind.length * (j + 0.5);
    put(cx - hw + kind.thickness / 2, z, T);
    put(cx + hw - kind.thickness / 2, z, T);
  }

  return items;
}

/** Récapitulatif pour l'interface : nombre de bordures et périmètre. */
export function frameSummary(kindId, width, depth) {
  const fit = frameFit(kindId, width, depth);
  const items = frameLayout(kindId, width, depth);
  return {
    count: items.length,
    width: fit.width,
    depth: fit.depth,
    perimetre: 2 * (fit.width + fit.depth),
    label: fit.kind.label,
  };
}
