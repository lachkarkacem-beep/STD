// Générateur procédural de végétaux low-poly pour les bacs et pots.
//
// Même convention que planter-builder.js : THREE est injecté, rien n'est
// importé ici, et chaque sujet est un THREE.Group de meshes nommés
// (tige / feuilles / fleurs) pour que les exports GLB restent lisibles.
//
// Les dimensions sont en mètres, Y vers le haut, et chaque plante pousse
// depuis l'origine de son groupe (y = 0 au collet), ce qui permet de la
// poser directement sur la surface de terre d'un bac.

export const PLANT_SPECIES = [
  { id: "geranium", label: "Géranium", height: 0.35, spread: 0.28 },
  { id: "lavande", label: "Lavande", height: 0.45, spread: 0.3 },
  { id: "rosier", label: "Rosier buisson", height: 0.55, spread: 0.35 },
  { id: "buis", label: "Buis boule", height: 0.4, spread: 0.36 },
  { id: "olivier", label: "Olivier", height: 0.9, spread: 0.5 },
  { id: "bonsai", label: "Olivier bonsaï", height: 0.42, spread: 0.38 },
  { id: "palmier", label: "Palmier nain", height: 0.7, spread: 0.55 },
  { id: "yucca", label: "Yucca elephantipes", height: 1.1, spread: 0.5 },
  { id: "dodonaea", label: "Dodonaea", height: 0.85, spread: 0.45 },
  { id: "laurier", label: "Laurier-rose", height: 0.95, spread: 0.5 },
  { id: "succulente", label: "Succulentes", height: 0.18, spread: 0.22 },
  { id: "graminee", label: "Graminées", height: 0.6, spread: 0.3 },
];

export function getSpecies(id) {
  return PLANT_SPECIES.find((s) => s.id === id) ?? null;
}

// Générateur déterministe : une même graine redonne exactement la même plante,
// ce qui rend la scène stable d'un rendu à l'autre et les tests reproductibles.
function rng(seed) {
  let t = (seed >>> 0) || 1;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const MATS = {
  tige: { color: 0x4a6b33, roughness: 0.9 },
  feuilles: { color: 0x5c8a3a, roughness: 0.85 },
  feuillesArgent: { color: 0x8fa37a, roughness: 0.85 },
  feuillesSombre: { color: 0x3f6b2f, roughness: 0.85 },
  fleurs: { color: 0xc0392b, roughness: 0.7 },
  fleursLavande: { color: 0x8e7cc3, roughness: 0.7 },
  tronc: { color: 0x6b5a45, roughness: 0.95 },
};

function mat(THREE, key) {
  const spec = MATS[key];
  const m = new THREE.MeshStandardMaterial({ color: spec.color, roughness: spec.roughness });
  m.name = key.startsWith("feuilles") ? "feuilles" : key === "tronc" ? "tige" : key;
  return m;
}

function mesh(THREE, geometry, material, name) {
  const m = new THREE.Mesh(geometry, material);
  m.name = name;
  m.castShadow = true;
  return m;
}

// --- espèces -------------------------------------------------------------

function buildGeranium(THREE, r, h, w) {
  const g = new THREE.Group();
  const feuilles = mat(THREE, "feuilles");
  const fleurs = mat(THREE, "fleurs");

  // Touffe basse : quelques sphères aplaties qui se chevauchent.
  for (let i = 0; i < 5; i++) {
    const s = new THREE.SphereGeometry(w * (0.3 + r() * 0.15), 6, 4);
    const m = mesh(THREE, s, feuilles, "feuilles");
    m.scale.y = 0.55;
    m.position.set((r() - 0.5) * w * 0.5, h * (0.25 + r() * 0.2), (r() - 0.5) * w * 0.5);
    g.add(m);
  }
  // Ombelles dressées au-dessus du feuillage.
  for (let i = 0; i < 4; i++) {
    const tige = mesh(THREE, new THREE.CylinderGeometry(0.004, 0.004, h * 0.4, 4), mat(THREE, "tige"), "tige");
    const x = (r() - 0.5) * w * 0.4;
    const z = (r() - 0.5) * w * 0.4;
    tige.position.set(x, h * 0.5, z);
    g.add(tige);
    const fleur = mesh(THREE, new THREE.IcosahedronGeometry(w * 0.11, 0), fleurs, "fleurs");
    fleur.scale.y = 0.6;
    fleur.position.set(x, h * 0.72, z);
    g.add(fleur);
  }
  return g;
}

function buildLavande(THREE, r, h, w) {
  const g = new THREE.Group();
  const tige = mat(THREE, "tige");
  const fleurs = mat(THREE, "fleursLavande");
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.4;
    const d = w * 0.18 * Math.sqrt(r());
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const hh = h * (0.7 + r() * 0.3);
    const t = mesh(THREE, new THREE.CylinderGeometry(0.003, 0.004, hh, 3), tige, "tige");
    t.position.set(x, hh / 2, z);
    t.rotation.z = (r() - 0.5) * 0.25;
    g.add(t);
    const epi = mesh(THREE, new THREE.CylinderGeometry(0.012, 0.02, hh * 0.3, 4), fleurs, "fleurs");
    epi.position.set(x, hh * 0.9, z);
    epi.rotation.z = t.rotation.z;
    g.add(epi);
  }
  return g;
}

