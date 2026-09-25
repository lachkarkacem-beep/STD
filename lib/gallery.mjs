// Disposition des miniatures flottantes.
//
// Une grille régulière trahit immédiatement le procédé : il faut que les
// pièces semblent suspendues au hasard tout en restant lisibles. On tire donc
// des positions au sort dans un volume, en refusant celles qui approchent
// d'une voisine — en tenant compte de la profondeur, puisque deux pièces
// éloignées peuvent se superposer à l'écran sans se toucher dans l'espace.

/** Pièces retenues : une par famille, pour montrer l'étendue du catalogue. */
export const GALLERY_REFS = [
  "B105", // bac à lames
  "C400", // colonne
  "B800", // pot rond
  "PUITS", // puits
  "F22", // fontaine
  "TABLE", // table
  "BARBACUE1", // barbecue
  "B366", // vasque
  "F86", // jet d'eau mural
  "DOGHOME", // niche
  "BP27-100", // bordure ajourée
  "PASPIERRE", // pas japonais
];

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
 * Positions, échelles et phases d'animation des miniatures.
 *
 * Les phases sont toutes différentes : synchronisées, les pièces monteraient
 * et descendraient ensemble, ce qui ferait mécanique plutôt qu'organique.
 *
 * @param {number} count nombre de miniatures
 * @param {{ seed?: number, width?: number, height?: number, depth?: number }} [opts]
 */
export function galleryLayout(count, opts = {}) {
  const r = rng(opts.seed ?? 20250925);
  const width = opts.width ?? 9;
  const height = opts.height ?? 4.4;
  const depth = opts.depth ?? 5;

  const placed = [];
  const attempts = count * 400;

  for (let i = 0; placed.length < count && i < attempts; i++) {
    // Plus une pièce est loin, plus elle est petite : c'est ce qui donne la
    // profondeur, davantage que la seule perspective.
    const z = -depth * r();
    const proche = 1 + z / depth; // 1 au premier plan, 0 au fond
    const scale = 0.15 + proche * 0.1;

    const candidate = {
      x: (r() - 0.5) * width,
      y: (r() - 0.5) * height,
      z,
      scale,
      // Rayon apparent : une pièce lointaine occupe moins de place à l'écran.
      radius: 0.55 + proche * 0.35,
      phase: r() * Math.PI * 2,
      bob: 0.1 + r() * 0.12,
      speed: 0.35 + r() * 0.3,
      drift: 0.05 + r() * 0.07,
      spin: (0.04 + r() * 0.05) * (r() > 0.5 ? 1 : -1),
    };

    // Rejet : on compare les positions projetées, écart de profondeur compris,
    // pour qu'aucune pièce n'en masque une autre.
    const gene = placed.some((p) => {
      const dx = p.x - candidate.x;
      const dy = p.y - candidate.y;
      const dz = (p.z - candidate.z) * 0.35;
      return Math.hypot(dx, dy, dz) < p.radius + candidate.radius;
    });
    if (gene) continue;

    placed.push(candidate);
  }

  return placed;
}

/** Nombre de miniatures selon l'écran : un téléphone n'en tient pas douze. */
export function galleryCount(mobile) {
  return mobile ? 5 : 10;
}
