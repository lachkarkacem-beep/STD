// Exemples d'aménagement : des projets terminés, pas des démonstrations
// techniques. Chaque scène respecte les distances d'un vrai chantier — un
// mètre de circulation, 70 cm derrière une assise, 60 cm entre deux pas
// japonais — parce que c'est ce qui rend la projection crédible.
//
// En JavaScript simple, et non en TypeScript, pour que `npm run check` puisse
// importer les exemples tels quels : le harnais contrôle ainsi les pièces
// réellement produites, bordures et piquets générés en boucle compris, et non
// ce qu'une expression régulière croit lire dans le fichier.

/**
 * @typedef {{ ref: string, x: number, z: number, rotation?: number, finish?: string, species?: string | null }} PresetItem
 * @typedef {{ ref: string, x: number, z: number, rotation?: number }} PresetProp
 * @typedef {{ width: number, depth: number, x?: number, z?: number }} Zone
 * @typedef {{ id: string, label: string, description: string, plot?: Zone, pool?: Zone, ground?: string, building?: string, buildingZ?: number, paving?: string, pavingArea?: Zone, items: PresetItem[], props?: PresetProp[], nuit?: boolean }} Preset
 */

const T = Math.PI / 2;

/**
 * Piquets répartis sur le pourtour d'une parcelle, espacés régulièrement.
 * Les coins ne sont posés qu'une fois.
 *
 * @param {string} ref @param {number} width @param {number} depth @param {number} step
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

/**
 * Rectangle de bordures aux angles nets.
 *
 * Quatre courses posées bout à bout sur quatre côtés se chevauchent aux
 * angles : deux pièces occupent le même carré. Les longs côtés courent donc
 * sur toute la largeur, et les petits sont rentrés de l'épaisseur d'une
 * bordure. Les dimensions sont arrondies à un nombre entier de pièces — un
 * cadre qui finit sur une demi-bordure n'a pas l'air fini.
 *
 * @param {string} ref @param {number} length @param {number} thickness
 * @param {number} width @param {number} depth
 * @param {{x?: number, z?: number, finish?: string}} [opts]
 * @returns {PresetItem[]}
 */
function borderFrame(ref, length, thickness, width, depth, opts = {}) {
  const cx = opts.x ?? 0;
  const cz = opts.z ?? 0;
  const cols = Math.max(2, Math.round(width / length));
  const rows = Math.max(2, Math.round((depth - 2 * thickness) / length));
  const hw = (cols * length) / 2;
  const hd = (rows * length + 2 * thickness) / 2;

  /** @type {PresetItem[]} */
  const items = [];
  const put = (x, z, rotation) =>
    items.push({
      ref,
      x: +x.toFixed(3),
      z: +z.toFixed(3),
      rotation,
      ...(opts.finish ? { finish: opts.finish } : {}),
    });

  for (let i = 0; i < cols; i++) {
    const x = cx - hw + length * (i + 0.5);
    put(x, cz - hd + thickness / 2, 0);
    put(x, cz + hd - thickness / 2, 0);
  }
  for (let j = 0; j < rows; j++) {
    const z = cz - hd + thickness + length * (j + 0.5);
    put(cx - hw + thickness / 2, z, T);
    put(cx + hw - thickness / 2, z, T);
  }
  return items;
}

/** Cadre en bordure basse (50 × 10 cm, 20 cm de haut). */
const basse = (w, d, opts) => borderFrame("BORDURES", 0.5, 0.1, w, d, opts);
/** Cadre en bordure ajourée BP27 (100 × 5 cm, 35 cm de haut). */
const ajouree = (w, d, opts) => borderFrame("BP27-100", 1, 0.05, w, d, opts);

/** Chemin de pas japonais, espacés de 60 cm d'axe en axe — la longueur d'un pas. */
function stepping(ref, fromZ, toZ, x = 0) {
  /** @type {PresetItem[]} */
  const items = [];
  for (let z = fromZ; z <= toZ + 1e-6; z += 0.6) items.push({ ref, x, z: +z.toFixed(2) });
  return items;
}