function buildRosier(THREE, r, h, w) {
  const g = new THREE.Group();
  const feuilles = mat(THREE, "feuillesSombre");
  const fleurs = mat(THREE, "fleurs");
  for (let i = 0; i < 4; i++) {
    const s = mesh(THREE, new THREE.IcosahedronGeometry(w * (0.28 + r() * 0.12), 1), feuilles, "feuilles");
    s.position.set((r() - 0.5) * w * 0.4, h * (0.4 + r() * 0.3), (r() - 0.5) * w * 0.4);
    g.add(s);
  }
  for (let i = 0; i < 6; i++) {
    const f = mesh(THREE, new THREE.IcosahedronGeometry(w * 0.07, 0), fleurs, "fleurs");
    const a = r() * Math.PI * 2;
    f.position.set(Math.cos(a) * w * 0.3, h * (0.45 + r() * 0.45), Math.sin(a) * w * 0.3);
    g.add(f);
  }
  return g;
}

function buildBuis(THREE, r, h, w) {
  const g = new THREE.Group();
  const tronc = mesh(THREE, new THREE.CylinderGeometry(0.02, 0.025, h * 0.22, 5), mat(THREE, "tronc"), "tige");
  tronc.position.y = h * 0.11;
  g.add(tronc);
  const boule = mesh(THREE, new THREE.IcosahedronGeometry(w * 0.48, 1), mat(THREE, "feuillesSombre"), "feuilles");
  boule.position.y = h * 0.22 + w * 0.45;
  g.add(boule);
  return g;
}

function buildOlivier(THREE, r, h, w) {
  const g = new THREE.Group();
  const tronc = mesh(THREE, new THREE.CylinderGeometry(0.03, 0.045, h * 0.45, 6), mat(THREE, "tronc"), "tige");
  tronc.position.y = h * 0.225;
  tronc.rotation.z = (r() - 0.5) * 0.12;
  g.add(tronc);
  const feuilles = mat(THREE, "feuillesArgent");
  for (let i = 0; i < 4; i++) {
    const s = mesh(THREE, new THREE.IcosahedronGeometry(w * (0.26 + r() * 0.12), 1), feuilles, "feuilles");
    s.scale.y = 0.8;
    const a = (i / 4) * Math.PI * 2;
    s.position.set(Math.cos(a) * w * 0.16, h * (0.6 + r() * 0.3), Math.sin(a) * w * 0.16);
    g.add(s);
  }
  return g;
}

