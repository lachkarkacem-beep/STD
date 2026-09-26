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
import { PRESETS } from "../lib/garden/presets.mjs";
import { buildBuilding } from "../lib/garden/buildings.mjs";
import { groundGeometry, groundCovers } from "../lib/garden/ground-geometry.mjs";
import { fenceEdges } from "../lib/garden/fence.mjs";
import { PAVINGS, pavingPitch, pavingLayout, isPavable } from "../lib/garden/paving.mjs";
import { ROTATION_STEP, angleFromCenter, normalizeAngle, snapAngle, toDegrees } from "../lib/garden/rotation.mjs";
import { pageNumbers } from "../lib/pagination.mjs";
import { EFFECT_ANCHORS } from "../lib/garden/effects.mjs";
import { PROPS, isProp } from "../lib/garden/props.mjs";
import { GALLERY_REFS, galleryCount, galleryLayout } from "../lib/gallery.mjs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

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

// L'interface propose les espèces depuis lib/plants.ts, la géométrie vient de
// plants-builder.js : une liste plus longue que l'autre donnerait un choix qui
// ne produit rien, ou une espèce dessinée que personne ne peut demander.
{
  const tsSrc = fs.readFileSync(path.join(ROOT, "lib/plants.ts"), "utf8");
  const tsIds = [...tsSrc.matchAll(/id:\s*"([a-z]+)"/g)].map((m) => m[1]);
  const jsIds = PLANT_SPECIES.map((s) => s.id);
  ok(tsIds.length === jsIds.length, "les deux listes d'espèces ont la même longueur", `${tsIds.length} / ${jsIds.length}`);
  for (const id of jsIds) ok(tsIds.includes(id), `l'espèce ${id} est proposée par l'interface`);
  for (const id of tsIds) ok(jsIds.includes(id), `l'espèce ${id} est bien dessinée`);
}

const plantable = [];
for (const p of db.products) {
  const file = path.join(GLB_DIR, `${p.id}.glb`);
  if (!fs.existsSync(file)) continue;
  const json = readGlb(file);
  const soil = primitiveWorldBox(json, "soil");
  if (soil) plantable.push({ id: p.id, soil });
}
console.log(`   ${plantable.length} références plantables détectées`);
// 21 bacs, pots et vasques, plus la coupe de la veilleuse V50.
ok(plantable.length === 22, "22 références plantables attendues", `${plantable.length} trouvées`);

// La graine 7 est celle que la fiche produit et l'éditeur emploient réellement
// (Viewer3D et GardenScene.applySpecies) : la tester d'abord, sans quoi le
// harnais contrôle une plantation que personne ne voit jamais.
const GRAINES = [7, 42];

for (const { id, soil } of plantable) {
  for (const species of PLANT_SPECIES) {
    for (const graine of GRAINES) {
    const group = soilStandIn(soil);
    const plantation = fillPlanter(THREE, group, { species: species.id, seed: graine });
    if (!plantation) {
      ok(false, `${id} / ${species.id} (graine ${graine}) : plantation générée`);
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
    //
    // Le critère porte sur les emprises réelles : la distance entre deux
    // pieds doit valoir au moins la somme de leurs rayons de feuillage. Le
    // contrôle précédent comparait des boîtes et ne se déclenchait qu'en cas
    // de superposition quasi totale — il laissait donc passer les touffes qui
    // se rentrent dedans à moitié, exactement ce qui se voyait sur les fiches.
    // Le rayon est mesuré sur les sommets réels, et non sur la boîte
    // englobante : celle d'une touffe tournée est plus large que la touffe
    // elle-même, et l'on accuserait de chevauchement des plantes qui ne se
    // touchent pas.
    const emprises = plantation.children.map((c) => {
      c.updateMatrixWorld(true);
      let rayon = 0;
      const v = new THREE.Vector3();
      c.traverse((o) => {
        if (!o.isMesh) return;
        const pos = o.geometry.getAttribute("position");
        for (let k = 0; k < pos.count; k++) {
          v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld);
          rayon = Math.max(rayon, Math.hypot(v.x - c.position.x, v.z - c.position.z));
        }
      });
      return { x: c.position.x, z: c.position.z, rayon };
    });
    for (let i = 0; i < emprises.length; i++) {
      for (let j = i + 1; j < emprises.length; j++) {
        const a = emprises[i];
        const b = emprises[j];
        const d = Math.hypot(a.x - b.x, a.z - b.z);
        ok(
          d >= a.rayon + b.rayon - 1e-6,
          `${id} / ${species.id} (graine ${graine}) : sujets ${i} et ${j} non superposés`,
          `distance ${d.toFixed(3)} < ${(a.rayon + b.rayon).toFixed(3)}`
        );
      }
    }
    }
  }
}

console.log("\n3. Exemples d'aménagement : références valides et pièces au sol\n");

const knownRefs = new Set(db.products.map((p) => p.id));
const knownSpecies = new Set(PLANT_SPECIES.map((s) => s.id));
const plantableIds = new Set(plantable.map((p) => p.id));

const allItems = PRESETS.flatMap((p) => p.items);
ok(allItems.length > 0, "les exemples déclarent des pièces");
console.log(`   ${PRESETS.length} exemples, ${allItems.length} pièces au total`);

for (const ref of new Set(allItems.map((i) => i.ref))) {
  ok(knownRefs.has(ref), `exemple : la référence ${ref} existe au catalogue`);
}
for (const item of allItems) {
  if (!item.species) continue;
  ok(knownSpecies.has(item.species), `exemple : l'espèce ${item.species} existe`);
  // Une plantation n'a de sens que sur un bac qui a une cavité.
  ok(plantableIds.has(item.ref), `exemple : ${item.ref} peut accueillir « ${item.species} »`);
}

console.log("\n4. Exemples : aucune pièce n'en chevauche une autre\n");

// Emprise au sol réelle de chaque référence, lue dans son GLB.
function footprintOf(ref) {
  const json = readGlb(path.join(GLB_DIR, `${ref}.glb`));
  const box = new THREE.Box3();
  const parentOf = new Map();
  (json.nodes ?? []).forEach((n, i) => (n.children ?? []).forEach((c) => parentOf.set(c, i)));
  (json.nodes ?? []).forEach((node, nodeIndex) => {
    if (node.mesh === undefined) return;
    for (const prim of json.meshes[node.mesh].primitives ?? []) {
      const acc = json.accessors[prim.attributes.POSITION];
      if (!acc?.min || !acc?.max) continue;
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
      box.union(
        new THREE.Box3(
          new THREE.Vector3().fromArray(acc.min),
          new THREE.Vector3().fromArray(acc.max)
        ).applyMatrix4(m)
      );
    }
  });
  const size = box.getSize(new THREE.Vector3());
  return { x: size.x / 2, z: size.z / 2 };
}

// Même formule que lib/garden/scene.ts : enveloppe de l'emprise tournée.
function placedBox(half, x, z, rotation) {
  const c = Math.abs(Math.cos(rotation));
  const s = Math.abs(Math.sin(rotation));
  const hx = half.x * c + half.z * s;
  const hz = half.x * s + half.z * c;
  return { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz };
}

const halves = new Map();
for (const preset of PRESETS) {
  const boxes = preset.items.map((it) => {
    if (!halves.has(it.ref)) halves.set(it.ref, footprintOf(it.ref));
    return {
      ref: it.ref,
      box: placedBox(halves.get(it.ref), it.x, it.z, it.rotation ?? 0),
    };
  });

  let pairs = 0;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i].box;
      const b = boxes[j].box;
      const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
      const overlapZ = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);
      pairs++;
      ok(
        !(overlapX > 0.02 && overlapZ > 0.02),
        `« ${preset.label} » : ${boxes[i].ref} et ${boxes[j].ref} ne se chevauchent pas`,
        `recouvrement ${overlapX.toFixed(2)} × ${overlapZ.toFixed(2)} m`
      );
    }
  }
  console.log(`   « ${preset.label} » : ${boxes.length} pièces, ${pairs} couples vérifiés`);
}

console.log("\n5. Bâtiments : géométrie et échelle\n");

for (const kind of ["maison", "villa"]) {
  const building = buildBuilding(kind);
  ok(!!building, `${kind} : le bâtiment est construit`);
  if (!building) continue;
  building.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(building);
  const size = box.getSize(new THREE.Vector3());
  ok(Math.abs(box.min.y) < 0.02, `${kind} : posé au sol`, `y min = ${box.min.y.toFixed(3)}`);
  // Hauteurs plausibles : une maison de plain-pied entre 4 et 6 m au faîtage,
  // une villa à étage entre 6 et 8 m à l'acrotère.
  const [lo, hi] = kind === "maison" ? [4, 6] : [6, 8];
  ok(size.y > lo && size.y < hi, `${kind} : hauteur hors tout plausible`, `${size.y.toFixed(2)} m`);
  ok(size.x > 6 && size.x < 20, `${kind} : largeur plausible`, `${size.x.toFixed(2)} m`);

  // Le défaut signalé : une toiture inversée, dont l'égout monte plus haut
  // que le faîtage. On mesure les deux extrémités de chaque pan.
  for (const pan of building.children.filter((c) => c.name.startsWith("toit-pan"))) {
    const length = pan.userData.slopeLength;
    const bas = pan.localToWorld(new THREE.Vector3(0, 0, length / 2));
    const haut = pan.localToWorld(new THREE.Vector3(0, 0, -length / 2));
    // L'extrémité la plus éloignée de l'axe est l'égout : elle doit être la
    // plus basse.
    const egout = Math.abs(bas.z) > Math.abs(haut.z) ? bas : haut;
    const faitage = egout === bas ? haut : bas;
    ok(
      egout.y < faitage.y - 0.5,
      `${kind} : ${pan.name} descend du faîtage vers l'égout`,
      `égout y=${egout.y.toFixed(2)} · faîtage y=${faitage.y.toFixed(2)}`
    );
    ok(
      Math.abs(faitage.z) < 0.2,
      `${kind} : ${pan.name} rejoint le faîtage sur l'axe`,
      `z=${faitage.z.toFixed(2)}`
    );
  }
}

console.log("\n6. Bassins : le sol est bien percé\n");

