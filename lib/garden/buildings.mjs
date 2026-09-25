// Bâtiments procéduraux servant de décor à la scène : ils donnent l'échelle
// et le contexte qui manquent pour juger un aménagement.
//
// Toutes les cotes sont en mètres et respectent des proportions réelles :
// 2,60 m sous plafond, portes de 2,10 m, garde-corps à 1 m, marches de 17 cm.
// C'est cette échelle qui permet de juger si un bac de 80 cm est à sa place
// contre une façade.

import * as THREE from "three";

/** @typedef {"aucune" | "maison" | "villa"} BuildingKind */

const MATS = {
  mur: new THREE.MeshStandardMaterial({ color: 0xf2ece2, roughness: 0.95 }),
  murOmbre: new THREE.MeshStandardMaterial({ color: 0xe4dccf, roughness: 0.95 }),
  toit: new THREE.MeshStandardMaterial({ color: 0xb4633c, roughness: 0.9 }),
  pierre: new THREE.MeshStandardMaterial({ color: 0xded6c7, roughness: 0.9 }),
  bois: new THREE.MeshStandardMaterial({ color: 0x6b4b32, roughness: 0.8 }),
  vitre: new THREE.MeshStandardMaterial({
    color: 0x6f9bb5,
    roughness: 0.08,
    metalness: 0.5,
    transparent: true,
    opacity: 0.55,
  }),
  fer: new THREE.MeshStandardMaterial({ color: 0x3a3a38, roughness: 0.6, metalness: 0.4 }),
};

/**
 * @param {number} w @param {number} h @param {number} d
 * @param {THREE.Material} material
 */
function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Fenêtre posée à plat contre une façade orientée vers +Z. */
function window2D(w, h, x, y, z) {
  const g = new THREE.Group();
  g.add(box(w, h, 0.06, MATS.vitre, x, y, z));
  const frame = 0.07;
  g.add(box(w + frame * 2, frame, 0.1, MATS.mur, x, y - frame, z));
  g.add(box(w + frame * 2, frame, 0.1, MATS.mur, x, y + h, z));
  g.add(box(frame, h + frame * 2, 0.1, MATS.mur, x - w / 2 - frame / 2, y - frame, z));
  g.add(box(frame, h + frame * 2, 0.1, MATS.mur, x + w / 2 + frame / 2, y - frame, z));
  return g;
}

function steps(width, count, z) {
  const g = new THREE.Group();
  const rise = 0.17;
  const run = 0.3;
  for (let i = 0; i < count; i++) {
    g.add(box(width, rise, run * (count - i), MATS.pierre, 0, i * rise, z + (run * (count - i)) / 2));
  }
  return g;
}

/**
 * Maison de plain-pied à toit à deux pentes : 9 × 7 m, 2,80 m au mur,
 * faîtage à 4,60 m. La façade d'entrée regarde vers +Z.
 */
function buildMaison() {
  const g = new THREE.Group();
  const W = 9;
  const D = 7;
  const H = 2.8;

  g.add(box(W, H, D, MATS.mur, 0, 0, 0));
  // Soubassement en pierre, qui ancre la maison au sol.
  g.add(box(W + 0.12, 0.35, D + 0.12, MATS.pierre, 0, 0, 0));

  // Toiture à deux pentes : deux rampants inclinés et deux pignons.
  const slope = 1.8;
  const run = D / 2;
  const angle = Math.atan2(slope, run);
  const length = Math.hypot(slope, run);
  for (const side of [-1, 1]) {
    const pan = box(W + 0.5, 0.16, length, MATS.toit, 0, 0, 0);
    pan.position.set(0, H + slope / 2, (side * run) / 2);
    // Le pan descend du faîtage (z = 0) vers l'égout (|z| = run). Le signe
    // compte : inversé, la toiture se retourne et l'égout monte plus haut
    // que le faîte.
    pan.rotation.x = side * angle;
    pan.name = `toit-pan-${side > 0 ? "sud" : "nord"}`;
    pan.userData.slopeLength = length;
    g.add(pan);
  }
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-D / 2, 0);
  gableShape.lineTo(D / 2, 0);
  gableShape.lineTo(0, slope);
  gableShape.closePath();
  for (const side of [-1, 1]) {
    const gable = new THREE.Mesh(
      new THREE.ExtrudeGeometry(gableShape, { depth: 0.2, bevelEnabled: false }),
      MATS.mur
    );
    gable.rotation.y = Math.PI / 2;
    gable.position.set((side * W) / 2 + side * 0.1, H, 0);
    gable.castShadow = true;
    g.add(gable);
  }

  // Façade : porte centrale, deux fenêtres, marches.
  const front = D / 2 + 0.03;
  g.add(box(1.1, 2.1, 0.08, MATS.bois, 0, 0.35, front));
  g.add(window2D(1.3, 1.3, -2.8, 1.25, front));
  g.add(window2D(1.3, 1.3, 2.8, 1.25, front));
  g.add(steps(1.8, 2, front));

  // Pignons : une fenêtre de chaque côté, pour que la maison vive sous tous
  // les angles de la caméra.
  for (const side of [-1, 1]) {
    const w = window2D(1.2, 1.2, 0, 1.3, 0);
    w.rotation.y = (side * Math.PI) / 2;
    w.position.x = (side * W) / 2 + side * 0.03;
    g.add(w);
  }

  g.name = "maison";
  return g;
}