function buildPalmier(THREE, r, h, w) {
  const g = new THREE.Group();
  const tronc = mesh(THREE, new THREE.CylinderGeometry(0.035, 0.05, h * 0.35, 6), mat(THREE, "tronc"), "tige");
  tronc.position.y = h * 0.175;
  g.add(tronc);
  const feuilles = mat(THREE, "feuilles");
  const n = 7;
  for (let i = 0; i < n; i++) {
    // Palme : cône très aplati, incliné vers l'extérieur.
    const palme = mesh(THREE, new THREE.ConeGeometry(w * 0.1, w * 0.62, 3), feuilles, "feuilles");
    palme.scale.set(1, 1, 0.18);
    const a = (i / n) * Math.PI * 2 + r() * 0.3;
    palme.position.set(0, h * 0.4, 0);
    palme.rotation.set(Math.PI / 2.4, a, 0, "YXZ");
    palme.translateOnAxis(new THREE.Vector3(0, 1, 0), w * 0.24);
    g.add(palme);
  }
  return g;
}

function buildSucculente(THREE, r, h, w) {
  const g = new THREE.Group();
  const feuilles = mat(THREE, "feuillesArgent");
  const n = 9;
  for (let i = 0; i < n; i++) {
    const f = mesh(THREE, new THREE.ConeGeometry(w * 0.09, h * 0.9, 4), feuilles, "feuilles");
    const a = (i / n) * Math.PI * 2;
    f.position.set(Math.cos(a) * w * 0.12, h * 0.4, Math.sin(a) * w * 0.12);
    f.rotation.set(0.7, a, 0, "YXZ");
    g.add(f);
  }
  const coeur = mesh(THREE, new THREE.ConeGeometry(w * 0.07, h * 0.6, 4), feuilles, "feuilles");
  coeur.position.y = h * 0.3;
  g.add(coeur);
  return g;
}

function buildGraminee(THREE, r, h, w) {
  const g = new THREE.Group();
  const feuilles = mat(THREE, "feuilles");
  const n = 18;
  for (let i = 0; i < n; i++) {
    const hh = h * (0.6 + r() * 0.4);
    const brin = mesh(THREE, new THREE.ConeGeometry(0.012, hh, 3), feuilles, "feuilles");
    brin.scale.z = 0.3;
    const a = r() * Math.PI * 2;
    const d = w * 0.16 * Math.sqrt(r());
    brin.position.set(Math.cos(a) * d, hh / 2, Math.sin(a) * d);
    brin.rotation.set((r() - 0.5) * 0.5, a, (r() - 0.5) * 0.5);
    g.add(brin);
  }
  return g;
}

/**
 * Tronc noueux : une pile de segments qui s'affinent en serpentant. C'est ce
 * décalage d'un segment à l'autre qui donne le port tourmenté d'un vieil
 * olivier, qu'un simple cylindre ne rend pas.
 */
function gnarledTrunk(THREE, g, r, height, baseRadius, sway) {
  const material = mat(THREE, "tronc");
  const segments = 5;
  let x = 0;
  let z = 0;
  for (let i = 0; i < segments; i++) {
    const h = height / segments;
    const rb = baseRadius * (1 - i / (segments + 1.5));
    const rt = baseRadius * (1 - (i + 1) / (segments + 1.5));
    const seg = mesh(THREE, new THREE.CylinderGeometry(rt, rb, h * 1.12, 6), material, "tige");
    x += (r() - 0.5) * sway;
    z += (r() - 0.5) * sway;
    seg.position.set(x, h * (i + 0.5), z);
    seg.rotation.set((r() - 0.5) * 0.18, r() * Math.PI, (r() - 0.5) * 0.18);
    g.add(seg);
  }
  return { x, z };
}