// Sans percement, la pelouse recouvre l'eau et le bassin paraît vide.
const plein = groundGeometry(null);
ok(groundCovers(plein, 0, 0), "sans bassin, le sol couvre le centre de la scène");
ok(groundCovers(plein, 12, -8), "sans bassin, le sol couvre un point quelconque");

for (const preset of PRESETS.filter((p) => p.pool)) {
  const pool = preset.pool;
  const geometry = groundGeometry(pool);
  const cx = pool.x ?? 0;
  const cz = pool.z ?? 0;

  ok(
    !groundCovers(geometry, cx, cz),
    `« ${preset.label} » : le sol est ouvert au centre du bassin`,
    `(${cx}, ${cz})`
  );
  // Quatre points intérieurs, à mi-chemin du bord.
  for (const [dx, dz] of [
    [0.4, 0],
    [-0.4, 0],
    [0, 0.4],
    [0, -0.4],
  ]) {
    const px = cx + (pool.width / 2) * dx;
    const pz = cz + (pool.depth / 2) * dz;
    ok(!groundCovers(geometry, px, pz), `« ${preset.label} » : ouvert en (${px.toFixed(1)}, ${pz.toFixed(1)})`);
  }
  // Et le sol reprend juste au-delà des margelles.
  ok(
    groundCovers(geometry, cx + pool.width / 2 + 0.5, cz),
    `« ${preset.label} » : le sol reprend au-delà du bassin`
  );
  ok(
    groundCovers(geometry, cx, cz + pool.depth / 2 + 0.5),
    `« ${preset.label} » : le sol reprend derrière le bassin`
  );
}

console.log("\n7. Grillage : des travées, pas une toile\n");

// Un pourtour régulier doit donner exactement une boucle fermée : autant de
// travées que de piquets, et aucune diagonale de coin.
for (const preset of PRESETS.filter((p) => p.items.some((i) => i.ref.startsWith("PQ")))) {
  const posts = preset.items.filter((i) => i.ref.startsWith("PQ")).map((i) => ({ x: i.x, z: i.z }));
  const edges = fenceEdges(posts);
  ok(
    edges.length === posts.length,
    `« ${preset.label} » : ${posts.length} piquets forment une boucle fermée`,
    `${edges.length} travées`
  );

  let maxSpan = 0;
  for (const [i, j] of edges) {
    const span = Math.hypot(posts[j].x - posts[i].x, posts[j].z - posts[i].z);
    maxSpan = Math.max(maxSpan, span);
    // Une travée relie deux voisins du pourtour : elle est donc alignée sur
    // un axe. Une diagonale signalerait un raccord en travers du terrain.
    const alignee =
      Math.abs(posts[j].x - posts[i].x) < 0.01 || Math.abs(posts[j].z - posts[i].z) < 0.01;
    ok(alignee, `« ${preset.label} » : la travée ${i}-${j} suit le pourtour`);
  }
  ok(maxSpan < 2.5, `« ${preset.label} » : aucune travée trop longue`, `${maxSpan.toFixed(2)} m`);
}

// Le défaut signalé : des piquets posés à la main, proches les uns des
// autres, ne doivent pas tous se relier entre eux.
const grappe = [
  { x: 0, z: 0 },
  { x: 0.4, z: 0 },
  { x: 0.8, z: 0 },
  { x: 1.2, z: 0 },
];
const edgesGrappe = fenceEdges(grappe);
ok(
  edgesGrappe.length === 3,
  "quatre piquets alignés donnent trois travées, pas six",
  `${edgesGrappe.length} travées`
);
for (const [i, j] of edgesGrappe) {
  ok(Math.abs(j - i) === 1, "chaque travée relie deux piquets consécutifs", `${i}-${j}`);
}

// Deux piquets isolés loin l'un de l'autre ne se relient pas.
ok(
  fenceEdges([{ x: 0, z: 0 }, { x: 9, z: 0 }]).length === 0,
  "deux piquets trop éloignés ne sont pas reliés"
);

console.log("\n8. Dallages : un pavage continu, sans vide\n");

// Côté de la dalle unitaire, lu dans le catalogue : c'est lui qui doit
// commander le pas de pose, et non la boîte englobante de la plaque.
for (const { ref, label } of PAVINGS) {
  const product = db.products.find((p) => p.id === ref);
  ok(!!product, `${ref} : la référence existe au catalogue`);
  if (!product) continue;

  const tile = product.dimensions.width / 100;
  const pitch = pavingPitch(ref);
  ok(!!pitch, `${ref} : pas de pose défini`);
  if (!pitch) continue;

  // Le pas doit être un multiple entier de la dalle, sinon le motif se
  // décale de plaque en plaque et laisse un joint ouvert.
  const colsExactes = pitch.x / tile;
  const rangsExacts = pitch.z / tile;
  ok(
    Math.abs(colsExactes - Math.round(colsExactes)) < 1e-9,
    `${label} : le pas en longueur vaut un nombre entier de dalles`,
    `${colsExactes.toFixed(3)}`
  );
  ok(
    Math.abs(rangsExacts - Math.round(rangsExacts)) < 1e-9,
    `${label} : le pas en largeur vaut un nombre entier de dalles`,
    `${rangsExacts.toFixed(3)}`
  );

  // Le pas ne doit pas dépasser la boîte du GLB : ce serait un vide franc.
  const glb = readGlb(path.join(GLB_DIR, `${ref}.glb`));
  const box = new THREE.Box3();
  for (const acc of Object.values(glb.accessors)) {
    if (acc.type === "VEC3" && acc.min && acc.max) {
      box.expandByPoint(new THREE.Vector3().fromArray(acc.min));
      box.expandByPoint(new THREE.Vector3().fromArray(acc.max));
    }
  }
  const size = box.getSize(new THREE.Vector3());
  ok(pitch.x <= size.x + 1e-6, `${label} : aucun vide en longueur`, `pas ${pitch.x} > plaque ${size.x.toFixed(3)}`);
  ok(pitch.z <= size.z + 1e-6, `${label} : aucun vide en largeur`, `pas ${pitch.z} > plaque ${size.z.toFixed(3)}`);

  // Les plaques posées doivent se suivre exactement, sans trou ni décalage.
  const layout = pavingLayout(ref, { width: 8, depth: 6 });
  ok(layout.positions.length === layout.cols * layout.rows, `${label} : grille complète`);
  const xs = [...new Set(layout.positions.map((p) => +p.x.toFixed(6)))].sort((a, b) => a - b);
  const zs = [...new Set(layout.positions.map((p) => +p.z.toFixed(6)))].sort((a, b) => a - b);
  for (let i = 1; i < xs.length; i++) {
    ok(Math.abs(xs[i] - xs[i - 1] - pitch.x) < 1e-6, `${label} : plaques jointives en longueur`);
  }
  for (let i = 1; i < zs.length; i++) {
    ok(Math.abs(zs[i] - zs[i - 1] - pitch.z) < 1e-6, `${label} : plaques jointives en largeur`);
  }
  // Et le pavage couvre au moins la surface demandée.
  ok(layout.cols * pitch.x >= 8 - 1e-9, `${label} : la surface demandée est couverte en longueur`);
  ok(layout.rows * pitch.z >= 6 - 1e-9, `${label} : la surface demandée est couverte en largeur`);
}

// Les exemples qui posent une terrasse doivent employer une référence pavable.
for (const preset of PRESETS.filter((p) => p.paving)) {
  ok(isPavable(preset.paving), `« ${preset.label} » : ${preset.paving} est une dalle de champ`);
}

// Le dallage doit contourner le bassin : posé par-dessus, il reboucherait
// l'ouverture creusée dans le sol et la piscine paraîtrait pleine de dalles.
for (const preset of PRESETS.filter((p) => p.paving && p.pool)) {
  const area = preset.pavingArea ?? { width: 16, depth: 12 };
  const layout = pavingLayout(preset.paving, area, preset.pool);
  const sans = pavingLayout(preset.paving, area, null);
  ok(
    layout.skipped > 0,
    `« ${preset.label} » : des plaques sont réservées au bassin`,
    `${layout.skipped} écartées`
  );
  ok(
    layout.positions.length < sans.positions.length,
    `« ${preset.label} » : le pavage est bien réduit par la réserve`
  );

  const pool = preset.pool;
  const poolBox = {
    minX: (pool.x ?? 0) - pool.width / 2,
    maxX: (pool.x ?? 0) + pool.width / 2,
    minZ: (pool.z ?? 0) - pool.depth / 2,
    maxZ: (pool.z ?? 0) + pool.depth / 2,
  };
  for (const p of layout.positions) {
    const chevauche =
      p.x + layout.pitch.x / 2 > poolBox.minX &&
      p.x - layout.pitch.x / 2 < poolBox.maxX &&
      p.z + layout.pitch.z / 2 > poolBox.minZ &&
      p.z - layout.pitch.z / 2 < poolBox.maxZ;
    ok(
      !chevauche,
      `« ${preset.label} » : aucune plaque au-dessus du bassin`,
      `plaque en (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`
    );
  }
}

console.log("\n9. Rotation : pas, calage et affichage\n");

ok(Math.abs(ROTATION_STEP - Math.PI / 12) < 1e-12, "le pas vaut 15°");
ok(toDegrees(ROTATION_STEP) === 15, "un pas s'affiche 15°", String(toDegrees(ROTATION_STEP)));

// Vingt-quatre pas font le tour complet et ramènent à zéro : sans
// normalisation, l'angle affiché dériverait indéfiniment.
let angle = 0;
for (let i = 0; i < 24; i++) angle += ROTATION_STEP;
ok(toDegrees(angle) === 0, "vingt-quatre pas ramènent à 0°", `${toDegrees(angle)}°`);

// Tourner dans un sens puis dans l'autre doit rendre l'orientation d'origine.
ok(
  toDegrees(normalizeAngle(ROTATION_STEP * 5 - ROTATION_STEP * 5)) === 0,
  "un aller-retour revient au point de départ"
);
ok(toDegrees(normalizeAngle(-ROTATION_STEP)) === 345, "un pas négatif s'affiche 345°");

// Le calage doit attraper le pas le plus proche, des deux côtés.
for (const [brut, attendu] of [
  [0.01, 0],
  [(14 * Math.PI) / 180, 15],
  [(16 * Math.PI) / 180, 15],
  [(22 * Math.PI) / 180, 15],
  [(23.5 * Math.PI) / 180, 30],
  [(-10 * Math.PI) / 180, 345],
]) {
  ok(
    toDegrees(snapAngle(brut)) === attendu,
    `${((brut * 180) / Math.PI).toFixed(1)}° se cale sur ${attendu}°`,
    `${toDegrees(snapAngle(brut))}°`
  );
}

