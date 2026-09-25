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
 * @typedef {{ width: number, depth: number, x?: number, z?: number }} Zone
 * @typedef {{ id: string, label: string, description: string, plot?: Zone, pool?: Zone, ground?: string, building?: string, buildingZ?: number, paving?: string, pavingArea?: Zone, items: PresetItem[] }} Preset
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
    id: "cour-riad",
    label: "La cour de riad",
    description:
      "Une cour fermée pavée de motif tapis, fontaine centrale et jets d'eau muraux qui se répondent d'un mur à l'autre. Pots aux quatre angles, bancs adossés.",
    ground: "sable",
    paving: "DALTAPIS",
    pavingArea: { width: 12, depth: 12 },
    items: [
      { ref: "F21", x: 0, z: 0, finish: "blanc" },
      { ref: "F100", x: -4.4, z: -5, finish: "blanc" },
      { ref: "F100", x: 4.4, z: -5, finish: "blanc" },
      { ref: "B800", x: -4.4, z: -2.4, finish: "saumon", species: "palmier" },
      { ref: "B800", x: 4.4, z: -2.4, finish: "saumon", species: "palmier" },
      { ref: "B800", x: -4.4, z: 2.4, finish: "saumon", species: "succulente" },
      { ref: "B800", x: 4.4, z: 2.4, finish: "saumon", species: "succulente" },
      { ref: "BANCSIMPLE", x: -2.4, z: 4.8, finish: "blanc" },
      { ref: "BANCSIMPLE", x: 2.4, z: 4.8, finish: "blanc" },
    ],
  },
  {
    id: "allee-entree",
    label: "L'allée d'entrée",
    description:
      "Une allée de pavés autobloquants menant à la maison, bordée de BP27 ajourées et rythmée de colonnes. Bacs de buis taillés en cadence.",
    ground: "pelouse",
    building: "maison",
    buildingZ: -5.5,
    paving: "DALHUIT",
    pavingArea: { width: 3, depth: 14, z: 3 },
    items: [
      { ref: "C300", x: -2.2, z: -1.4, finish: "blanc" },
      { ref: "C300", x: 2.2, z: -1.4, finish: "blanc" },
      { ref: "BP27-100", x: -2.2, z: 1.6, finish: "blanc" },
      { ref: "BP27-100", x: 2.2, z: 1.6, finish: "blanc" },
      { ref: "BP27-100", x: -2.2, z: 2.8, finish: "blanc" },
      { ref: "BP27-100", x: 2.2, z: 2.8, finish: "blanc" },
      { ref: "B40", x: -2.9, z: 4.6, finish: "blanc", species: "buis" },
      { ref: "B40", x: 2.9, z: 4.6, finish: "blanc", species: "buis" },
      { ref: "B40", x: -2.9, z: 6.4, finish: "blanc", species: "buis" },
      { ref: "B40", x: 2.9, z: 6.4, finish: "blanc", species: "buis" },
      { ref: "F86", x: 0, z: -2.4, finish: "blanc" },
    ],
  },
  {
    id: "coin-barbecue",
    label: "Le coin barbecue",
    description:
      "Terrasse en motif brique, barbecue à hotte adossé, table et tabourets à distance des projections, graminées pour fermer le fond.",
    ground: "gravier",
    paving: "DALBRIQUE",
    pavingArea: { width: 10, depth: 8 },
    items: [
      { ref: "BARBACUE3", x: -3.4, z: -2.6, finish: "gris" },
      { ref: "TABLE", x: 1.2, z: 0.4, finish: "gris" },
      { ref: "BANCSIMPLE", x: 1.2, z: 1.8, finish: "gris" },
      { ref: "BANCSIMPLE", x: 1.2, z: -1, rotation: Math.PI, finish: "gris" },
      { ref: "TABOURET", x: 3.2, z: 0.4, rotation: T, finish: "gris" },
      { ref: "B729", x: -3.6, z: 2.6, finish: "saumon", species: "graminee" },
      { ref: "B729", x: -1.6, z: 3.2, finish: "saumon", species: "graminee" },
      { ref: "PASPIERRE", x: 3.6, z: 3 },
    ],
  },
  {
    id: "villa-piscine",
    label: "Villa avec piscine",
    description:
      "La villa en fond, sa terrasse dallée, et un bassin de 9 × 4,5 m bordé de margelles. Bacs d'oliviers en garde le long des baies, allée de pas japonais vers le jardin.",
    ground: "dallage",
    building: "villa",
    buildingZ: -8.5,
    // Vraie terrasse en dalles 50 × 50, posées au module pour qu'aucun joint
    // ne laisse de vide.
    paving: "DAL50R",
    pavingArea: { width: 16, depth: 10, z: 0 },
    // Le bassin se place devant la terrasse, à 4 m de la façade : la distance
    // qu'on laisse réellement pour circuler et poser des bains de soleil.
    pool: { width: 9, depth: 4.5, z: 1.5 },
    items: [
      // Bacs alignés au pied des baies, en retrait d'un mètre de la façade.
      { ref: "BS225", x: -5.2, z: -2.2, finish: "blanc", species: "olivier" },
      { ref: "BS225", x: 5.2, z: -2.2, finish: "blanc", species: "olivier" },
      { ref: "B800", x: -2.4, z: -2.2, finish: "blanc", species: "palmier" },
      { ref: "B800", x: 2.4, z: -2.2, finish: "blanc", species: "palmier" },
      // Assises face au bassin, côté jardin.
      { ref: "BANCSIMPLE", x: -3.2, z: 5.4, finish: "blanc" },
      { ref: "BANCSIMPLE", x: 3.2, z: 5.4, finish: "blanc" },
      // Cheminement vers le fond du jardin.
      { ref: "PASPIERRE", x: 0, z: 6.4 },
      { ref: "PASPIERRE", x: 0, z: 7.4 },
      { ref: "PASPIERRE", x: 0, z: 8.4 },
      { ref: "F22", x: 0, z: 10.5, finish: "blanc" },
    ],
  },
  {
    id: "villa-piscine-detente",
    label: "Villa — piscine et détente",
    description:
      "La même villa en version conviviale : barbecue à hotte adossé au mur, table et tabourets à l'écart des projections, jets d'eau muraux en fond de terrasse.",
    ground: "sable",
    building: "villa",
    buildingZ: -8.5,
    pool: { width: 8, depth: 4, z: 2 },
    items: [
      // Le barbecue s'adosse à la façade, à distance de la table.
      { ref: "BARBACUE3", x: -5.6, z: -2, rotation: T, finish: "gris" },
      // Coin repas décalé de l'autre côté, hors du passage vers le bassin.
      { ref: "TABLE", x: 4.6, z: -1.6, finish: "blanc" },
      { ref: "TABOURET", x: 4.6, z: -0.2, finish: "blanc" },
      { ref: "TABOURET", x: 4.6, z: -3, finish: "blanc" },
      { ref: "BANCSIMPLE", x: 6.4, z: -1.6, rotation: T, finish: "blanc" },
      // Fontaines murales en pied de façade, de part et d'autre de l'entrée.
      { ref: "F86", x: -1.8, z: -3.6, finish: "blanc" },
      { ref: "F86", x: 1.8, z: -3.6, finish: "blanc" },
      // Bordures qui tiennent le massif au bord de la terrasse.
      { ref: "BP27-100", x: -4, z: 6, finish: "blanc" },
      { ref: "BP27-100", x: -2.9, z: 6, finish: "blanc" },
      { ref: "B729", x: 3.4, z: 6, finish: "saumon", species: "graminee" },
    ],
  },
  {
    id: "maison-jardin",
    label: "Maison et jardin clos",
    description:
      "Une maison de plain-pied, son allée de pas japonais et un jardin ceinturé de piquets grillagés. L'échelle est juste : 2,80 m au mur, bacs de 40 cm, allée d'un mètre.",
    ground: "pelouse",
    building: "maison",
    buildingZ: -3.5,
    items: [
      ...fencePosts("PQ200", 16, 14, 1.6),
      { ref: "PASPIERRE", x: 0, z: 1.2 },
      { ref: "PASPIERRE", x: 0, z: 2.4 },
      { ref: "PASPIERRE", x: 0, z: 3.6 },
      { ref: "B40", x: -1.6, z: 1.2, finish: "blanc", species: "buis" },
      { ref: "B40", x: 1.6, z: 1.2, finish: "blanc", species: "buis" },
      { ref: "B105", x: -4.2, z: -0.6, finish: "blanc", species: "geranium" },
      { ref: "B105", x: 4.2, z: -0.6, finish: "blanc", species: "geranium" },
      { ref: "PUITS", x: -4.6, z: 4.4, finish: "blanc" },
      { ref: "DOGHOME", x: 4.8, z: 4.6, rotation: -T / 2, finish: "gris" },
      { ref: "BARBACUE1", x: 0, z: 5.6, finish: "gris" },
    ],
  },
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