/** Olivier bonsaï : tronc noueux court, plateaux de feuillage argenté. */
function buildBonsai(THREE, r, h, w) {
  const g = new THREE.Group();
  const top = gnarledTrunk(THREE, g, r, h * 0.5, w * 0.075, w * 0.06);
  const feuilles = mat(THREE, "feuillesArgent");
  // Trois plateaux étagés, comme une taille en nuages.
  const tiers = [
    { y: h * 0.56, rx: w * 0.3, ry: h * 0.09 },
    { y: h * 0.74, rx: w * 0.22, ry: h * 0.075 },
    { y: h * 0.9, rx: w * 0.14, ry: h * 0.06 },
  ];
  for (const [i, t] of tiers.entries()) {
    const cluster = mesh(THREE, new THREE.IcosahedronGeometry(t.rx, 1), feuilles, "feuilles");
    cluster.scale.y = t.ry / t.rx;
    cluster.position.set(top.x + (r() - 0.5) * w * 0.1, t.y, top.z + (r() - 0.5) * w * 0.1);
    g.add(cluster);
    if (i === 0) {
      const side = mesh(THREE, new THREE.IcosahedronGeometry(t.rx * 0.62, 1), feuilles, "feuilles");
      side.scale.y = 0.5;
      side.position.set(top.x - t.rx * 0.9, t.y - h * 0.04, top.z + (r() - 0.5) * w * 0.1);
      g.add(side);
    }
  }
  return g;
}

/** Yucca elephantipes : troncs étagés coiffés de rosettes de longues feuilles. */
function buildYucca(THREE, r, h, w) {
  const g = new THREE.Group();
  const tronc = mat(THREE, "tronc");
  const feuilles = mat(THREE, "feuilles");

  // Deux ou trois cannes de hauteurs différentes, comme les sujets vendus en bac.
  const cannes = [
    { h: h * 0.62, x: 0, z: 0, s: 1 },
    { h: h * 0.42, x: w * 0.16, z: w * 0.08, s: 0.8 },
    { h: h * 0.26, x: -w * 0.14, z: -w * 0.1, s: 0.66 },
  ];

  for (const canne of cannes) {
    const stipe = mesh(
      THREE,
      new THREE.CylinderGeometry(w * 0.055 * canne.s, w * 0.075 * canne.s, canne.h, 7),
      tronc,
      "tige"
    );
    stipe.position.set(canne.x, canne.h / 2, canne.z);
    g.add(stipe);

    const n = 11;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.3;
      const longueur = w * (0.45 + r() * 0.25) * canne.s;
      const feuille = mesh(THREE, new THREE.ConeGeometry(w * 0.05 * canne.s, longueur, 3), feuilles, "feuilles");
      feuille.scale.z = 0.14;
      feuille.position.set(canne.x, canne.h, canne.z);
      // Les feuilles retombent d'autant plus qu'elles sont basses dans la rosette.
      const tombe = 0.5 + (i / n) * 0.7;
      feuille.rotation.set(tombe, a, 0, "YXZ");
      feuille.translateOnAxis(new THREE.Vector3(0, 1, 0), longueur * 0.42);
      g.add(feuille);
    }
  }
  return g;
}

/** Dodonaea : arbuste dense au feuillage fin, teinté de bronze. */
function buildDodonaea(THREE, r, h, w) {
  const g = new THREE.Group();
  gnarledTrunk(THREE, g, r, h * 0.3, w * 0.05, w * 0.03);
  const bronze = new THREE.MeshStandardMaterial({ color: 0x6f7a3f, roughness: 0.85 });
  bronze.name = "feuilles";

  // Masse dense montée en fuseau : le port dressé caractéristique.
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const rayon = w * (0.3 - t * 0.16) * (0.85 + r() * 0.3);
    const amas = mesh(THREE, new THREE.IcosahedronGeometry(rayon, 1), bronze, "feuilles");
    amas.position.set(
      (r() - 0.5) * w * 0.18,
      h * (0.3 + t * 0.62),
      (r() - 0.5) * w * 0.18
    );
    g.add(amas);
  }
  return g;
}