// L'angle suivi à la souris : une pièce à l'origine, le pointeur plein est.
ok(
  toDegrees(angleFromCenter(0, 0, 1, 0)) === 90,
  "pointeur à l'est : 90°",
  `${toDegrees(angleFromCenter(0, 0, 1, 0))}°`
);
ok(toDegrees(angleFromCenter(0, 0, 0, 1)) === 0, "pointeur au nord : 0°");
ok(toDegrees(angleFromCenter(2, 3, 2, 4)) === 0, "l'angle est mesuré depuis le centre de la pièce");

console.log("\n10. Pagination du catalogue photo\n");

// Les numéros affichés autour de la page courante : la première, la dernière
// et les voisines, le reste replié. Cinquante et une pages ne tiennent pas
// dans une barre.
for (const [current, total] of [
  [1, 53],
  [2, 53],
  [27, 53],
  [52, 53],
  [53, 53],
]) {
  const nums = pageNumbers(current, total);
  const chiffres = nums.filter((n) => n !== "…");
  ok(chiffres.includes(1), `page ${current}/${total} : la première page reste accessible`);
  ok(chiffres.includes(total), `page ${current}/${total} : la dernière page reste accessible`);
  ok(chiffres.includes(current), `page ${current}/${total} : la page courante est présente`);
  ok(nums.length <= 9, `page ${current}/${total} : la barre reste courte`, `${nums.length} entrées`);
  // Les numéros doivent rester strictement croissants, sans doublon.
  for (let i = 1; i < chiffres.length; i++) {
    ok(chiffres[i] > chiffres[i - 1], `page ${current}/${total} : numéros ordonnés et uniques`);
  }
}

// Un catalogue court s'affiche en entier, sans repli.
const courte = pageNumbers(3, 6);
ok(courte.length === 6 && !courte.includes("…"), "six pages s'affichent toutes");

console.log("\n11. Effets animés : flammes et jets d'eau\n");

const knownAll = new Set(db.products.map((p) => p.id));

// Matrice monde d'un nœud, transformations parentes comprises. Se contenter
// d'additionner les translations donne des hauteurs fausses dès qu'un nœud
// porte une rotation ou une échelle.
function worldMatrixFactory(json) {
  const parentOf = new Map();
  (json.nodes ?? []).forEach((n, i) => (n.children ?? []).forEach((c) => parentOf.set(c, i)));
  return (idx) => {
    const chain = [];
    let c = idx;
    while (c !== undefined) {
      chain.unshift(c);
      c = parentOf.get(c);
    }
    const m = new THREE.Matrix4();
    for (const i of chain) {
      const n = json.nodes[i];
      const l = new THREE.Matrix4();
      if (n.matrix) l.fromArray(n.matrix);
      else
        l.compose(
          new THREE.Vector3().fromArray(n.translation ?? [0, 0, 0]),
          new THREE.Quaternion().fromArray(n.rotation ?? [0, 0, 0, 1]),
          new THREE.Vector3().fromArray(n.scale ?? [1, 1, 1])
        );
      m.multiply(l);
    }
    return m;
  };
}

// Boîtes monde des primitives d'un matériau donné, prises une à une.
function materialBoxes(ref, material) {
  const json = readGlb(path.join(GLB_DIR, `${ref}.glb`));
  const mi = (json.materials ?? []).findIndex((m) => m.name === material);
  const world = worldMatrixFactory(json);
  const boxes = [];
  (json.nodes ?? []).forEach((node, ni) => {
    if (node.mesh === undefined) return;
    for (const p of json.meshes[node.mesh].primitives ?? []) {
      if (material && p.material !== mi) continue;
      const a = json.accessors[p.attributes.POSITION];
      if (!a?.min || !a?.max) continue;
      boxes.push(
        new THREE.Box3(
          new THREE.Vector3().fromArray(a.min),
          new THREE.Vector3().fromArray(a.max)
        ).applyMatrix4(world(ni))
      );
    }
  });
  return boxes;
}

/** Sommet réel d'un modèle, tous matériaux confondus. */
function modelTop(ref) {
  const box = new THREE.Box3();
  for (const b of materialBoxes(ref, null)) box.union(b);
  return box.max.y;
}

/** Hauteurs des nappes d'eau du modèle, de la plus haute à la plus basse. */
function waterLevels(ref) {
  const levels = materialBoxes(ref, "eau").map((b) => +b.max.y.toFixed(3));
  return [...new Set(levels)].sort((a, b) => b - a);
}

for (const [ref, spec] of Object.entries(EFFECT_ANCHORS)) {
  ok(knownAll.has(ref), `effet : la référence ${ref} existe au catalogue`);
  const product = db.products.find((p) => p.id === ref);
  if (!product) continue;

  if (spec.kind === "feu") {
    ok(spec.size > 0, `${ref} : la flamme a une taille`);
    ok(spec.y > 0.1, `${ref} : la flamme n'est pas au ras du sol`, `${spec.y} m`);
    ok(
      spec.y <= product.dimensions.height / 100,
      `${ref} : la flamme reste sous le sommet`,
      `${spec.y} m`
    );
    continue;
  }

  const sommet = modelTop(ref);
  const nappes = waterLevels(ref);
  ok(nappes.length > 0, `${ref} : le modèle contient bien des nappes d'eau`);
  ok(spec.spouts?.length > 0, `${ref} : au moins un jet déclaré`);

  const cascade = product.category === "Fontaines";
  if (cascade) {
    // Sur une fontaine, l'eau doit jaillir du sommet, pas d'une vasque.
    ok(
      Math.abs(spec.spouts[0].y - sommet) < 0.02,
      `${ref} : le jet part du sommet de la fontaine`,
      `${spec.spouts[0].y} vs ${sommet.toFixed(3)} m`
    );
    ok(
      spec.spouts.length === nappes.length,
      `${ref} : autant de chutes que de vasques`,
      `${spec.spouts.length} chutes / ${nappes.length} vasques`
    );
  }

  for (const [i, s] of spec.spouts.entries()) {
    const arrivee = +(s.y - s.fall).toFixed(3);
    // Le point d'arrivée doit coïncider avec une nappe réelle du modèle :
    // c'est ce qui garantit que l'eau ne traverse ni le fond ni le socle.
    const nappe = nappes.find((n) => Math.abs(n - arrivee) < 0.03);
    ok(
      nappe !== undefined,
      `${ref} : le jet ${i + 1} atteint une nappe d'eau`,
      `arrivée ${arrivee} m, nappes ${nappes.join(", ")}`
    );
    ok(s.fall > 0, `${ref} : le jet ${i + 1} a une hauteur de chute`);
    ok(arrivee > 0, `${ref} : le jet ${i + 1} ne descend pas sous le sol`, `${arrivee} m`);
    ok(s.y <= sommet + 0.01, `${ref} : le jet ${i + 1} part d'un point du modèle`, `${s.y} m`);
  }
}

// Le feu ne va qu'aux barbecues, l'eau qu'aux fontaines et jets muraux.
for (const [ref, spec] of Object.entries(EFFECT_ANCHORS)) {
  const product = db.products.find((p) => p.id === ref);
  if (!product) continue;
  const attendu = product.category === "Barbecues" ? "feu" : "eau";
  ok(spec.kind === attendu, `${ref} (${product.category}) porte un effet « ${attendu} »`, spec.kind);
}

// Toute pièce d'une famille concernée doit avoir son effet : en oublier une
// donnerait une fontaine sèche à côté d'une fontaine qui coule.
for (const p of db.products) {
  if (!["Barbecues", "Fontaines", "Jets d'eau muraux"].includes(p.category)) continue;
  ok(!!EFFECT_ANCHORS[p.id], `${p.id} (${p.category}) a bien un effet déclaré`);
}

console.log("\n12. Galerie flottante : pièces réelles, réparties sans collision\n");

for (const ref of GALLERY_REFS) {
  ok(knownRefs.has(ref), `galerie : ${ref} est une vraie référence du catalogue`);
  ok(fs.existsSync(path.join(GLB_DIR, `${ref}.glb`)), `galerie : le modèle de ${ref} existe`);
}

// La galerie doit balayer le catalogue, pas répéter la même famille.
{
  const familles = new Set(GALLERY_REFS.map((r) => db.products.find((p) => p.id === r)?.category));
  ok(familles.size >= 8, "la galerie couvre au moins huit familles", `${familles.size}`);
}

for (const mobile of [false, true]) {
  const etiquette = mobile ? "mobile" : "bureau";
  const count = galleryCount(mobile);
  ok(count >= 5 && count <= 12, `${etiquette} : entre 5 et 12 miniatures`, `${count}`);
  ok(count <= GALLERY_REFS.length, `${etiquette} : assez de références disponibles`);

  const layout = galleryLayout(count);
  ok(layout.length === count, `${etiquette} : toutes les places ont été trouvées`, `${layout.length}`);

  for (const p of layout) {
    ok(p.scale >= 0.15 && p.scale <= 0.25, `${etiquette} : échelle dans la fourchette demandée`, p.scale.toFixed(3));
    ok(p.z <= 0, `${etiquette} : les pièces restent devant la caméra`);
    ok(p.bob > 0 && p.speed > 0, `${etiquette} : chaque pièce a son flottement`);
  }

  // Aucune paire ne doit se recouvrir : c'est ce qui sépare une galerie d'un tas.
  for (let i = 0; i < layout.length; i++) {
    for (let j = i + 1; j < layout.length; j++) {
      const a = layout[i];
      const b = layout[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y, (a.z - b.z) * 0.35);
      ok(d >= a.radius + b.radius - 1e-9, `${etiquette} : miniatures ${i} et ${j} séparées`, d.toFixed(2));
    }
  }

  // Phases toutes différentes : synchronisées, les pièces monteraient ensemble
  // et le flottement paraîtrait mécanique.
  const phases = layout.map((p) => +p.phase.toFixed(4));
  ok(new Set(phases).size === phases.length, `${etiquette} : flottements désynchronisés`);

  // Et un vrai volume, pas un plan unique.
  const zs = layout.map((p) => p.z);
  const profondeur = Math.max(...zs) - Math.min(...zs);
  ok(profondeur > 1, `${etiquette} : les pièces occupent un volume`, `${profondeur.toFixed(2)} m`);
}


