// Accessoires de simulation : ils ne sont pas au catalogue, ils servent à
// donner l'échelle et à se projeter. Un bac de 80 cm ne dit rien tant qu'on
// n'a pas vu quelqu'un debout à côté.
//
// Les cotes sont celles du mobilier réel : 1,75 m pour une silhouette, plateau
// de table à 75 cm, assise à 45 cm, table basse à 40 cm, parasol à 2,30 m.
// C'est cette justesse qui rend la projection utile plutôt que décorative.

export const PROPS = [
  { id: "SIM:homme", label: "Homme debout", half: { x: 0.25, z: 0.2 }, height: 1.75 },
  { id: "SIM:table", label: "Table à manger et chaises", half: { x: 1.1, z: 0.85 }, height: 0.75 },
  { id: "SIM:basse", label: "Table basse et cafés", half: { x: 0.45, z: 0.35 }, height: 0.4 },
  { id: "SIM:banc", label: "Banc en bois", half: { x: 0.75, z: 0.3 }, height: 0.85 },
  { id: "SIM:parasol", label: "Parasol", half: { x: 1.3, z: 1.3 }, height: 2.3 },
];

export function isProp(ref) {
  return typeof ref === "string" && ref.startsWith("SIM:");
}

export function propInfo(ref) {
  return PROPS.find((p) => p.id === ref) ?? null;
}

const COLORS = {
  bois: 0x8a6033,
  boisClair: 0xb08a5a,
  metal: 0x3f4440,
  toile: 0xe8e2d4,
  peau: 0xd9b28c,
  vetement: 0x4a5c6a,
  cafe: 0x4a2c1a,
  porcelaine: 0xf4f1ea,
};

function material(THREE, key, extra = {}) {
  return new THREE.MeshStandardMaterial({ color: COLORS[key], roughness: 0.75, ...extra });
}

function box(THREE, w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(THREE, rt, rb, h, mat, x, y, z, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  return m;
}

/** Silhouette humaine de 1,75 m : la référence d'échelle la plus parlante. */
function buildHomme(THREE) {
  const g = new THREE.Group();
  const peau = material(THREE, "peau");
  const tissu = material(THREE, "vetement");

  g.add(cyl(THREE, 0.055, 0.065, 0.82, tissu, -0.09, 0, 0, 8)); // jambe gauche
  g.add(cyl(THREE, 0.055, 0.065, 0.82, tissu, 0.09, 0, 0, 8)); // jambe droite
  g.add(box(THREE, 0.38, 0.58, 0.21, tissu, 0, 0.82, 0)); // buste
  g.add(cyl(THREE, 0.045, 0.045, 0.56, tissu, -0.23, 0.82, 0, 8)); // bras gauche
  g.add(cyl(THREE, 0.045, 0.045, 0.56, tissu, 0.23, 0.82, 0, 8)); // bras droit
  g.add(cyl(THREE, 0.055, 0.055, 0.1, peau, 0, 1.4, 0, 8)); // cou
  const tete = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 10), peau);
  tete.position.set(0, 1.58, 0);
  tete.castShadow = true;
  g.add(tete);
  return g;
}

/** Table à manger 160 × 90 à 75 cm, et quatre chaises. */
function buildTable(THREE) {
  const g = new THREE.Group();
  const bois = material(THREE, "bois");
  const clair = material(THREE, "boisClair");

  g.add(box(THREE, 1.6, 0.045, 0.9, clair, 0, 0.705, 0)); // plateau
  for (const [x, z] of [
    [-0.72, -0.38],
    [0.72, -0.38],
    [-0.72, 0.38],
    [0.72, 0.38],
  ]) {
    g.add(box(THREE, 0.07, 0.705, 0.07, bois, x, 0, z));
  }

  // Chaises : assise à 45 cm, dossier à 85 cm.
  const chaise = (x, z, rotation) => {
    const c = new THREE.Group();
    c.add(box(THREE, 0.42, 0.04, 0.42, clair, 0, 0.45, 0));
    for (const [px, pz] of [
      [-0.17, -0.17],
      [0.17, -0.17],
      [-0.17, 0.17],
      [0.17, 0.17],
    ]) {
      c.add(box(THREE, 0.04, 0.45, 0.04, bois, px, 0, pz));
    }
    c.add(box(THREE, 0.42, 0.4, 0.04, clair, 0, 0.49, -0.19));
    c.position.set(x, 0, z);
    c.rotation.y = rotation;
    return c;
  };
  g.add(chaise(-0.45, 0.78, Math.PI));
  g.add(chaise(0.45, 0.78, Math.PI));
  g.add(chaise(-0.45, -0.78, 0));
  g.add(chaise(0.45, -0.78, 0));
  return g;
}

