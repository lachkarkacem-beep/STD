// Harnais de vérification sans WebGL : il lit les GLB réellement livrés et
// contrôle les invariants du catalogue et de la plantation.
//
//   npm run check
//
// design-reference/check.html reste le harnais historique de la chaîne
// procédurale, qui n'est plus celle qui alimente le site.

import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { fillPlanter, PLANT_SPECIES } from "../public/3d/plants-builder.js";

const ROOT = path.join(import.meta.dirname, "..");
const GLB_DIR = path.join(ROOT, "public/models_web/glb");

const db = JSON.parse(fs.readFileSync(path.join(ROOT, "public/3d/products/products.json"), "utf8"));
const index = JSON.parse(fs.readFileSync(path.join(ROOT, "public/models_web/models.json"), "utf8"));

let pass = 0;
let fail = 0;
const ok = (cond, label, detail = "") => {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.log(`  ECHEC  ${label}${detail ? " — " + detail : ""}`);
  }
};

// --- lecture GLB ---------------------------------------------------------

function readGlb(file) {
  const buf = fs.readFileSync(file);
  const jsonLength = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLength).toString("utf8"));
  return json;
}

// Boîte englobante monde d'une primitive, à partir des min/max de l'accesseur
// de positions et de la chaîne de transformations des nœuds.
function primitiveWorldBox(json, materialName) {
  const matIndex = (json.materials ?? []).findIndex((m) => m.name === materialName);
  if (matIndex < 0) return null;

  const parentOf = new Map();
  (json.nodes ?? []).forEach((node, i) => {
    for (const child of node.children ?? []) parentOf.set(child, i);
  });

  const worldMatrix = (nodeIndex) => {
    const chain = [];
    let cur = nodeIndex;
    while (cur !== undefined) {
      chain.unshift(cur);
      cur = parentOf.get(cur);
    }
    const m = new THREE.Matrix4();
    for (const i of chain) {
      const n = json.nodes[i];
      const local = new THREE.Matrix4();
      if (n.matrix) local.fromArray(n.matrix);
      else
        local.compose(
          new THREE.Vector3().fromArray(n.translation ?? [0, 0, 0]),
          new THREE.Quaternion().fromArray(n.rotation ?? [0, 0, 0, 1]),
          new THREE.Vector3().fromArray(n.scale ?? [1, 1, 1])
        );
      m.multiply(local);
    }
    return m;
  };

  const box = new THREE.Box3();
  let found = false;
  (json.nodes ?? []).forEach((node, nodeIndex) => {
    if (node.mesh === undefined) return;
    for (const prim of json.meshes[node.mesh].primitives ?? []) {
      if (prim.material !== matIndex) continue;
      const acc = json.accessors[prim.attributes.POSITION];
      if (!acc?.min || !acc?.max) continue;
      const local = new THREE.Box3(
        new THREE.Vector3().fromArray(acc.min),
        new THREE.Vector3().fromArray(acc.max)
      );
      box.union(local.applyMatrix4(worldMatrix(nodeIndex)));
      found = true;
    }
  });
  return found ? box : null;
}

// Reconstruit une cavité factice aux dimensions réelles du bac, pour faire
// travailler fillPlanter sur la vraie géométrie sans charger le GLB entier.
function soilStandIn(box) {
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const material = new THREE.MeshStandardMaterial();
  material.name = "soil";
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, Math.max(size.y, 1e-4), size.z), material);
  mesh.position.copy(center);
  const group = new THREE.Group();
  group.add(mesh);
  group.updateMatrixWorld(true);
  return group;
}

// --- contrôles -----------------------------------------------------------

console.log("\n1. Catalogue : chaque référence a son modèle et ses cotes\n");

for (const p of db.products) {
  const file = path.join(GLB_DIR, `${p.id}.glb`);
  ok(fs.existsSync(file), `${p.id} : fichier GLB présent`);
  const entry = index.models.find((m) => m.id === p.id);
  ok(!!entry, `${p.id} : déclaré dans models.json`);
  if (entry) {
    const d = p.dimensions;
    const same =
      entry.dimensions_cm.width === d.width &&
      entry.dimensions_cm.depth === d.depth &&
      entry.dimensions_cm.height === d.height;
    ok(same, `${p.id} : cotes identiques dans les deux fichiers`, JSON.stringify(entry.dimensions_cm));
  }
}
console.log(`   ${db.products.length} références contrôlées`);

console.log("\n2. Plantation : les sujets tiennent dans la cavité\n");

const plantable = [];
for (const p of db.products) {
  const file = path.join(GLB_DIR, `${p.id}.glb`);
  if (!fs.existsSync(file)) continue;
  const json = readGlb(file);
  const soil = primitiveWorldBox(json, "soil");
  if (soil) plantable.push({ id: p.id, soil });
}
console.log(`   ${plantable.length} références plantables détectées`);
ok(plantable.length === 21, "21 références plantables attendues", `${plantable.length} trouvées`);

for (const { id, soil } of plantable) {
  for (const species of PLANT_SPECIES) {
    const group = soilStandIn(soil);
    const plantation = fillPlanter(THREE, group, { species: species.id, seed: 42 });
    if (!plantation) {
      ok(false, `${id} / ${species.id} : plantation générée`);
      continue;
    }
    ok(plantation.children.length > 0, `${id} / ${species.id} : au moins un sujet`);

    group.add(plantation);
    group.updateMatrixWorld(true);

    // Chaque touffe doit rester au-dessus de la terre et dans ses bords.
    const tol = 0.02; // 2 cm de tolérance sur le feuillage débordant
    for (const plant of plantation.children) {
      const box = new THREE.Box3().setFromObject(plant);
      const inX = box.min.x >= soil.min.x - tol && box.max.x <= soil.max.x + tol;
      const inZ = box.min.z >= soil.min.z - tol && box.max.z <= soil.max.z + tol;
      ok(inX && inZ, `${id} / ${species.id} : sujet dans la cavité`,
        `x[${box.min.x.toFixed(3)},${box.max.x.toFixed(3)}] vs [${soil.min.x.toFixed(3)},${soil.max.x.toFixed(3)}]`);
      ok(box.min.y >= soil.max.y - tol, `${id} / ${species.id} : sujet posé sur la terre`);
    }

    // Pas de chevauchement entre sujets.
    const boxes = plantation.children.map((c) => new THREE.Box3().setFromObject(c));
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const overlapX = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
        const overlapZ = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
        // Un léger entrelacement du feuillage est naturel ; c'est le
        // recouvrement franc de deux touffes qui serait faux.
        const aSize = a.getSize(new THREE.Vector3());
        const bSize = b.getSize(new THREE.Vector3());
        const seuil = Math.min(aSize.x, bSize.x, aSize.z, bSize.z) * 0.8;
        ok(
          !(overlapX > seuil && overlapZ > seuil),
          `${id} / ${species.id} : sujets ${i} et ${j} non superposés`
        );
      }
    }
  }
}

console.log(`\n${fail === 0 ? "TOUT PASSE" : "DES CONTROLES ECHOUENT"} — ${pass} succès, ${fail} échecs\n`);
process.exit(fail === 0 ? 0 : 1);