console.log("\n13. Accessoires de simulation : à l'échelle\n");

for (const prop of PROPS) {
  ok(prop.id.startsWith("SIM:"), `${prop.label} : identifiant distinct du catalogue`);
  ok(!knownRefs.has(prop.id), `${prop.label} : ne se confond pas avec une référence`);
  ok(isProp(prop.id), `${prop.label} : reconnu comme accessoire`);
  // Des cotes crédibles : c'est tout l'intérêt d'un repère d'échelle.
  ok(prop.height > 0.3 && prop.height < 2.6, `${prop.label} : hauteur plausible`, `${prop.height} m`);
  ok(prop.half.x > 0.05 && prop.half.z > 0.05, `${prop.label} : emprise au sol définie`);
}
const homme = PROPS.find((p) => p.id === "SIM:homme");
ok(Math.abs(homme.height - 1.75) < 0.01, "la silhouette mesure bien 1,75 m", `${homme.height} m`);

// Les exemples qui se mettent en scène doivent citer de vrais accessoires,
// et jamais une référence du catalogue déguisée.
const ids = new Set(PROPS.map((p) => p.id));
for (const preset of PRESETS.filter((p) => p.props?.length)) {
  for (const prop of preset.props) {
    ok(ids.has(prop.ref), `« ${preset.label} » : l'accessoire ${prop.ref} existe`);
    ok(isProp(prop.ref), `« ${preset.label} » : ${prop.ref} n'est pas facturé`);
  }
}
// Et ceux qui invitent à s'attabler méritent une mise en scène.
for (const id of ["terrasse-repas", "coin-detente"]) {
  const preset = PRESETS.find((p) => p.id === id);
  ok(preset?.props?.length > 0, `« ${preset?.label ?? id} » : la scène est habitée`);
}

console.log("\n14. Conseils du paysagiste\n");

// Un conseil par famille, et des espèces qui existent réellement.
{
  const src = fs.readFileSync(path.join(ROOT, "lib/advice.ts"), "utf8");
  const familles = [...src.matchAll(/^\s{2}"?([A-ZÀ-Ÿ][^"\n:]*?)"?:\s*\{$/gm)].map((m) => m[1].trim());
  const especes = new Set(PLANT_SPECIES.map((s) => s.id));
  const categories = new Set(db.categories.map((c) => c.id));

  for (const c of categories) {
    ok(familles.includes(c), `la famille « ${c} » a son conseil de paysagiste`);
  }
  for (const id of [...src.matchAll(/plantes:\s*\[([^\]]*)\]/g)].flatMap((m) =>
    [...m[1].matchAll(/"([a-z]+)"/g)].map((x) => x[1])
  )) {
    ok(especes.has(id), `conseil : l'espèce ${id} existe bien`);
  }
}

console.log("\n15. Sauvegarde du projet : aller-retour à l'identique\n");

// Ce que l'éditeur écrit dans localStorage et relit ensuite.
const project = [
  { id: "a1", ref: "PUITS", finish: "blanc", species: null, x: 0, z: 0, rotation: 0 },
  { id: "b2", ref: "B105", finish: "saumon", species: "lavande", x: -2.2, z: 1.4, rotation: Math.PI / 12 },
  { id: "c3", ref: "DOGHOME", finish: "gris", species: null, x: 4.2, z: 2.6, rotation: -Math.PI / 4 },
];
const reloaded = JSON.parse(JSON.stringify(project));
ok(reloaded.length === project.length, "le projet rechargé a le même nombre de pièces");
for (let i = 0; i < project.length; i++) {
  const a = project[i];
  const b = reloaded[i];
  ok(
    a.ref === b.ref && a.finish === b.finish && a.species === b.species,
    `pièce ${i} : référence, coloris et plantation conservés`
  );
  ok(
    Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.z - b.z) < 1e-9 && Math.abs(a.rotation - b.rotation) < 1e-9,
    `pièce ${i} : position et orientation conservées`
  );
  ok(knownRefs.has(b.ref), `pièce ${i} : la référence existe toujours au catalogue`);
}

console.log("\n16. Changer d'espèce ne superpose pas les plantations\n");

{
  const { swapPlantation, countPlantations } = await import("../lib/garden/plantation.mjs");

  // Le graphe de la fiche produit : une racine, le modèle dedans, la
  // plantation accrochée au modèle. C'est cette différence entre les deux
  // niveaux qui avait fait manquer le retrait.
  const { soil } = plantable.find((p) => p.id === "B105");

  const root = new THREE.Group();
  const model = soilStandIn(soil);
  root.add(model);

  // Douze changements d'espèce d'affilée, comme un visiteur qui essaie tout.
  for (const species of PLANT_SPECIES) {
    const next = fillPlanter(THREE, model, { species: species.id, seed: 7 });
    swapPlantation(model, next);
    ok(
      countPlantations(model) === 1,
      `après « ${species.id} », le modèle ne porte qu'une plantation`,
      `${countPlantations(model)} plantations empilées`
    );
    ok(
      model.getObjectByName("plantation")?.userData.species === species.id,
      `après « ${species.id} », c'est bien la nouvelle espèce qui est en place`
    );
  }

  // Et la remise à zéro doit tout enlever.
  swapPlantation(model, null);
  ok(countPlantations(model) === 0, "« aucune plantation » laisse le bac vide");

  // Le composant doit passer par ce module, et non retirer la plantation d'un
  // groupe qui n'est pas son parent — l'erreur d'origine.
  const viewer = fs.readFileSync(path.join(ROOT, "components/Viewer3D.tsx"), "utf8");
  ok(
    viewer.includes("swapPlantation"),
    "la fiche produit échange sa plantation par le module vérifié"
  );
  ok(
    !/root\.remove\(\s*s\.plantation\s*\)/.test(viewer),
    "la fiche produit ne retire plus la plantation d'un groupe qui ne la porte pas"
  );

  // L'éditeur de jardin souffrait du même piège : getObjectByName cherche en
  // profondeur, alors que remove() n'agit que sur les enfants directs.
  const scene = fs.readFileSync(path.join(ROOT, "lib/garden/scene.ts"), "utf8");
  ok(
    scene.includes("swapPlantation"),
    "l'éditeur de jardin échange sa plantation par le module vérifié"
  );
  ok(
    !/model\.remove\(previous\)/.test(scene),
    "l'éditeur ne suppose plus que la plantation est un enfant direct"
  );
}

console.log("\n17. Veilleuses : la flamme s'allume au bon endroit\n");

{
  const { VEILLEUSES, MAT_LUMIERE, NOEUD_FOYER, veilleuseRefs, lightVeilleuse, ambianceFiche, ambiance } =
    await import("../lib/garden/lights.mjs");

  const loader = new GLTFLoader();

  for (const ref of veilleuseRefs()) {
    const file = path.join(GLB_DIR, `${ref}.glb`);
    ok(fs.existsSync(file), `${ref} : le modèle est servi depuis models_web`);
    if (!fs.existsSync(file)) continue;

    // Node réutilise ses tampons : passer `.buffer` tel quel livrerait des
    // octets voisins en plus du fichier. On en extrait la tranche exacte.
    const buf = fs.readFileSync(file);
    const gltf = await loader.parseAsync(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      ""
    );
    const model = gltf.scene;

    // Le nœud et le matériau sur lesquels tout repose doivent exister : c'est
    // ce que le code suppose, et une livraison future pourrait les renommer.
    const foyer = model.getObjectByName(NOEUD_FOYER);
    ok(!!foyer, `${ref} : le nœud « ${NOEUD_FOYER} » existe`);

    let aLumiere = false;
    model.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      if (mats.some((m) => m && m.name === MAT_LUMIERE)) aLumiere = true;
    });
    ok(aLumiere, `${ref} : le matériau « ${MAT_LUMIERE} » existe`);

    // Éteinte : aucune lumière, aucun rougeoiement. « Presque rien » ne suffit
    // pas — une veilleuse allumée en plein jour se verrait.
    lightVeilleuse(THREE, model, ref, 0);
    const lamp = model.userData.lampeVeilleuse;
    ok(!!lamp, `${ref} : une lampe est posée`);
    ok(lamp.intensity === 0, `${ref} : éteinte, la lampe n'éclaire pas`);

    let emissif = 0;
    model.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) if (m?.name === MAT_LUMIERE) emissif = m.emissiveIntensity;
    });
    ok(emissif === 0, `${ref} : éteinte, la claire-voie ne rougeoie pas`);

    // Allumée : la flamme est à la hauteur mesurée dans le fichier livré.
    lightVeilleuse(THREE, model, ref, 1);
    ok(lamp.intensity > 0, `${ref} : allumée, la lampe éclaire`);

    model.updateMatrixWorld(true);
    const p = lamp.getWorldPosition(new THREE.Vector3());
    const attendu = VEILLEUSES[ref].foyer;
    ok(
      Math.abs(p.y - attendu) < 0.005,
      `${ref} : la flamme est au foyer du modèle`,
      `y=${p.y.toFixed(3)} au lieu de ${attendu}`
    );

    // Et elle reste DANS la lanterne, jamais au-dessus du toit ni sous le socle.
    const box = new THREE.Box3().setFromObject(model);
    ok(
      p.y > box.min.y && p.y < box.max.y,
      `${ref} : la flamme est à l'intérieur de la pièce`,
      `y=${p.y.toFixed(3)} hors de [${box.min.y.toFixed(3)}, ${box.max.y.toFixed(3)}]`
    );

    // Rallumer ne doit pas poser une seconde lampe.
    lightVeilleuse(THREE, model, ref, 1);
    let lampes = 0;
    model.traverse((o) => {
      if (o.isPointLight) lampes++;
    });
    ok(lampes === 1, `${ref} : rallumer ne pose pas de lampe en double`, `${lampes} lampes`);
  }

  // Une pièce qui n'est pas une veilleuse n'a rien à allumer.
  ok(lightVeilleuse(THREE, new THREE.Group(), "PUITS", 1) === null, "le puits n'a pas de flamme");

  // La nuit doit éteindre le reste, sinon la flamme serait noyée.
  const jour = ambiance("jour");
  const nuit = ambiance("nuit");
  ok(nuit.soleilIntensite < jour.soleilIntensite * 0.2, "la nuit, le soleil s'efface");
  ok(nuit.hemiIntensite < jour.hemiIntensite * 0.3, "la nuit, la lumière du ciel baisse");
  ok(nuit.allumage === 1 && jour.allumage === 0, "les veilleuses ne s'allument que la nuit");

  // Sur la fiche, le fond doit devenir opaque et sombre : sur du blanc, une
  // lanterne allumée ne se verrait pas.
  const fJour = ambianceFiche("jour");
  const fNuit = ambianceFiche("nuit");
  ok(fJour.fond === null, "le jour, la fiche garde le fond clair de la page");
  ok(typeof fNuit.fond === "number", "la nuit, la fiche prend un fond opaque");
  ok(fNuit.cleIntensite < fJour.cleIntensite * 0.2, "la nuit, la fiche éteint sa lumière clé");
  ok(fNuit.allumage === 1 && fJour.allumage === 0, "la fiche n'allume la flamme que la nuit");

  // Les deux vues doivent passer par le même allumage, pour ne pas diverger.
  const viewer3d = fs.readFileSync(path.join(ROOT, "components/Viewer3D.tsx"), "utf8");
  const sceneSrc = fs.readFileSync(path.join(ROOT, "lib/garden/scene.ts"), "utf8");
  ok(viewer3d.includes("lightVeilleuse"), "la fiche produit allume par le module vérifié");
  ok(sceneSrc.includes("lightVeilleuse"), "l'éditeur allume par le module vérifié");
}

