// Passage d'une scène three.js aux données que lisent les écrivains de
// formats. THREE est injecté, comme partout ailleurs dans ce projet.
//
// Tout est ramené dans le repère du monde ici, une fois pour toutes : les
// écrivains n'ont alors aucune matrice à transcrire, et les fichiers produits
// ne peuvent pas se retrouver décalés ou retournés.

import { colladaDocument, mtlDocument, identifiant } from "@/lib/export/formats.mjs";

/**
 * Relève les mailles et les matières d'un objet three.js.
 * @param {any} THREE
 * @param {any} racine
 */
export function releve(THREE, racine) {
  racine.updateMatrixWorld(true);

  const meshes = [];
  const matieres = new Map();
  const normale = new THREE.Matrix3();
  const v = new THREE.Vector3();

  racine.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;

    const geo = o.geometry;
    const attrPos = geo.getAttribute("position");
    if (!attrPos) return;

    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    const nomMat = mat?.name || "matiere";
    if (!matieres.has(nomMat)) {
      const c = mat?.color;
      matieres.set(nomMat, { id: nomMat, color: c ? [c.r, c.g, c.b] : [0.8, 0.8, 0.8] });
    }

    // Positions dans le repère du monde.
    const positions = new Float32Array(attrPos.count * 3);
    for (let i = 0; i < attrPos.count; i++) {
      v.fromBufferAttribute(attrPos, i).applyMatrix4(o.matrixWorld);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    }

    // Les normales ne subissent pas la matrice du monde mais sa normale —
    // l'inverse transposée. Avec une mise à l'échelle non uniforme, les
    // transformer comme des points les ferait pointer de travers, et
    // l'éclairage du logiciel de destination serait faux.
    let normales = null;
    const attrNor = geo.getAttribute("normal");
    if (attrNor && attrNor.count === attrPos.count) {
      normale.getNormalMatrix(o.matrixWorld);
      normales = new Float32Array(attrNor.count * 3);
      for (let i = 0; i < attrNor.count; i++) {
        v.fromBufferAttribute(attrNor, i).applyMatrix3(normale).normalize();
        normales[i * 3] = v.x;
        normales[i * 3 + 1] = v.y;
        normales[i * 3 + 2] = v.z;
      }
    }

    // Une géométrie non indexée décrit ses triangles dans l'ordre.
    const index = geo.getIndex();
    const indices = index
      ? Array.from(index.array)
      : Array.from({ length: attrPos.count }, (_, i) => i);

    meshes.push({
      name: o.name || nomMat,
      material: nomMat,
      positions,
      normals: normales,
      indices,
    });
  });

  return { meshes, matieres: [...matieres.values()] };
}

/**
 * Document Collada d'un objet three.js.
 * @param {any} THREE @param {any} racine @param {string} nom
 */
export function versCollada(THREE, racine, nom) {
  const { meshes, matieres } = releve(THREE, racine);
  return colladaDocument({ nom, meshes, matieres });
}

/**
 * Fichier de matières accompagnant un OBJ.
 * @param {any} THREE @param {any} racine
 */
export function versMtl(THREE, racine) {
  const { matieres } = releve(THREE, racine);
  return mtlDocument(matieres);
}

/**
 * L'OBJ de three.js ne pose pas de `mtllib` : sans cette ligne, le logiciel
 * de destination ignore le fichier de matières posé à côté et la pièce
 * arrive en gris.
 *
 * @param {string} obj @param {string} nomMtl
 */
export function rattacheMtl(obj, nomMtl) {
  const sansAncien = obj.replace(/^mtllib .*$/gm, "").replace(/^\s*\n/, "");
  return `mtllib ${nomMtl}\n${sansAncien}`;
}

export { identifiant };