/**
 * Villa contemporaine à étage : 14 × 9 m, toit-terrasse avec acrotère,
 * grandes baies, auvent d'entrée sur poteaux et balcon à l'étage.
 */
function buildVilla() {
  const g = new THREE.Group();
  const W = 14;
  const D = 9;
  const FLOOR = 3.1;

  g.add(box(W, FLOOR, D, MATS.mur, 0, 0, 0));
  // L'étage est en retrait côté façade : c'est ce décrochement qui donne le
  // balcon, et qui évite le bloc monolithique.
  const upperD = D - 2.2;
  g.add(box(W, FLOOR, upperD, MATS.murOmbre, 0, FLOOR, -1.1));
  g.add(box(W + 0.16, 0.3, D + 0.16, MATS.pierre, 0, 0, 0));

  // Acrotère du toit-terrasse.
  g.add(box(W + 0.2, 0.55, upperD + 0.2, MATS.mur, 0, FLOOR * 2, -1.1));
  g.add(box(W + 0.2, 0.5, 0.2, MATS.mur, 0, FLOOR * 2, upperD / 2 - 1.1));

  const front = D / 2 + 0.03;

  // Rez-de-chaussée : grande baie vitrée, entrée vitrée, baie latérale.
  g.add(window2D(4.4, 2.3, -3.6, 0.55, front));
  g.add(box(1.6, 2.4, 0.1, MATS.vitre, 2.2, 0.35, front));
  g.add(window2D(2.2, 2.3, 5.2, 0.55, front));
  g.add(steps(3, 2, front));

  // Auvent d'entrée sur deux poteaux.
  g.add(box(5.4, 0.22, 2.4, MATS.mur, 2.2, 2.85, front - 1.2 + 1.2));
  for (const px of [0.1, 4.3]) {
    g.add(box(0.26, 2.85, 0.26, MATS.pierre, px, 0, front + 0.9));
  }

  // Étage : baies et balcon filant avec garde-corps en fer.
  const upperFront = upperD / 2 - 1.1 + 0.03;
  g.add(window2D(3.2, 1.9, -3.8, FLOOR + 0.7, upperFront));
  g.add(window2D(3.2, 1.9, 3.4, FLOOR + 0.7, upperFront));
  const balcony = box(W - 1, 0.18, 2, MATS.pierre, 0, FLOOR - 0.18, upperFront + 1);
  g.add(balcony);
  const rail = 1;
  g.add(box(W - 1, 0.07, 0.07, MATS.fer, 0, FLOOR + rail, upperFront + 2));
  const bars = Math.floor((W - 1) / 0.22);
  for (let i = 0; i <= bars; i++) {
    const x = -(W - 1) / 2 + (i * (W - 1)) / bars;
    g.add(box(0.03, rail, 0.03, MATS.fer, x, FLOOR, upperFront + 2));
  }

  // Pignons : une baie de chaque côté.
  for (const side of [-1, 1]) {
    const w = window2D(2, 1.6, 0, 0.8, 0);
    w.rotation.y = (side * Math.PI) / 2;
    w.position.x = (side * W) / 2 + side * 0.03;
    g.add(w);
  }

  g.name = "villa";
  return g;
}

/** @param {BuildingKind} kind */
export function buildBuilding(kind) {
  if (kind === "maison") return buildMaison();
  if (kind === "villa") return buildVilla();
  return null;
}

/** Profondeur hors tout, pour reculer le bâtiment derrière la scène. */
/** @param {BuildingKind} kind */
export function buildingDepth(kind) {
  return kind === "villa" ? 9 : kind === "maison" ? 7 : 0;
}
