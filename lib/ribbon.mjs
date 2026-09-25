// Bande défilante de miniatures : les pièces traversent l'écran de droite à
// gauche, et celle qui sort d'un côté réapparaît de l'autre. Le défilement doit
// paraître sans fin — donc aucun trou, aucun saut visible, et jamais deux
// pièces qui se chevauchent.
//
// Tout est calculé ici, hors de three.js, pour que le harnais puisse vérifier
// l'invariant qui compte : à n'importe quel instant, la bande est identique à
// elle-même, simplement décalée.

/** Écart entre deux pièces, en unités de scène. En deçà elles se toucheraient. */
export const ESPACEMENT = 2.6;

/** Marge hors champ de part et d'autre : le rebouclage doit rester invisible. */
export const MARGE = 1.6;

/**
 * Nombre de pièces nécessaires pour couvrir la largeur visible sans trou.
 * @param {number} demiLargeur demi-largeur visible, en unités de scène
 */
export function ribbonCount(demiLargeur, espacement = ESPACEMENT, marge = MARGE) {
  const span = 2 * (demiLargeur + marge);
  return Math.max(3, Math.min(12, Math.ceil(span / espacement)));
}

/** Longueur du circuit : c'est elle, et non la largeur visible, qui reboucle. */
export function ribbonSpan(count, espacement = ESPACEMENT) {
  return count * espacement;
}

function rng(seed) {
  let t = (seed >>> 0) || 1;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pièces de la bande : réparties à intervalle régulier sur le circuit, avec
 * une hauteur, une profondeur et un rythme propres à chacune — sans quoi la
 * file paraîtrait un convoi plutôt qu'un vol.
 *
 * @param {number} count
 * @param {{ seed?: number, espacement?: number, hauteur?: number, profondeur?: number }} [opts]
 */
export function ribbonLayout(count, opts = {}) {
  const r = rng(opts.seed ?? 20250926);
  const espacement = opts.espacement ?? ESPACEMENT;
  const hauteur = opts.hauteur ?? 0.7;
  const profondeur = opts.profondeur ?? 1.4;
  const span = ribbonSpan(count, espacement);

  const pieces = [];
  for (let i = 0; i < count; i++) {
    const z = -profondeur * r();
    const proche = 1 + z / profondeur; // 1 au premier plan, 0 au fond
    pieces.push({
      // Position de départ sur le circuit, centré sur zéro.
      x0: -span / 2 + i * espacement,
      y: (r() - 0.5) * hauteur,
      z,
      // Une pièce lointaine est plus petite : c'est ce qui creuse la bande.
      scale: 0.62 + proche * 0.26,
      phase: r() * Math.PI * 2,
      bob: 0.05 + r() * 0.07,
      bobSpeed: 0.4 + r() * 0.35,
      spin: (0.05 + r() * 0.06) * (r() > 0.5 ? 1 : -1),
    });
  }
  return pieces;
}

/**
 * Position d'une pièce à l'instant t : translation vers la gauche, repliée sur
 * le circuit. Le modulo garantit le retour par la droite sans discontinuité.
 *
 * @param {number} x0 position de départ
 * @param {number} t secondes
 * @param {number} vitesse unités par seconde
 * @param {number} span longueur du circuit
 */
export function ribbonX(x0, t, vitesse, span) {
  const min = -span / 2;
  const x = x0 - vitesse * t;
  return ((((x - min) % span) + span) % span) + min;
}