/** Table basse à 40 cm, deux tasses et leurs soucoupes. */
function buildTableBasse(THREE) {
  const g = new THREE.Group();
  const bois = material(THREE, "bois");
  const clair = material(THREE, "boisClair");
  const porcelaine = material(THREE, "porcelaine", { roughness: 0.25 });
  const cafe = material(THREE, "cafe", { roughness: 0.2 });

  g.add(box(THREE, 0.8, 0.04, 0.5, clair, 0, 0.36, 0));
  for (const [x, z] of [
    [-0.34, -0.19],
    [0.34, -0.19],
    [-0.34, 0.19],
    [0.34, 0.19],
  ]) {
    g.add(box(THREE, 0.05, 0.36, 0.05, bois, x, 0, z));
  }

  for (const x of [-0.16, 0.16]) {
    g.add(cyl(THREE, 0.07, 0.07, 0.008, porcelaine, x, 0.4, 0)); // soucoupe
    g.add(cyl(THREE, 0.038, 0.032, 0.055, porcelaine, x, 0.408, 0)); // tasse
    g.add(cyl(THREE, 0.032, 0.032, 0.004, cafe, x, 0.452, 0)); // café
  }
  return g;
}

/** Banc en bois de 1,50 m, assise à 45 cm. */
function buildBanc(THREE) {
  const g = new THREE.Group();
  const bois = material(THREE, "bois");
  const clair = material(THREE, "boisClair");
  const metal = material(THREE, "metal", { metalness: 0.5, roughness: 0.5 });

  for (let i = 0; i < 3; i++) {
    g.add(box(THREE, 1.5, 0.035, 0.13, clair, 0, 0.45, -0.15 + i * 0.15));
  }
  for (let i = 0; i < 3; i++) {
    g.add(box(THREE, 1.5, 0.11, 0.03, clair, 0, 0.55 + i * 0.13, -0.24));
  }
  for (const x of [-0.62, 0.62]) {
    g.add(box(THREE, 0.06, 0.45, 0.06, metal, x, 0, -0.18));
    g.add(box(THREE, 0.06, 0.45, 0.06, metal, x, 0, 0.18));
    g.add(box(THREE, 0.05, 0.42, 0.05, metal, x, 0.45, -0.24));
  }
  g.add(box(THREE, 1.4, 0.03, 0.04, bois, 0, 0.2, 0));
  return g;
}

/** Parasol de 2,60 m d'envergure, mât à 2,30 m. */
function buildParasol(THREE) {
  const g = new THREE.Group();
  const bois = material(THREE, "bois");
  const toile = material(THREE, "toile", { side: THREE.DoubleSide });
  const metal = material(THREE, "metal", { metalness: 0.4 });

  g.add(cyl(THREE, 0.035, 0.04, 2.15, bois, 0, 0, 0, 10));
  // Socle : sans lui, le parasol paraît planté dans le vide.
  g.add(cyl(THREE, 0.24, 0.28, 0.09, metal, 0, 0, 0, 14));

  const nappe = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.42, 8, 1, true), toile);
  nappe.position.y = 2.15 + 0.21;
  nappe.castShadow = true;
  g.add(nappe);
  // Baleines visibles sous la toile.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const baleine = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.012, 0.012), bois);
    baleine.position.set(Math.cos(a) * 0.64, 2.16, Math.sin(a) * 0.64);
    baleine.rotation.y = -a;
    baleine.rotation.z = 0.16;
    g.add(baleine);
  }
  g.add(cyl(THREE, 0.03, 0.03, 0.14, bois, 0, 2.5, 0, 8));
  return g;
}

const BUILDERS = {
  "SIM:homme": buildHomme,
  "SIM:table": buildTable,
  "SIM:basse": buildTableBasse,
  "SIM:banc": buildBanc,
  "SIM:parasol": buildParasol,
};

/** @param {any} THREE @param {string} ref */
export function buildProp(THREE, ref) {
  const build = BUILDERS[ref];
  if (!build) return null;
  const group = build(THREE);
  group.name = ref;
  return group;
}