/** Laurier-rose : buisson souple ponctué de fleurs. */
function buildLaurier(THREE, r, h, w) {
  const g = new THREE.Group();
  const tige = mat(THREE, "tige");
  const feuilles = mat(THREE, "feuillesSombre");
  const fleurs = new THREE.MeshStandardMaterial({ color: 0xdf7f9c, roughness: 0.7 });
  fleurs.name = "fleurs";

  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.5;
    const hauteur = h * (0.6 + r() * 0.4);
    const inclinaison = 0.1 + r() * 0.16;
    const branche = mesh(THREE, new THREE.CylinderGeometry(0.006, 0.012, hauteur, 4), tige, "tige");
    branche.position.set(Math.cos(a) * w * 0.07, hauteur / 2, Math.sin(a) * w * 0.07);
    branche.rotation.set(Math.cos(a) * inclinaison, 0, -Math.sin(a) * inclinaison);
    g.add(branche);

    const sommet = new THREE.Vector3(
      Math.cos(a) * w * (0.07 + hauteur * inclinaison * 0.5),
      hauteur * 0.96,
      Math.sin(a) * w * (0.07 + hauteur * inclinaison * 0.5)
    );
    const amas = mesh(THREE, new THREE.IcosahedronGeometry(w * (0.14 + r() * 0.07), 1), feuilles, "feuilles");
    amas.scale.y = 1.25;
    amas.position.copy(sommet);
    g.add(amas);

    if (i % 2 === 0) {
      const fleur = mesh(THREE, new THREE.IcosahedronGeometry(w * 0.055, 0), fleurs, "fleurs");
      fleur.position.set(sommet.x, sommet.y + w * 0.1, sommet.z);
      g.add(fleur);
    }
  }
  return g;
}

const BUILDERS = {
  geranium: buildGeranium,
  bonsai: buildBonsai,
  yucca: buildYucca,
  dodonaea: buildDodonaea,
  laurier: buildLaurier,
  lavande: buildLavande,
  rosier: buildRosier,
  buis: buildBuis,
  olivier: buildOlivier,
  palmier: buildPalmier,
  succulente: buildSucculente,
  graminee: buildGraminee,
};

/**
 * Construit un sujet isolé. `size` est un facteur appliqué aux dimensions
 * nominales de l'espèce (1 = taille de référence).
 *
 * @param {any} THREE
 * @param {{ species: string, size?: number, seed?: number }} options
 */
export function buildPlant(THREE, { species, size = 1, seed = 1 }) {
  const spec = getSpecies(species);
  if (!spec) throw new Error("Espèce inconnue : " + species);
  const build = BUILDERS[species];
  const r = rng(seed);
  const h = spec.height * size;
  const w = spec.spread * size;
  const g = build(THREE, r, h, w);
  g.name = "plante-" + species;
  g.userData.species = species;
  g.userData.spread = w;
  return g;
}

/**
 * Rayon d'encombrement au sol, mesuré depuis l'origine de la plante. On prend
 * le coin le plus éloigné dans le plan XZ : la valeur reste donc valable quelle
 * que soit la rotation appliquée ensuite au sujet.
 */
export function footprintRadius(THREE, plant) {
  plant.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(plant);
  return Math.max(
    Math.hypot(box.min.x, box.min.z),
    Math.hypot(box.min.x, box.max.z),
    Math.hypot(box.max.x, box.min.z),
    Math.hypot(box.max.x, box.max.z)
  );
}

/**
 * Retrouve la surface de terre d'un bac. Les noms de meshes n'ont pas survécu
 * à l'export GLB, mais les noms de matériaux si : la cavité est la primitive
 * dont le matériau s'appelle « soil ».
 */
export function findSoil(THREE, group) {
  let found = null;
  group.traverse((o) => {
    if (found || !o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some((m) => m && m.name === "soil")) found = o;
  });
  if (!found) return null;

  // La cavité est ramenée dans le repère de `group`, car c'est là que les
  // plants seront accrochés. Mesurer en repère monde ferait subir aux plants
  // le décalage propre du groupe (recentrage du modèle, position dans la
  // scène), et les poserait à côté du bac.
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(found);
  box.applyMatrix4(new THREE.Matrix4().copy(group.matrixWorld).invert());
  return {
    mesh: found,
    box,
    center: box.getCenter(new THREE.Vector3()),
    size: box.getSize(new THREE.Vector3()),
    top: box.max.y,
  };
}

/**
 * Plante 1 à N sujets dans la cavité d'un bac, sans chevauchement et sans
 * dépasser le bord. Renvoie null si le produit n'a pas de cavité.
 *
 * @param {any} THREE
 * @param {any} group
 * @param {{ species: string, seed?: number, density?: number }} options
 */
