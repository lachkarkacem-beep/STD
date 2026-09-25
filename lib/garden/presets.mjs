// Exemples d'aménagement, proposés comme points de départ. Les coordonnées
// sont en mètres, l'orientation en radians, et les références existent toutes
// au catalogue.
//
// En JavaScript simple, et non en TypeScript, pour que `npm run check` puisse
// importer les exemples tels quels : le harnais contrôle ainsi les pièces
// réellement produites, piquets générés en boucle compris, et non ce qu'une
// expression régulière croit lire dans le fichier.

/**
 * @typedef {{ ref: string, x: number, z: number, rotation?: number, finish?: string, species?: string | null }} PresetItem
 * @typedef {{ id: string, label: string, description: string, plot?: { width: number, depth: number }, items: PresetItem[] }} Preset
 */

const T = Math.PI / 2;

/**
 * Piquets répartis sur le pourtour d'une parcelle, espacés régulièrement.
 * Les coins ne sont posés qu'une fois.
 *
 * @param {string} ref
 * @param {number} width
 * @param {number} depth
 * @param {number} step
 * @returns {PresetItem[]}
 */
function fencePosts(ref, width, depth, step) {
  /** @type {PresetItem[]} */
  const posts = [];
  const hw = width / 2;
  const hd = depth / 2;
  const countX = Math.round(width / step);
  const countZ = Math.round(depth / step);

  for (let i = 0; i <= countX; i++) {
    const x = -hw + (i * width) / countX;
    posts.push({ ref, x, z: -hd });
    posts.push({ ref, x, z: hd });
  }
  for (let i = 1; i < countZ; i++) {
    const z = -hd + (i * depth) / countZ;
    posts.push({ ref, x: -hw, z });
    posts.push({ ref, x: hw, z });
  }
  return posts;
}

/** @type {Preset[]} */
export const PRESETS = [
  {
    id: "terrain-cloture",
    label: "Le terrain clôturé",
    description:
      "Une parcelle de terre ceinturée de piquets béton de 2 m, plantée de quelques bacs — le potager que l'on délimite avant de l'aménager.",
    plot: { width: 8, depth: 6 },
    items: [
      ...fencePosts("PQ200", 8, 6, 1.6),
      { ref: "B105", x: -1.8, z: -1, finish: "blanc", species: "graminee" },
      { ref: "B105", x: 1.8, z: -1, finish: "blanc", species: "graminee" },
      { ref: "B27", x: 0, z: 1.2, finish: "saumon", species: "lavande" },
      { ref: "C250", x: 0, z: -1.6, finish: "blanc" },
    ],
  },
  {
    id: "jardin-puits",
    label: "Le jardin au puits",
    description:
      "Le puits décoratif en pièce maîtresse, entouré de bacs fleuris et d'une niche à l'écart, comme au fond d'un jardin de village.",
    items: [
      { ref: "PUITS", x: 0, z: 0, finish: "blanc" },
      { ref: "B105", x: -2.2, z: 1.4, finish: "blanc", species: "geranium" },
      { ref: "B105", x: 2.2, z: 1.4, finish: "blanc", species: "geranium" },
      { ref: "C250", x: -2.4, z: -1.6, finish: "blanc" },
      { ref: "C250", x: 2.4, z: -1.6, finish: "blanc" },
      { ref: "DOGHOME", x: 4.2, z: 2.6, rotation: -T / 2, finish: "gris" },
      { ref: "B27", x: 0, z: 3, finish: "saumon", species: "lavande" },
    ],
  },
  {
    id: "terrasse-repas",
    label: "La terrasse à manger",
    description:
      "Table, bancs et tabourets réunis à l'ombre, bordés de grands bacs plantés d'oliviers pour fermer l'espace.",
    items: [
      { ref: "TABLE", x: 0, z: 0, finish: "gris" },
      { ref: "BANCSIMPLE", x: 0, z: 1.1, finish: "gris" },
      { ref: "BANCSIMPLE", x: 0, z: -1.1, rotation: Math.PI, finish: "gris" },
      { ref: "TABOURET", x: 1.3, z: 0, rotation: T, finish: "gris" },
      { ref: "TABOURET", x: -1.3, z: 0, rotation: T, finish: "gris" },
      { ref: "BS225", x: -3, z: -2.4, finish: "blanc", species: "olivier" },
      { ref: "BS225", x: 3, z: -2.4, finish: "blanc", species: "olivier" },
    ],
  },
  {
    id: "entree-colonnes",
    label: "L'entrée à colonnes",
    description:
      "Deux colonnes portant des vasques encadrent le passage, prolongées par une allée de bacs bas plantés de buis.",
    items: [
      { ref: "C400", x: -1.6, z: 0, finish: "blanc" },
      { ref: "C400", x: 1.6, z: 0, finish: "blanc" },
      { ref: "B40", x: -1.6, z: 2, finish: "blanc", species: "buis" },
      { ref: "B40", x: 1.6, z: 2, finish: "blanc", species: "buis" },
      { ref: "B40", x: -1.6, z: 3.4, finish: "blanc", species: "buis" },
      { ref: "B40", x: 1.6, z: 3.4, finish: "blanc", species: "buis" },
    ],
  },
  {
    id: "patio-succulentes",
    label: "Le patio méditerranéen",
    description:
      "Un patio sobre : pots ronds groupés, succulentes et graminées, un banc à dossier contre le mur.",
    items: [
      { ref: "B136", x: 0, z: -2, finish: "saumon" },
      { ref: "B800", x: -1.8, z: 0, finish: "rouge-clair", species: "succulente" },
      { ref: "B729", x: 0, z: 0.4, finish: "saumon", species: "graminee" },
      { ref: "B800", x: 1.8, z: 0, finish: "rouge-clair", species: "succulente" },
      { ref: "B366", x: 0, z: 2.2, finish: "blanc", species: "palmier" },
    ],
  },
];
