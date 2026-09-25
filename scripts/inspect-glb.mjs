import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";

const dirs = process.argv.slice(2);

function glbJson(file) {
  const b = fs.readFileSync(file);
  return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString("utf8"));
}

function worldBox(json) {
  const parentOf = new Map();
  (json.nodes ?? []).forEach((n, i) => (n.children ?? []).forEach((c) => parentOf.set(c, i)));
  const box = new THREE.Box3();
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
  return box;
}

for (const dir of dirs) {
  const glbDir = path.join(dir, "glb");
  console.log(`\n### ${dir}\n`);
  console.log(
    "REF".padEnd(14),
    "Ko".padStart(6),
    "meshes".padStart(7),
    "prim".padStart(5),
    "sommets".padStart(8),
    "  L×P×H cm".padEnd(22),
    "matériaux"
  );
  for (const f of fs.readdirSync(glbDir).sort()) {
    const file = path.join(glbDir, f);
    const json = glbJson(file);
    const meshes = (json.meshes ?? []).length;
    const prims = (json.meshes ?? []).reduce((n, m) => n + (m.primitives ?? []).length, 0);
    const verts = (json.meshes ?? []).reduce(
      (n, m) =>
        n +
        (m.primitives ?? []).reduce(
          (k, p) => k + (json.accessors[p.attributes.POSITION]?.count ?? 0),
          0
        ),
      0
    );
    const box = worldBox(json);
    const size = box.getSize(new THREE.Vector3());
    const dims = box.isEmpty()
      ? "VIDE !!"
      : `${(size.x * 100).toFixed(0)}×${(size.z * 100).toFixed(0)}×${(size.y * 100).toFixed(0)}`;
    const grounded = Math.abs(box.min.y) < 0.005 ? "" : ` (y0=${box.min.y.toFixed(3)})`;
    console.log(
      f.replace(".glb", "").padEnd(14),
      String(Math.round(fs.statSync(file).size / 1024)).padStart(6),
      String(meshes).padStart(7),
      String(prims).padStart(5),
      String(verts).padStart(8),
      ("  " + dims + grounded).padEnd(22),
      (json.materials ?? []).map((m) => m.name).join(", ")
    );
  }
}