export function fillPlanter(THREE, group, { species, seed = 1, density = 1 }) {
  const spec = getSpecies(species);
  if (!spec) return null;
  const soil = findSoil(THREE, group);
  if (!soil) return null;

  const r = rng(seed);
  const plantation = new THREE.Group();
  plantation.name = "plantation";
  plantation.userData.species = species;

  // L'emprise réelle du feuillage est mesurée, pas déduite de `spread` : les
  // touffes composées (géranium, buis, olivier) débordent largement leur
  // largeur nominale, et s'y fier faisait sortir des sujets de la terre.
  const halfX = soil.size.x / 2;
  const halfZ = soil.size.z / 2;
  const minHalf = Math.min(halfX, halfZ);
  const unitRadius = footprintRadius(THREE, buildPlant(THREE, { species, size: 1, seed }));

  // Jamais agrandie au-delà de sa taille nominale ; réduite si le bac est étroit.
  const size = Math.min(1, (minHalf * 0.92) / unitRadius);
  const radius = unitRadius * size;

  // Marge au bord : la touffe ne doit pas déborder de la terre.
  const marginX = Math.max(0, halfX - radius);
  const marginZ = Math.max(0, halfZ - radius);

  const target = Math.max(
    1,
    Math.min(9, Math.round(((halfX * halfZ) / (radius * radius * 2.4)) * density))
  );

  // Chaque sujet est construit, puis mesuré, AVANT d'être placé.
  //
  // Deux graines différentes ne donnent pas la même touffe : un géranium peut
  // être d'un tiers plus large que son voisin. Se fier à un rayon nominal
  // commun — et n'exiger qu'une fraction de ce rayon entre deux pieds —
  // laissait les feuillages se rentrer dedans. La distance exigée est
  // désormais la SOMME des deux rayons réellement mesurés.
  const placed = [];
  for (let i = 0; i < target; i++) {
    const graine = seed + i * 977;
    const rayonUnite = footprintRadius(THREE, buildPlant(THREE, { species, size: 1, seed: graine }));
    // Plafonnée par la cavité comme par la taille nominale : la variation ne
    // doit jamais repousser la touffe hors du bord.
    const jitter = Math.min(size, (minHalf * 0.92) / rayonUnite) * (0.85 + r() * 0.15);

    // L'emprise est mesurée sur la touffe réellement construite, et non
    // extrapolée depuis celle de taille 1 : les générateurs mêlent des cotes
    // proportionnelles et des épaisseurs fixes, si bien que le rayon ne suit
    // pas exactement l'échelle. L'écart était petit — et suffisait à faire se
    // toucher deux feuillages.
    const plant = buildPlant(THREE, { species, size: jitter, seed: graine });
    const rayon = footprintRadius(THREE, plant);

    const mx = Math.max(0, halfX - rayon);
    const mz = Math.max(0, halfZ - rayon);

    let pose = null;
    for (let essai = 0; essai < 60 && !pose; essai++) {
      const x = soil.center.x + (r() * 2 - 1) * mx;
      const z = soil.center.z + (r() * 2 - 1) * mz;
      if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < p.rayon + rayon)) continue;
      pose = { x, z };
    }
    // Plus de place : le bac est plein. Mieux vaut un sujet de moins qu'une
    // touffe posée sur sa voisine.
    if (!pose) break;

    placed.push({ x: pose.x, z: pose.z, rayon, plant });
  }

  // Un bac très étroit n'accueille qu'un sujet, centré.
  if (placed.length === 0) {
    placed.push({
      x: soil.center.x,
      z: soil.center.z,
      rayon: radius,
      plant: buildPlant(THREE, { species, size, seed }),
    });
  }

  for (const p of placed) {
    p.plant.position.set(p.x, soil.top, p.z);
    // L'emprise est mesurée au coin le plus éloigné : la rotation ne la change
    // pas, le rejet reste donc valable.
    p.plant.rotation.y = r() * Math.PI * 2;
    plantation.add(p.plant);
  }

  plantation.userData.count = plantation.children.length;
  return plantation;
}
