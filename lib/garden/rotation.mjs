// Orientation des pièces posées.
//
// Le pas de 15° n'est pas arbitraire : il retombe juste sur les angles qu'on
// utilise réellement dans un jardin (30°, 45°, 90°) tout en laissant assez de
// finesse pour aligner une pièce sur un mur de travers.

export const ROTATION_STEP = Math.PI / 12; // 15°

/** Ramène un angle dans [0, 2π[, pour que l'affichage ne parte pas en spirale. */
export function normalizeAngle(angle) {
  const tau = Math.PI * 2;
  return ((angle % tau) + tau) % tau;
}

/** Cale un angle sur le pas le plus proche. */
export function snapAngle(angle, step = ROTATION_STEP) {
  return normalizeAngle(Math.round(angle / step) * step);
}

/** Angle en degrés entiers, pour l'interface. */
export function toDegrees(angle) {
  return Math.round((normalizeAngle(angle) * 180) / Math.PI) % 360;
}

/**
 * Angle sous lequel un point est vu depuis un centre, dans le plan du sol.
 * Sert à faire suivre la souris à la pièce pendant une rotation.
 */
export function angleFromCenter(cx, cz, px, pz) {
  return normalizeAngle(Math.atan2(px - cx, pz - cz));
}
