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
  { id: "palmier", label: "Palmier nain", height: 0.7, spread: 0.55 },
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

const BUILDERS = {
  geranium: buildGeranium,
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

  const box = new THREE.Box3().setFromObject(found);
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

  const placed = [];
  const attempts = target * 40;
  for (let i = 0; i < attempts && placed.length < target; i++) {
    const x = soil.center.x + (r() * 2 - 1) * marginX;
    const z = soil.center.z + (r() * 2 - 1) * marginZ;
    // Rejet : deux touffes ne doivent pas se chevaucher.
    if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < radius * 1.7)) continue;
    placed.push({ x, z });
  }
  // Un bac très étroit n'accueille qu'un sujet, centré.
  if (placed.length === 0) placed.push({ x: soil.center.x, z: soil.center.z });

  placed.forEach((p, i) => {
    // La variation de taille ne doit jamais repousser la touffe hors du bord,
    // d'où le plafond à `size`.
    const jitter = size * (0.85 + r() * 0.15);
    const plant = buildPlant(THREE, { species, size: jitter, seed: seed + i * 977 });
    plant.position.set(p.x, soil.top, p.z);
    plant.rotation.y = r() * Math.PI * 2;
    plantation.add(plant);
  });

  plantation.userData.count = plantation.children.length;
  return plantation;
}