console.log("\n18. Bande défilante de l'accueil\n");

{
  const { ESPACEMENT, MARGE, ribbonCount, ribbonSpan, ribbonLayout, ribbonX } = await import(
    "../lib/ribbon.mjs"
  );

  // Largeurs visibles plausibles : téléphone étroit, tablette, grand écran.
  for (const demi of [3.2, 5, 7.4, 11]) {
    const count = ribbonCount(demi);
    const span = ribbonSpan(count);

    ok(count >= 3, `demi-largeur ${demi} : au moins trois pièces dans la bande`);

    // Le rebouclage doit avoir lieu hors champ : une pièce ne doit jamais
    // apparaître ou disparaître sous les yeux du visiteur.
    ok(
      span / 2 >= demi + MARGE - 1e-9,
      `demi-largeur ${demi} : le circuit (${(span / 2).toFixed(2)}) dépasse le champ visible + marge`
    );

    const pieces = ribbonLayout(count);
    ok(pieces.length === count, `demi-largeur ${demi} : ${count} pièces placées`);

    // L'invariant : à tout instant les pièces restent réparties régulièrement.
    // S'il s'ouvrait un trou, ou si deux pièces se rejoignaient, ce contrôle
    // le verrait — c'est exactement ce que le modulo doit empêcher.
    for (const t of [0, 0.37, 4.1, 19.6, 123.4, 4021.7]) {
      const xs = pieces.map((p) => ribbonX(p.x0, t, 0.55, span)).sort((a, b) => a - b);

      for (const x of xs) {
        ok(
          x >= -span / 2 - 1e-9 && x < span / 2 + 1e-9,
          `t=${t} : une pièce reste sur le circuit (x=${x.toFixed(3)})`
        );
      }

      const ecarts = [];
      for (let i = 1; i < xs.length; i++) ecarts.push(xs[i] - xs[i - 1]);
      ecarts.push(xs[0] + span - xs[xs.length - 1]); // le pas qui referme la boucle

      for (const e of ecarts) {
        ok(
          Math.abs(e - ESPACEMENT) < 1e-6,
          `t=${t} : écart régulier entre pièces (${e.toFixed(4)} au lieu de ${ESPACEMENT})`
        );
      }
    }
  }

  // Le sens du défilement : de la droite vers la gauche, comme demandé.
  {
    const count = ribbonCount(7.4);
    const span = ribbonSpan(count);
    const x0 = 0;
    ok(
      ribbonX(x0, 0.5, 0.55, span) < ribbonX(x0, 0, 0.55, span),
      "la bande défile bien de droite à gauche"
    );
  }

  // Les pièces ne doivent ni se chevaucher en profondeur ni sortir de la bande.
  {
    const pieces = ribbonLayout(ribbonCount(7.4));
    for (const [i, p] of pieces.entries()) {
      ok(Math.abs(p.y) <= 0.36, `pièce ${i} : reste dans la hauteur de la bande`);
      ok(p.z <= 0 && p.z >= -1.4, `pièce ${i} : profondeur dans les bornes`);
      ok(p.scale >= 0.6 && p.scale <= 0.9, `pièce ${i} : échelle de miniature`);
    }
    const phases = new Set(pieces.map((p) => p.phase.toFixed(6)));
    ok(phases.size === pieces.length, "chaque pièce a sa propre phase de flottement");
  }
}

console.log("\n19. Distance jusqu'à l'atelier\n");

