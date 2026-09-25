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

console.log(`\n${fail === 0 ? "TOUT PASSE" : "DES CONTROLES ECHOUENT"} — ${pass} succès, ${fail} échecs\n`);
process.exit(fail === 0 ? 0 : 1);