/** @type {Preset[]} */
export const PRESETS = [
  {
    id: "jardin-structure",
    label: "Le jardin structuré",
    description:
      "Un grand rectangle de bordures dessine le jardin au cordeau. À l'intérieur, une terrasse de dalles claires, quatre oliviers en bacs montant la garde et deux colonnes en fond de perspective. Rien ne dépasse, tout respire.",
    ground: "pelouse",
    paving: "DAL50R",
    pavingArea: { width: 6, depth: 4 },
    items: [
      ...ajouree(14, 10),
      { ref: "C400", x: -2.4, z: -3.6, finish: "blanc" },
      { ref: "C400", x: 2.4, z: -3.6, finish: "blanc" },
      { ref: "BS225", x: -4.6, z: -1.6, finish: "blanc", species: "olivier" },
      { ref: "BS225", x: 4.6, z: -1.6, finish: "blanc", species: "olivier" },
      { ref: "BS225", x: -4.6, z: 1.6, finish: "blanc", species: "olivier" },
      { ref: "BS225", x: 4.6, z: 1.6, finish: "blanc", species: "olivier" },
      { ref: "B40", x: -2.4, z: 3.4, finish: "blanc", species: "buis" },
      { ref: "B40", x: 0, z: 3.4, finish: "blanc", species: "buis" },
      { ref: "B40", x: 2.4, z: 3.4, finish: "blanc", species: "buis" },
    ],
  },
  {
    id: "terrasse-contemporaine",
    label: "La terrasse contemporaine",
    description:
      "Des lignes nettes, une table de pierre grise et de grands bacs à lames qui ferment l'espace sans l'enfermer. Les bordures basses tiennent le gravier au cordeau. Une terrasse qui se passe de décor : la matière suffit.",
    ground: "gravier",
    paving: "DALBOIS",
    pavingArea: { width: 8, depth: 6 },
    items: [
      ...basse(11, 8),
      { ref: "TABLE", x: 0, z: 0, finish: "gris" },
      { ref: "BANCSIMPLE", x: 0, z: 1.3, finish: "gris" },
      { ref: "BANCSIMPLE", x: 0, z: -1.3, rotation: Math.PI, finish: "gris" },
      { ref: "TABOURET", x: 1.6, z: 0, rotation: T, finish: "gris" },
      { ref: "TABOURET", x: -1.6, z: 0, rotation: T, finish: "gris" },
      { ref: "B105", x: -3.4, z: -2.2, finish: "gris", species: "graminee" },
      { ref: "B105", x: 3.4, z: -2.2, finish: "gris", species: "graminee" },
      { ref: "B105", x: -3.4, z: 2.2, finish: "gris", species: "dodonaea" },
      { ref: "B105", x: 3.4, z: 2.2, finish: "gris", species: "dodonaea" },
    ],
    props: [{ ref: "SIM:homme", x: 2.6, z: 1.8 }],
  },
  {
    id: "entree-prestige",
    label: "L'entrée de villa",
    description:
      "Deux paires de colonnes portant des vasques encadrent l'allée dallée. De part et d'autre, une file de bacs de buis taillés donne la cadence jusqu'au perron. L'arrivée se fait au pas, et cela se voit.",
    ground: "dallage",
    building: "villa",
    buildingZ: -9.5,
    paving: "DALHUIT",
    pavingArea: { width: 3.2, depth: 12, z: 1 },
    items: [
      { ref: "C400", x: -2, z: -4, finish: "blanc" },
      { ref: "C400", x: 2, z: -4, finish: "blanc" },
      { ref: "C300", x: -2, z: -1.4, finish: "blanc" },
      { ref: "C300", x: 2, z: -1.4, finish: "blanc" },
      { ref: "B366", x: -2.9, z: 1, finish: "blanc", species: "buis" },
      { ref: "B366", x: 2.9, z: 1, finish: "blanc", species: "buis" },
      { ref: "B366", x: -2.9, z: 2.6, finish: "blanc", species: "buis" },
      { ref: "B366", x: 2.9, z: 2.6, finish: "blanc", species: "buis" },
      { ref: "B366", x: -2.9, z: 4.2, finish: "blanc", species: "buis" },
      { ref: "B366", x: 2.9, z: 4.2, finish: "blanc", species: "buis" },
      { ref: "F86", x: -4.4, z: -4.6, finish: "blanc" },
      { ref: "F86", x: 4.4, z: -4.6, finish: "blanc" },
      { ref: "V40", x: -3.7, z: -2.7, finish: "blanc" },
      { ref: "V40", x: 3.7, z: -2.7, finish: "blanc" },
      { ref: "V40", x: -3.7, z: 3.4, finish: "blanc" },
      { ref: "V40", x: 3.7, z: 3.4, finish: "blanc" },
    ],
  },
  {
    id: "coin-detente",
    label: "Le coin d'ombre",
    description:
      "Un parasol, deux cafés qui refroidissent sur la table basse, des pots ronds plantés de succulentes. On s'y assoit sans y penser, et l'après-midi passe. Le genre d'endroit qu'on ne dessine pas : on le laisse arriver.",
    ground: "sable",
    paving: "DALTAPIS",
    pavingArea: { width: 6, depth: 5 },
    items: [
      ...basse(8, 6.5),
      { ref: "BANCSIMPLE", x: -1.7, z: 1.1, rotation: T, finish: "saumon" },
      { ref: "BANCSIMPLE", x: 1.7, z: 1.1, rotation: T, finish: "saumon" },
      { ref: "B800", x: -3, z: -1.6, finish: "saumon", species: "succulente" },
      { ref: "B800", x: 3, z: -1.6, finish: "saumon", species: "succulente" },
      { ref: "B729", x: 0, z: -2.2, finish: "saumon", species: "laurier" },
      { ref: "V23", x: -3.2, z: 2, finish: "saumon" },
      { ref: "V23", x: 3.2, z: 2, finish: "saumon" },
    ],
    props: [
      { ref: "SIM:parasol", x: 0, z: 1.1 },
      { ref: "SIM:basse", x: 0, z: 2.4 },
    ],
  },
  {
    id: "jardin-puits",
    label: "Le jardin de village",
    description:
      "Le puits occupe le centre, comme au fond d'une cour ancienne. Autour, des bacs de géraniums, un chemin de pas japonais dans l'herbe et la niche du chien à l'écart, sous le mur. Une scène tranquille, un peu hors du temps.",
    ground: "pelouse",
    items: [
      { ref: "PUITS", x: 0, z: 0, finish: "blanc" },
      ...stepping("PASPIERRE", 2.4, 4.8),
      { ref: "B105", x: -2.6, z: 1.4, finish: "blanc", species: "geranium" },
      { ref: "B105", x: 2.6, z: 1.4, finish: "blanc", species: "geranium" },
      { ref: "B27", x: -1.6, z: 2.6, finish: "saumon", species: "lavande" },
      { ref: "B27", x: 1.6, z: 2.6, finish: "saumon", species: "lavande" },
      { ref: "C250", x: -2.8, z: -1.8, finish: "blanc" },
      { ref: "C250", x: 2.8, z: -1.8, finish: "blanc" },
      { ref: "DOGHOME", x: 4.4, z: 3.4, rotation: -T / 2, finish: "gris" },
      { ref: "B366", x: -4.4, z: 3.4, finish: "blanc", species: "bonsai" },
    ],
  },
  {
    id: "cour-riad",
    label: "La cour de riad",
    description:
      "Une cour close, pavée de motif tapis, où la fontaine centrale donne le ton. Les jets muraux se répondent d'un mur à l'autre, les palmiers nains marquent les angles. On y entre et le bruit de la rue s'arrête.",
    ground: "sable",
    paving: "DALTAPIS",
    pavingArea: { width: 12, depth: 12 },
    items: [
      { ref: "F21", x: 0, z: 0, finish: "blanc" },
      { ref: "F100", x: -4.4, z: -5.2, finish: "blanc" },
      { ref: "F100", x: 4.4, z: -5.2, finish: "blanc" },
      { ref: "B800", x: -4.6, z: -2.4, finish: "saumon", species: "palmier" },
      { ref: "B800", x: 4.6, z: -2.4, finish: "saumon", species: "palmier" },
      { ref: "B800", x: -4.6, z: 2.4, finish: "saumon", species: "yucca" },
      { ref: "B800", x: 4.6, z: 2.4, finish: "saumon", species: "yucca" },
      { ref: "BANCSIMPLE", x: -2.6, z: 5, finish: "blanc" },
      { ref: "BANCSIMPLE", x: 2.6, z: 5, finish: "blanc" },
      { ref: "B27", x: 0, z: 5, finish: "saumon", species: "geranium" },
      { ref: "V50", x: -4.6, z: 5.2, finish: "blanc", species: "geranium" },
      { ref: "V50", x: 4.6, z: 5.2, finish: "blanc", species: "geranium" },
    ],
  },
  {
    id: "villa-piscine",
    label: "La villa et son bassin",
    description:
      "Le bassin s'étire devant la villa, bordé de margelles claires. Les oliviers en bacs tiennent la ligne des baies, les bancs regardent l'eau, et un chemin de pierre file vers la fontaine du fond. Un jardin de bord de mer, sans la mer.",
    ground: "dallage",
    building: "villa",
    buildingZ: -8.5,
    paving: "DAL50R",
    pavingArea: { width: 16, depth: 10, z: 0 },
    pool: { width: 9, depth: 4.5, z: 1.5 },
    items: [
      { ref: "BS225", x: -5.2, z: -2.2, finish: "blanc", species: "olivier" },
      { ref: "BS225", x: 5.2, z: -2.2, finish: "blanc", species: "olivier" },
      { ref: "B800", x: -2.4, z: -2.2, finish: "blanc", species: "palmier" },
      { ref: "B800", x: 2.4, z: -2.2, finish: "blanc", species: "palmier" },
      { ref: "BANCSIMPLE", x: -3.2, z: 5.4, finish: "blanc" },
      { ref: "BANCSIMPLE", x: 3.2, z: 5.4, finish: "blanc" },
      ...stepping("PASPIERRE", 6.6, 8.4),
      { ref: "F22", x: 0, z: 10.5, finish: "blanc" },
    ],
  },
  {
    id: "villa-piscine-detente",
    label: "Le bassin et la table",
    description:
      "La même villa, côté vivre, à l'heure où l'on sort dîner : le barbecue adossé au mur, la table dressée à l'écart des projections, les jets muraux en fond de terrasse. Deux grandes veilleuses à treillis posent leur damier de lumière sur le dallage, et les graminées ferment le jardin d'un rideau léger.",
    nuit: true,
    ground: "sable",
    building: "villa",
    buildingZ: -8.5,
    pool: { width: 8, depth: 4, z: 2 },
    items: [
      { ref: "BARBACUE3", x: -5.6, z: -2, rotation: T, finish: "gris" },
      { ref: "TABLE", x: 4.6, z: -1.6, finish: "blanc" },
      { ref: "TABOURET", x: 4.6, z: -0.2, finish: "blanc" },
      { ref: "TABOURET", x: 4.6, z: -3, finish: "blanc" },
      { ref: "BANCSIMPLE", x: 6.4, z: -1.6, rotation: T, finish: "blanc" },
      { ref: "F86", x: -1.8, z: -3.6, finish: "blanc" },
      { ref: "F86", x: 1.8, z: -3.6, finish: "blanc" },
      { ref: "B729", x: -4, z: 6, finish: "saumon", species: "graminee" },
      { ref: "B729", x: -1.4, z: 6, finish: "saumon", species: "graminee" },
      { ref: "B729", x: 3.4, z: 6, finish: "saumon", species: "graminee" },
      { ref: "V90", x: -5.2, z: 4.6, finish: "blanc" },
      { ref: "V90", x: 5.2, z: 4.6, finish: "blanc" },
    ],
    props: [{ ref: "SIM:homme", x: -3.6, z: -1.2 }],
  },
  {
    id: "maison-jardin",
    label: "La maison et son clos",
    description:
      "Une maison de plain-pied, son allée de pierres posées dans l'herbe, et un jardin ceinturé de piquets grillagés. Le puits d'un côté, le barbecue de l'autre, la niche au soleil du matin. Un jardin de famille, simplement.",
    ground: "pelouse",
    building: "maison",
    buildingZ: -3.5,
    items: [
      ...fencePosts("PQ200", 16, 14, 1.6),
      ...stepping("PASPIERRE", 1.2, 3.6),
      { ref: "B40", x: -1.6, z: 1.2, finish: "blanc", species: "buis" },
      { ref: "B40", x: 1.6, z: 1.2, finish: "blanc", species: "buis" },
      { ref: "B105", x: -4.2, z: -0.6, finish: "blanc", species: "geranium" },
      { ref: "B105", x: 4.2, z: -0.6, finish: "blanc", species: "geranium" },
      { ref: "PUITS", x: -4.6, z: 4.4, finish: "blanc" },
      { ref: "DOGHOME", x: 4.8, z: 4.6, rotation: -T / 2, finish: "gris" },
      { ref: "BARBACUE1", x: 0, z: 5.6, finish: "gris" },
      { ref: "B366", x: -2.4, z: 5.6, finish: "blanc", species: "lavande" },
      { ref: "B366", x: 2.4, z: 5.6, finish: "blanc", species: "lavande" },
    ],
  },
  {
    id: "terrain-cloture",
    label: "Le potager délimité",
    description:
      "Une parcelle de terre franche, ceinturée de piquets et de leur grillage. Les bacs attendent les plants, la vasque sert d'appoint. C'est le premier geste d'un jardin : poser la limite avant de remplir l'espace.",
    plot: { width: 8, depth: 6 },
    items: [
      ...fencePosts("PQ200", 8, 6, 1.6),
      { ref: "B105", x: -1.8, z: -1, finish: "blanc", species: "graminee" },
      { ref: "B105", x: 1.8, z: -1, finish: "blanc", species: "graminee" },
      { ref: "B27", x: -1.4, z: 1.2, finish: "saumon", species: "lavande" },
      { ref: "B27", x: 1.4, z: 1.2, finish: "saumon", species: "lavande" },
      { ref: "C250", x: 0, z: -1.8, finish: "blanc" },
    ],
  },
  {
    id: "terrasse-repas",
    label: "La table sous les oliviers",
    description:
      "Une table de pierre, ses bancs et ses tabourets, posés sous deux grands bacs d'oliviers qui tiennent lieu d'ombrage. Les bordures ajourées dessinent le contour de la terrasse. On y déjeune longtemps.",
    ground: "gravier",
    items: [
      ...ajouree(9, 7),
      { ref: "TABLE", x: 0, z: 0, finish: "gris" },
      { ref: "BANCSIMPLE", x: 0, z: 1.3, finish: "gris" },
      { ref: "BANCSIMPLE", x: 0, z: -1.3, rotation: Math.PI, finish: "gris" },
      { ref: "TABOURET", x: 1.6, z: 0, rotation: T, finish: "gris" },
      { ref: "TABOURET", x: -1.6, z: 0, rotation: T, finish: "gris" },
      { ref: "BS225", x: -2.8, z: -2.4, finish: "blanc", species: "olivier" },
      { ref: "BS225", x: 2.8, z: -2.4, finish: "blanc", species: "olivier" },
      { ref: "V23", x: -3.8, z: 0, finish: "blanc" },
      { ref: "V23", x: 3.8, z: 0, finish: "blanc" },
    ],
    props: [
      { ref: "SIM:homme", x: 2.6, z: 2.2 },
      { ref: "SIM:basse", x: -2.8, z: 2.2 },
    ],
  },
  {
    id: "patio-mediterraneen",
    label: "Le patio méditerranéen",
    description:
      "Peu de pièces, bien placées : des pots ronds groupés, un banc à dossier contre le mur, un palmier nain qui monte dans l'angle. Le blanc et le rouge terre se répondent. Un patio qui tient dans quelques mètres carrés.",
    ground: "sable",
    paving: "DALBRIQUE",
    pavingArea: { width: 6, depth: 6 },
    items: [
      { ref: "B136", x: 0, z: -2.2, finish: "saumon" },
      { ref: "B800", x: -1.9, z: 0, finish: "rouge-clair", species: "succulente" },
      { ref: "B729", x: 0, z: 0.4, finish: "saumon", species: "graminee" },
      { ref: "B800", x: 1.9, z: 0, finish: "rouge-clair", species: "succulente" },
      { ref: "B366", x: 0, z: 2.4, finish: "blanc", species: "palmier" },
      { ref: "B27", x: -1.9, z: 2.4, finish: "blanc", species: "bonsai" },
      { ref: "B27", x: 1.9, z: 2.4, finish: "blanc", species: "bonsai" },
    ],
  },
  {
    id: "allee-crepuscule",
    label: "L'allée au crépuscule",
    description:
      "La nuit tombée, l'allée ne disparaît pas : elle se redessine. Les lanternes hautes jalonnent les deux bords à intervalle régulier, les grandes veilleuses à treillis marquent l'entrée, et les bacs de lavande gardent leur parfum dans le noir. On rentre chez soi guidé par la pierre.",
    ground: "pelouse",
    building: "villa",
    buildingZ: -10.5,
    paving: "DALHUIT",
    pavingArea: { width: 3, depth: 13, z: 1 },
    nuit: true,
    items: [
      // Les lanternes se répondent de part et d'autre, tous les 2,60 m : assez
      // rapprochées pour que les halos se touchent, assez espacées pour qu'on
      // lise encore la longueur de l'allée.
      { ref: "V40", x: -2.2, z: -4.8, finish: "blanc" },
      { ref: "V40", x: 2.2, z: -4.8, finish: "blanc" },
      { ref: "V40", x: -2.2, z: -2.2, finish: "blanc" },
      { ref: "V40", x: 2.2, z: -2.2, finish: "blanc" },
      { ref: "V40", x: -2.2, z: 0.4, finish: "blanc" },
      { ref: "V40", x: 2.2, z: 0.4, finish: "blanc" },
      { ref: "V40", x: -2.2, z: 3, finish: "blanc" },
      { ref: "V40", x: 2.2, z: 3, finish: "blanc" },
      // L'entrée, gardée par les deux grandes.
      { ref: "V90", x: -2.2, z: 6, finish: "blanc" },
      { ref: "V90", x: 2.2, z: 6, finish: "blanc" },
      { ref: "B27", x: -3.4, z: -3.5, finish: "blanc", species: "lavande" },
      { ref: "B27", x: 3.4, z: -3.5, finish: "blanc", species: "lavande" },
      { ref: "B27", x: -3.4, z: 1.7, finish: "blanc", species: "lavande" },
      { ref: "B27", x: 3.4, z: 1.7, finish: "blanc", species: "lavande" },
      { ref: "BS225", x: -3.6, z: 4.6, finish: "blanc", species: "olivier" },
      { ref: "BS225", x: 3.6, z: 4.6, finish: "blanc", species: "olivier" },
    ],
    props: [{ ref: "SIM:homme", x: 0, z: 4.2 }],
  },
];