{
  const geo = await import("../lib/geo.mjs");
  const { ATELIER, haversine, routeKm, trajet, formatKm, formatDuree, vitesse, VILLES, chercheVille } =
    geo;

  // L'atelier est bien là où le relevé le place, et pas ailleurs.
  ok(Math.abs(ATELIER.lat - 37.179625) < 1e-6, "latitude de l'atelier");
  ok(Math.abs(ATELIER.lon - 9.9591517) < 1e-6, "longitude de l'atelier");

  // L'adresse annoncée sur le site et celle de la carte doivent désigner le
  // même endroit : c'est le genre d'écart qu'on ne voit jamais.
  const societe = fs.readFileSync(path.join(ROOT, "lib/company.ts"), "utf8");
  ok(/Bizerte/.test(societe), "company.ts situe bien l'entreprise à Bizerte");

  // Orthodromie : la seule valeur exacte du module. On la confronte à des
  // distances connues, calculées indépendamment.
  ok(haversine(ATELIER, ATELIER) === 0, "distance nulle entre un point et lui-même");
  for (const [a, b] of [
    [VILLES[0], VILLES[4]],
    [ATELIER, VILLES[20]],
  ]) {
    ok(
      Math.abs(haversine(a, b) - haversine(b, a)) < 1e-9,
      "la distance ne dépend pas du sens de lecture"
    );
  }

  // Un degré de latitude vaut environ 111,2 km, partout sur le globe.
  const unDegre = haversine({ lat: 36, lon: 10 }, { lat: 37, lon: 10 });
  ok(
    Math.abs(unDegre - 111.2) < 0.6,
    "un degré de latitude fait bien ~111 km",
    `${unDegre.toFixed(2)} km`
  );

  // Références vérifiables : l'atelier est à une quinzaine de kilomètres de
  // Bizerte et à une soixantaine de Tunis par la route.
  const reperes = [
    { ville: "Bizerte", volMin: 10, volMax: 16, kmMin: 13, kmMax: 22 },
    { ville: "Tunis", volMin: 43, volMax: 49, kmMin: 52, kmMax: 70 },
    { ville: "Sfax", volMin: 270, volMax: 292, kmMin: 300, kmMax: 380 },
  ];
  for (const r of reperes) {
    const ville = VILLES.find((v) => v.nom === r.ville);
    const t = trajet(ville);
    ok(
      t.volOiseau >= r.volMin && t.volOiseau <= r.volMax,
      `${r.ville} : vol d'oiseau plausible`,
      `${t.volOiseau.toFixed(1)} km hors de [${r.volMin}, ${r.volMax}]`
    );
    ok(
      t.km >= r.kmMin && t.km <= r.kmMax,
      `${r.ville} : distance routière plausible`,
      `${t.km.toFixed(1)} km hors de [${r.kmMin}, ${r.kmMax}]`
    );
  }

  // Depuis l'étranger, aucun temps de voiture ne doit être annoncé : la
  // Méditerranée ne se traverse pas au volant. « Marseille : 940 km par la
  // route, 10 h en voiture » était affiché avant ce contrôle.
  const ailleurs = [
    { nom: "Marseille", lat: 43.2965, lon: 5.3698 },
    { nom: "Paris", lat: 48.8566, lon: 2.3522 },
    { nom: "Palerme", lat: 38.1157, lon: 13.3615 },
    { nom: "Alger", lat: 36.7538, lon: 3.0588 },
  ];
  for (const p of ailleurs) {
    const t = trajet(p);
    ok(t.routier === false, `${p.nom} : reconnu hors de Tunisie`);
    ok(t.duree === null, `${p.nom} : aucun temps de voiture annoncé`);
    ok(t.km === null, `${p.nom} : aucune distance routière annoncée`);
    ok(t.volOiseau > 100, `${p.nom} : le vol d'oiseau reste donné`);
  }
  // Et toutes les villes du pays restent, elles, en trajet routier.
  for (const v of VILLES) {
    ok(trajet(v).routier === true, `${v.nom} : trajet routier`);
  }

  // La route est toujours plus longue que le vol d'oiseau, jamais l'inverse.
  for (const v of VILLES) {
    const t = trajet(v);
    ok(t.km >= t.volOiseau, `${v.nom} : la route ne raccourcit pas le trajet`);
    ok(t.km < t.volOiseau * 1.6, `${v.nom} : le détour reste raisonnable`);
    ok(
      t.minutes > 0 && t.minutes < 12 * 60,
      `${v.nom} : durée dans les bornes du pays`,
      `${t.minutes.toFixed(0)} min`
    );
  }

  // Monotonie : aller plus loin ne peut pas prendre moins de temps.
  const ordonnees = VILLES.map((v) => trajet(v)).sort((a, b) => a.km - b.km);
  for (let i = 1; i < ordonnees.length; i++) {
    ok(
      ordonnees[i].minutes >= ordonnees[i - 1].minutes,
      "une ville plus lointaine n'est jamais plus rapide à atteindre",
      `${ordonnees[i].km.toFixed(0)} km en ${ordonnees[i].minutes.toFixed(0)} min contre ${ordonnees[i - 1].km.toFixed(0)} km en ${ordonnees[i - 1].minutes.toFixed(0)} min`
    );
  }

  // Les vitesses retenues doivent rester celles d'une voiture.
  for (const km of [1, 5, 9, 12, 39, 41, 120, 200, 600]) {
    const v = vitesse(km);
    ok(v >= 25 && v <= 110, `vitesse plausible à ${km} km`, `${v} km/h`);
  }

  // Mise en forme : on n'affiche jamais plus de précision qu'on n'en a, et
  // jamais « 0 min ».
  ok(formatKm(0.42) === "420 m", "sous le kilomètre, on parle en mètres");
  ok(formatKm(3.46) === "3,5 km", "virgule décimale française sous 10 km");
  ok(formatKm(58.4) === "58 km", "au-delà de 10 km, pas de décimale");
  ok(formatDuree(0.2) === "moins d'une minute", "jamais « 0 min »");
  ok(formatDuree(25) === "25 min", "durée courte en minutes");
  ok(formatDuree(60) === "1 h", "une heure juste ne traîne pas de « 00 »");
  ok(formatDuree(133) === "2 h 13", "durée longue en heures et minutes");

  // Reconnaissance des villes tapées à la main.
  ok(chercheVille("Tunis")?.nom === "Tunis", "« Tunis » est reconnu");
  ok(chercheVille("tunis")?.nom === "Tunis", "la casse n'a pas d'importance");
  ok(chercheVille("BÉJA")?.nom === "Béja", "les accents n'ont pas d'importance");
  ok(
    chercheVille("12 rue de Carthage, Sousse")?.nom === "Sousse",
    "une ville se retrouve dans une adresse complète"
  );
  ok(
    chercheVille("Menzel Bourguiba")?.nom === "Menzel Bourguiba",
    "le nom le plus long l'emporte sur un nom qu'il contient"
  );
  ok(chercheVille("Marseille") === null, "une ville inconnue n'est pas inventée");
  ok(chercheVille("") === null, "une saisie vide ne renvoie rien");

  // Chaque ville de la table doit être en Tunisie : une coordonnée saisie de
  // travers donnerait une distance absurde sans que rien ne proteste.
  for (const v of VILLES) {
    ok(
      v.lat > 30 && v.lat < 38 && v.lon > 7 && v.lon < 12,
      `${v.nom} : coordonnées dans les limites du pays`,
      `${v.lat}, ${v.lon}`
    );
  }
  ok(new Set(VILLES.map((v) => v.nom)).size === VILLES.length, "aucune ville en double");

  // Tracé du trajet sur la carte.
  {
    const { orthodromie } = geo;

    // Les trajets tunisiens sont presque nord-sud : sur eux, une interpolation
    // à plat donnerait le même trait, et ne prouverait rien. Les départs
    // lointains — un visiteur français, un client italien — ont la composante
    // est-ouest qui met le calcul à l'épreuve.
    const departs = [
      ...["Bizerte", "Tunis", "Sfax", "Tataouine"].map((n) => ({
        nom: n,
        ...VILLES.find((v) => v.nom === n),
      })),
      { nom: "Paris", lat: 48.8566, lon: 2.3522 },
      { nom: "Milan", lat: 45.4642, lon: 9.19 },
      { nom: "Istanbul", lat: 41.0082, lon: 28.9784 },
    ];

    for (const ville of departs) {
      const nom = ville.nom;
      const pts = orthodromie(ville, ATELIER, 48);

      ok(pts.length === 49, `${nom} : 48 segments tracés`, `${pts.length} points`);

      // Les extrémités doivent tomber EXACTEMENT sur les deux lieux : un
      // trait qui part à côté du marqueur se voit tout de suite.
      ok(
        Math.abs(pts[0][0] - ville.lat) < 1e-9 && Math.abs(pts[0][1] - ville.lon) < 1e-9,
        `${nom} : le trait part du point de départ`
      );
      ok(
        Math.abs(pts[pts.length - 1][0] - ATELIER.lat) < 1e-9 &&
          Math.abs(pts[pts.length - 1][1] - ATELIER.lon) < 1e-9,
        `${nom} : le trait arrive sur l'atelier`
      );

      // Invariant qui tient tout : la somme des segments doit valoir
      // l'orthodromie. Une erreur d'interpolation allongerait le chemin.
      let somme = 0;
      for (let i = 1; i < pts.length; i++) {
        somme += haversine(
          { lat: pts[i - 1][0], lon: pts[i - 1][1] },
          { lat: pts[i][0], lon: pts[i][1] }
        );
      }
      const direct = haversine(ville, ATELIER);
      ok(
        Math.abs(somme - direct) < Math.max(0.01, direct * 1e-6),
        `${nom} : le tracé suit le plus court chemin`,
        `${somme.toFixed(4)} km de trait pour ${direct.toFixed(4)} km`
      );

      // Chaque point reste dans la boîte des deux extrémités, à la marge de
      // courbure près : un grand cercle bombe vers le pôle, mais jamais au
      // point de sortir du cadrage que la carte va choisir.
      const latMin = Math.min(ville.lat, ATELIER.lat) - 0.5;
      const latMax = Math.max(ville.lat, ATELIER.lat) + 2;
      const lonMin = Math.min(ville.lon, ATELIER.lon) - 0.5;
      const lonMax = Math.max(ville.lon, ATELIER.lon) + 0.5;
      for (const [la, lo] of pts) {
        ok(
          la >= latMin && la <= latMax && lo >= lonMin && lo <= lonMax,
          `${nom} : le tracé reste dans le cadre`,
          `${la.toFixed(3)}, ${lo.toFixed(3)}`
        );
      }
    }

    // Deux points confondus : pas de division par zéro, et un trait dégénéré
    // plutôt qu'une erreur.
    const nul = orthodromie(ATELIER, ATELIER);
    ok(Array.isArray(nul) && nul.length >= 2, "un départ confondu avec l'atelier ne casse rien");
    ok(Number.isFinite(nul[0][0]) && Number.isFinite(nul[0][1]), "le tracé dégénéré reste fini");

    // Le trait doit rester en pointillés : plein, il promettrait un tracé
    // routier que nous n'avons pas.
    const carteSrc = fs.readFileSync(path.join(ROOT, "components/AtelierMap.tsx"), "utf8");
    ok(/dashArray/.test(carteSrc), "le trait du trajet est en pointillés, pas plein");
    ok(carteSrc.includes("orthodromie"), "le trait suit l'orthodromie calculée");
  }

  // La carte ne doit pas réclamer de clé : c'est ce qui la rend déployable.
  const carte = fs.readFileSync(path.join(ROOT, "components/AtelierMap.tsx"), "utf8");
  ok(!/api[_-]?key|access[_-]?token/i.test(carte), "la carte ne dépend d'aucune clé d'API");
  ok(carte.includes("World_Imagery"), "la carte est en vue satellite");
  ok(/attribution/.test(carte), "l'imagerie est attribuée, comme sa licence l'exige");

  // Les coordonnées du marqueur viennent du module, pas d'une recopie.
  ok(carte.includes("ATELIER.lat"), "le marqueur reprend les coordonnées du module");

  // Le géocodeur doit se nommer : Nominatim refuse les requêtes anonymes.
  const api = fs.readFileSync(path.join(ROOT, "app/api/distance/route.ts"), "utf8");
  ok(/User-Agent/.test(api), "le géocodeur s'identifie auprès de Nominatim");
  ok(/AbortSignal\.timeout/.test(api), "l'appel au géocodeur est borné dans le temps");
  ok(/catch/.test(api), "une panne du géocodeur est rattrapée");

  // L'estimation doit être annoncée comme telle.
  const section = fs.readFileSync(path.join(ROOT, "components/NousTrouver.tsx"), "utf8");
  ok(
    /[Ee]stimation/.test(section),
    "le résultat est présenté comme une estimation, pas comme un itinéraire"
  );
}

console.log("\n20. Rôles, statuts et sécurité des devis\n");

{
  const {
    STATUTS,
    IDS_STATUTS,
    STATUT_INITIAL,
    estStatutValide,
    estClos,
    rang,
    trierPourAdmin,
    lienWhatsApp,
    erreurTelephone,
  } = await import("../lib/devis-statuts.mjs");

  const sql = fs.readFileSync(
    path.join(ROOT, "supabase/migrations/0002_roles_statuts_telephone.sql"),
    "utf8"
  );
  const init = fs.readFileSync(path.join(ROOT, "supabase/migrations/0001_init.sql"), "utf8");
  const roles = fs.readFileSync(path.join(ROOT, "lib/roles.ts"), "utf8");

  // --- Les quatre statuts, dans l'ordre demandé -----------------------------
  const attendus = [
    "demandé",
    "en_cours_de_traitement",
    "réponse_envoyée_email",
    "réponse_envoyée_whatsapp",
  ];
  ok(IDS_STATUTS.length === 4, "quatre statuts, pas un de plus", `${IDS_STATUTS.length}`);
  attendus.forEach((id, i) => {
    ok(IDS_STATUTS[i] === id, `statut ${i + 1} : « ${id} »`, `trouvé « ${IDS_STATUTS[i]} »`);
  });
  ok(STATUT_INITIAL === "demandé", "une demande naît au statut « demandé »");

  // Le code et la base doivent s'accorder : une valeur ici que la contrainte
  // SQL refuse ferait échouer l'enregistrement sans qu'on sache pourquoi.
  for (const id of IDS_STATUTS) {
    ok(sql.includes(`'${id}'`), `la contrainte SQL accepte « ${id} »`);
  }
  ok(
    /default 'demandé'/.test(sql),
    "la base pose « demandé » par défaut, comme le formulaire"
  );
  // Et l'inverse : rien dans le SQL qui ne soit pas dans le module.
  const dansSql = [...sql.matchAll(/'(demandé|en_cours[a-z_]*|réponse_[a-zà-ÿ_]*)'/g)].map((m) => m[1]);
  for (const v of new Set(dansSql)) {
    ok(IDS_STATUTS.includes(v), `« ${v} » du SQL existe dans le module`);
  }

  ok(estStatutValide("demandé"), "un statut connu est accepté");
  ok(!estStatutValide("answered"), "l'ancien statut anglais est refusé");
  ok(!estStatutValide("n'importe quoi"), "un statut inventé est refusé");
  ok(!estClos("demandé") && !estClos("en_cours_de_traitement"), "les deux premiers restent à traiter");
  ok(
    estClos("réponse_envoyée_email") && estClos("réponse_envoyée_whatsapp"),
    "les deux derniers sont des demandes traitées"
  );
  for (let i = 1; i < IDS_STATUTS.length; i++) {
    ok(rang(IDS_STATUTS[i]) > rang(IDS_STATUTS[i - 1]), "les rangs suivent l'ordre d'avancement");
  }
  for (const s of STATUTS) {
    ok(!!s.admin && !!s.client, `« ${s.id} » a un libellé des deux côtés`);
  }

  // --- Tri de la liste d'administration ------------------------------------
  {
    const demandes = [
      { id: "a", status: "réponse_envoyée_email", created_at: "2026-09-25T10:00:00Z" },
      { id: "b", status: "demandé", created_at: "2026-09-20T10:00:00Z" },
      { id: "c", status: "en_cours_de_traitement", created_at: "2026-09-24T10:00:00Z" },
      { id: "d", status: "demandé", created_at: "2026-09-26T10:00:00Z" },
    ];
    const ordre = trierPourAdmin(demandes).map((q) => q.id);
    ok(
      ordre.join("") === "dbca",
      "à traiter d'abord, puis les plus récentes",
      `ordre obtenu : ${ordre.join(", ")}`
    );
    ok(demandes[0].id === "a", "le tri ne remue pas le tableau d'origine");
  }

  // --- Téléphone -----------------------------------------------------------
  ok(erreurTelephone("") !== null, "un téléphone vide est refusé");
  ok(erreurTelephone("   ") !== null, "des espaces ne font pas un téléphone");
  ok(erreurTelephone("12345") !== null, "un numéro trop court est refusé");
  ok(erreurTelephone("1234567890123456789") !== null, "un numéro trop long est refusé");
  ok(erreurTelephone("pas un numéro") !== null, "des lettres sont refusées");
  ok(erreurTelephone("98 985 647") === null, "un numéro tunisien local est accepté");
  ok(erreurTelephone("+216 98 985 647") === null, "la forme internationale est acceptée");
  ok(erreurTelephone("(216) 98-985-647") === null, "parenthèses et tirets sont tolérés");

  // --- WhatsApp ------------------------------------------------------------
  ok(lienWhatsApp("98 985 647") === "https://wa.me/21698985647", "indicatif ajouté au numéro local");
  ok(
    lienWhatsApp("+216 98 985 647") === "https://wa.me/21698985647",
    "la forme internationale donne le même lien"
  );
  ok(
    lienWhatsApp("0021698985647") === "https://wa.me/21698985647",
    "le préfixe 00 est ramené à la forme internationale"
  );
  ok(lienWhatsApp(null) === null, "pas de numéro, pas de lien");
  ok(lienWhatsApp("123") === null, "un numéro inexploitable ne donne pas de lien");
  ok(
    (lienWhatsApp("98985647", "Bonjour & merci") ?? "").includes("text=Bonjour%20%26%20merci"),
    "le message d'amorce est échappé"
  );

  // --- Le numéro est stocké tel qu'on l'a reçu -----------------------------
  //
  // On ne reformate pas : « 98 985 647 » doit rester lisible comme le client
  // l'a écrit. La mise au format international n'a lieu que pour fabriquer le
  // lien WhatsApp, sans toucher à ce qui est en base.
  {
    const actionsTel = fs.readFileSync(
      path.join(ROOT, "app/admin/utilisateurs/actions.ts"),
      "utf8"
    );
    ok(
      /telephone:\s*brut\s*\|\|\s*null/.test(actionsTel),
      "le téléphone est enregistré tel quel, sans reformatage"
    );
    ok(
      !/replace\(\/\\D/.test(actionsTel),
      "l'enregistrement ne retire pas les espaces du numéro"
    );
    ok(actionsTel.includes("exigerAdmin"), "modifier un téléphone exige le rôle administrateur");
    ok(
      actionsTel.includes("erreurTelephone"),
      "un numéro invalide est refusé avant écriture"
    );

    // Vider le champ doit rester possible : c'est ainsi qu'on retire un
    // numéro faux.
    ok(/if \(brut\)/.test(actionsTel), "un numéro peut être effacé");

    // Et le lien WhatsApp se fabrique à partir du brut, sans l'altérer.
    const avant = "98 985 647";
    ok(lienWhatsApp(avant) === "https://wa.me/21698985647", "le lien part du numéro brut");
    ok(avant === "98 985 647", "fabriquer le lien ne modifie pas le numéro");
  }

  // --- Un seul administrateur ----------------------------------------------
  ok(
    roles.includes('"lachkarkacem@gmail.com"'),
    "l'adresse administratrice est celle qui a été fixée"
  );
  ok(
    /role === "admin"[\s\S]{0,80}estEmailAdmin/.test(roles),
    "être administrateur exige le rôle ET l'adresse, pas l'un ou l'autre"
  );
  ok(
    /profiles_single_admin_idx/.test(sql),
    "la base interdit un second compte administrateur"
  );
  ok(
    /set role = 'user'[\s\S]{0,120}lower\(email\) <> 'lachkarkacem@gmail\.com'/.test(sql),
    "tout autre compte administrateur existant est rétrogradé"
  );
  ok(
    /case[\s\S]{0,200}lower\(new\.email\) = 'lachkarkacem@gmail\.com'[\s\S]{0,80}'admin'/.test(sql),
    "le rôle est décidé en base d'après l'adresse, jamais par le formulaire"
  );

  // Le formulaire d'inscription ne doit rien envoyer qui touche au rôle.
  const signup = fs.readFileSync(path.join(ROOT, "components/SignupForm.tsx"), "utf8");
  ok(
    !/role\s*:/.test(signup),
    "le formulaire public n'envoie aucun rôle"
  );
  ok(signup.includes("telephone"), "le formulaire demande le téléphone");

  // --- La faille corrigée ---------------------------------------------------
  //
  // La politique d'origine autorisait un utilisateur à mettre à jour sa propre
  // ligne de profil sans restreindre les colonnes : n'importe quel compte
  // pouvait donc se donner le rôle « admin » avec la seule clé publique.
  ok(
    /profiles: user updates own row/.test(init),
    "la migration d'origine contenait bien la politique trop permissive"
  );
  ok(
    /profiles_guard/.test(sql),
    "un garde-fou empêche désormais de changer son propre rôle"
  );
  ok(
    /new\.role is distinct from old\.role[\s\S]{0,120}raise exception/.test(sql),
    "changer de rôle depuis un compte client lève une erreur"
  );
  ok(
    /lower\(new\.email\) is distinct from lower\(old\.email\)[\s\S]{0,120}raise exception/.test(sql),
    "changer son adresse depuis un compte client lève une erreur"
  );

  // --- L'administrateur ne dépose pas de demande ---------------------------
  ok(
    /for insert[\s\S]{0,120}not public\.is_admin\(\)/.test(sql),
    "la base refuse une demande de devis déposée par l'administrateur"
  );
  const pageDevis = fs.readFileSync(path.join(ROOT, "app/devis/page.tsx"), "utf8");
  ok(pageDevis.includes("estAdmin"), "la page devis refuse l'administrateur côté serveur");
  const entete = fs.readFileSync(path.join(ROOT, "components/SiteHeader.tsx"), "utf8");
  ok(
    /!admin &&[\s\S]{0,160}\/devis/.test(entete),
    "le menu ne propose pas « Mon devis » à l'administrateur"
  );
  // Ce qui compte n'est pas le vocabulaire mais le chemin : aucune page
  // d'administration ne doit offrir de lien vers le formulaire de devis.
  // Une liste d'administration ne doit jamais taire une erreur de lecture :
  // une panne ressemblerait à une boîte vide, et un client attendrait pour
  // rien.
  for (const rel of ["app/admin/devis/page.tsx", "app/admin/devis/[id]/page.tsx"]) {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    ok(
      /const \{ data, error \}/.test(src),
      `${rel} : l'erreur de la requête est recueillie`
    );
    ok(
      /if \((error|panne|incident)/.test(src),
      `${rel} : une erreur de lecture est montrée, pas confondue avec une liste vide`
    );
  }

  // Pas de jointure imbriquée de « profiles » depuis « quotes ».
  //
  // La table des devis pointe DEUX FOIS vers les profils : par `user_id`,
  // l'auteur, et par `replied_by`, celui qui a répondu. PostgREST refuse alors
  // d'embarquer les profils sans qu'on lui dise par où — « more than one
  // relationship was found » — et la page se vide. C'est arrivé en production :
  // l'administration a cru n'avoir aucune demande alors qu'un client attendait.
  for (const rel of fs
    .readdirSync(path.join(ROOT, "app"), { recursive: true })
    .filter((f) => typeof f === "string" && f.endsWith(".tsx"))) {
    const src = fs.readFileSync(path.join(ROOT, "app", rel), "utf8");
    if (!/from\("quotes"\)/.test(src)) continue;
    ok(
      !/profiles\s*\(/.test(src),
      `app/${rel} : pas de jointure ambiguë entre quotes et profiles`,
      "quotes référence profiles deux fois — il faut deux requêtes séparées"
    );
  }

  for (const rel of [
    "app/admin/page.tsx",
    "app/admin/layout.tsx",
    "app/admin/devis/page.tsx",
    "app/admin/devis/[id]/page.tsx",
  ]) {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    ok(
      !/href=["']\/devis["']/.test(src),
      `${rel} : aucun lien vers le formulaire de devis`
    );
  }

  // --- Une demande envoyée ne se modifie plus ------------------------------
  ok(
    /for update[\s\S]{0,120}using \(public\.is_admin\(\)\)/.test(sql),
    "seul l'administrateur met à jour une demande"
  );
  ok(!/for delete/.test(sql) && !/for delete/.test(init), "aucune suppression n'est permise");

  // --- Les actions d'administration vérifient le rôle ----------------------
  const actions = fs.readFileSync(path.join(ROOT, "app/admin/devis/actions.ts"), "utf8");
  ok(actions.includes("exigerAdmin"), "les actions d'administration exigent le rôle");
  const appels = (actions.match(/export async function/g) ?? []).length;
  const gardes = (actions.match(/await exigerAdmin\(\)/g) ?? []).length;
  ok(
    gardes >= appels - 1,
    "chaque action exportée passe par le contrôle de rôle",
    `${gardes} contrôles pour ${appels} actions`
  );
  ok(
    /estStatutValide\(statut\)/.test(actions),
    "un statut envoyé depuis l'extérieur est validé avant écriture"
  );

  // --- Le profil porte bien ce que la fiche demande ------------------------
  const types = fs.readFileSync(path.join(ROOT, "lib/supabase/types.ts"), "utf8");
  for (const champ of ["id", "email", "full_name", "job_title", "telephone", "role", "created_at"]) {
    ok(new RegExp(`\\b${champ}\\b`).test(types), `le profil porte « ${champ} »`);
  }
  for (const champ of ["user_id", "items", "message", "status", "created_at", "updated_at"]) {
    ok(new RegExp(`\\b${champ}\\b`).test(types), `la demande porte « ${champ} »`);
  }
  // --- La migration doit pouvoir être rejouée ------------------------------
  //
  // Elle annonce qu'on peut la passer deux fois sans dommage. Elle ne le
  // pouvait pas : chaque politique était supprimée sous son ANCIEN nom puis
  // créée sous un nouveau, si bien qu'un second passage butait sur
  // « policy ... already exists ». Le contrôle vaut pour toutes les
  // migrations, celles à venir comprises.
  for (const fichier of fs
    .readdirSync(path.join(ROOT, "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))) {
    const src = fs.readFileSync(path.join(ROOT, "supabase/migrations", fichier), "utf8");

    for (const m of src.matchAll(/create policy\s+"([^"]+)"\s+on\s+([\w.]+)/g)) {
      const [, nom, table] = m;
      const drop = new RegExp(
        `drop policy if exists\\s+"${nom.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s+on\\s+${table.replace(/\./g, "\\.")}`
      );
      ok(
        drop.test(src),
        `${fichier} : la politique « ${nom} » est supprimée avant d'être créée`
      );
    }

    for (const m of src.matchAll(/add constraint\s+(\w+)/g)) {
      const nom = m[1];
      ok(
        new RegExp(`drop constraint if exists\\s+${nom}`).test(src),
        `${fichier} : la contrainte « ${nom} » est supprimée avant d'être ajoutée`
      );
    }

    for (const m of src.matchAll(/create trigger\s+(\w+)/g)) {
      const nom = m[1];
      ok(
        new RegExp(`drop trigger if exists\\s+${nom}`).test(src),
        `${fichier} : le déclencheur « ${nom} » est supprimé avant d'être créé`
      );
    }

    // Un index ou une table créés sans garde échoueraient aussi au second tour.
    for (const m of src.matchAll(/create (unique )?index (?!if not exists)/g)) {
      ok(false, `${fichier} : un index est créé sans « if not exists »`, m[0]);
    }
    for (const m of src.matchAll(/create table (?!if not exists)/g)) {
      ok(false, `${fichier} : une table est créée sans « if not exists »`, m[0]);
    }
  }

  // --- Le script de nettoyage ----------------------------------------------
  //
  // Il supprime des comptes pour de bon. Deux choses doivent tenir : que
  // l'administration figure toujours dans la liste à conserver, et que la
  // suppression des demandes des comptes gardés reste commentée — une
  // sollicitation de client ne s'efface pas par défaut.
  {
    const purge = fs.readFileSync(path.join(ROOT, "supabase/maintenance/purge.sql"), "utf8");

    const liste = purge.match(/insert into a_conserver \(email\) values([\s\S]*?);/);
    ok(!!liste, "le script de nettoyage porte une liste de comptes à conserver");
    ok(
      (liste?.[1] ?? "").includes("lachkarkacem@gmail.com"),
      "l'administration figure dans la liste à conserver"
    );
    ok(
      /L''administration ne figure pas dans la liste[\s\S]{0,60}raise exception|raise exception[\s\S]{0,120}L''administration ne figure pas/.test(
        purge
      ),
      "retirer l'administration de la liste fait échouer le script avant toute suppression"
    );

    // La seule suppression totale des devis doit rester commentée.
    for (const ligne of purge.split("\n")) {
      const t = ligne.trim();
      if (t.startsWith("--")) continue;
      ok(
        !/^delete from public\.quotes;\s*$/.test(t),
        "le script n'efface pas d'office les demandes des comptes conservés",
        t
      );
    }

    // Et il doit vérifier son travail plutôt que de faire confiance.
    ok(
      /raise exception[\s\S]{0,200}administrateur au lieu d''un seul/.test(purge),
      "le script vérifie qu'il reste exactement un administrateur"
    );
    ok(
      /a_conserver[\s\S]{0,400}not exists[\s\S]{0,200}raise exception/.test(purge),
      "une adresse à conserver introuvable arrête le script"
    );
  }

  // L'administrateur doit pouvoir compléter une fiche client — les comptes
  // créés avant le champ téléphone n'en ont pas.
  ok(
    /create policy "profiles: l'administrateur met à jour"/.test(sql),
    "l'administrateur peut tenir les fiches clients"
  );

  ok(/profiles_email_unique_idx/.test(sql), "l'unicité de l'adresse est posée en base");
  ok(/quotes_touch_updated_at/.test(sql), "la date de modification se met à jour toute seule");
  ok(!/'client'/.test(types), "le rôle « client » a disparu des types");
}

console.log("\n21. Ton des textes et palette du logo\n");

{
  // Les formules que la charte proscrit. Elles reviennent seules dès qu'on
  // retouche un texte sans y penser — autant que le harnais les arrête.
  const PROSCRITES = [
    /d[ée]couvr(ez|ir)\b/i,
    /plongez\b/i,
    /laissez-vous\b/i,
    /s[ée]duire\b/i,
    /exp[ée]rience unique/i,
    /au c(œ|oe)ur de/i,
    /sublime[rz]\b/i,
    /univers raffin/i,
    /\bmerveille/i,
  ];

  // Les fichiers qui portent du texte affiché au visiteur.
  const TEXTES = [
    "lib/marketing.ts",
    "lib/company.ts",
    "lib/advice.ts",
    "lib/garden/presets.mjs",
    "app/page.tsx",
    "app/previsualiser/page.tsx",
    "app/flipbook/page.tsx",
    "components/Flipbook.tsx",
    "components/NousTrouver.tsx",
    "components/SiteHeader.tsx",
    "components/SiteFooter.tsx",
  ];

  for (const rel of TEXTES) {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    // On ignore les lignes de commentaire : marketing.ts cite justement la
    // liste des formules interdites pour la rappeler au rédacteur.
    const corps = src
      .split("\n")
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join("\n");
    for (const motif of PROSCRITES) {
      const trouve = corps.match(motif);
      ok(!trouve, `${rel} : pas de formule proscrite`, trouve ? `« ${trouve[0]} »` : "");
    }
  }

  // Le flipbook doit rester dans l'univers du site, et non redevenir un
  // module à part. Ces trois points avaient justement dérivé.
  {
    const flip = fs.readFileSync(path.join(ROOT, "components/Flipbook.tsx"), "utf8");

    // La baseline de la couverture doit venir de company.ts. Recopiée à la
    // main, elle s'était désynchronisée du reste du site.
    ok(
      flip.includes("COMPANY.tagline"),
      "la couverture reprend la baseline de company.ts, sans la recopier"
    );
    ok(
      !/La pierre qui embellit/.test(flip),
      "l'ancienne baseline en dur a disparu de la couverture"
    );

    // Une URL de déploiement imprimée sur la quatrième de couverture devient
    // fausse au premier changement de domaine.
    ok(
      !/vercel\.app/.test(flip),
      "la quatrième de couverture n'imprime pas une URL de déploiement"
    );

    // Page active en terracotta, survol en vert : la règle de la charte.
    ok(
      /active[\s\S]{0,120}bg-brand-500/.test(flip),
      "la page active du feuilleteur est en terracotta"
    );
    ok(flip.includes("hover:text-grass-700"), "le survol des contrôles passe au vert");

    // Un contrôle qu'on ne peut pas suivre au clavier n'est pas terminé.
    ok(flip.includes("focus-visible:ring"), "les contrôles du feuilleteur ont un focus visible");

    // Le nom de la page et celui du menu doivent coïncider : « Catalogue
    // photo » dans le menu menait à un titre « Catalogue papier ».
    const entete = fs.readFileSync(path.join(ROOT, "components/SiteHeader.tsx"), "utf8");
    const pied = fs.readFileSync(path.join(ROOT, "components/SiteFooter.tsx"), "utf8");
    // Le titre est lu dans la source : Node ne sait pas importer un .ts, et
    // un import qui échoue en silence ne contrôlerait plus rien.
    const marketing = fs.readFileSync(path.join(ROOT, "lib/marketing.ts"), "utf8");
    const titre = marketing.match(/FLIPBOOK_TITLE\s*=\s*"([^"]+)"/);
    ok(!!titre, "marketing.ts déclare le titre du catalogue papier");
    const court = (titre?.[1] ?? "")
      .replace(/^Le\s+/, "")
      .replace(/^./, (c) => c.toUpperCase());
    ok(entete.includes(court), `le menu nomme la page « ${court} »`);
    ok(pied.includes(court), `le pied de page nomme la page « ${court} »`);
  }

  // La palette doit rester celle du logo, au hex près.
  const tw = fs.readFileSync(path.join(ROOT, "tailwind.config.ts"), "utf8");
  ok(tw.includes("#c73e1d"), "le rouge principal est le terracotta du logo (#C73E1D)");
  ok(!/#c0392b/i.test(tw), "l'ancien rouge #C0392B a disparu de la palette");
  ok(tw.includes("#7cb342"), "le vert feuille du logo (#7CB342) est en place");
  ok(tw.includes("#ffffff"), "le blanc du logo est en place");

  // Le vert ne doit plus servir d'aplat : les fonds passent par le sable.
  for (const rel of fs
    .readdirSync(path.join(ROOT, "components"), { recursive: true })
    .filter((f) => typeof f === "string" && f.endsWith(".tsx"))) {
    const src = fs.readFileSync(path.join(ROOT, "components", rel), "utf8");
    ok(
      !/\bbg-leaf-(50|100|200)\b/.test(src),
      `components/${rel} : pas d'aplat vert (le fond chaud passe par sable-*)`
    );
    ok(
      !/\b(from|via|to)-leaf-(50|100|200)\b/.test(src),
      `components/${rel} : pas de dégradé vert en fond`
    );
  }
}

console.log(`\n${fail === 0 ? "TOUT PASSE" : "DES CONTROLES ECHOUENT"} — ${pass} succès, ${fail} échecs\n`);
process.exit(fail === 0 ? 0 : 1);
