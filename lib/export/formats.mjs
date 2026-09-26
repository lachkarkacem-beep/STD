// Écriture des formats d'échange 3D.
//
// three.js fournit les exportateurs GLB, OBJ, STL et PLY. Il ne fournit plus
// Collada (.dae), retiré de ses exemples — or c'est le format que SketchUp,
// AutoCAD et la plupart des logiciels de paysage importent nativement. On
// l'écrit donc ici : du XML, rien de plus.
//
// Ces fonctions ne connaissent pas three.js. Elles prennent des tableaux de
// nombres et rendent du texte, ce qui permet au harnais de les vérifier
// entièrement, sans WebGL ni navigateur.

/**
 * @typedef {{
 *   name: string,
 *   material: string,
 *   positions: number[] | Float32Array,
 *   normals?: number[] | Float32Array | null,
 *   indices: number[] | Uint16Array | Uint32Array,
 * }} MailleExport
 *
 * @typedef {{ id: string, color: [number, number, number] }} MatiereExport
 */

/** Six décimales : le millième de millimètre, et des fichiers deux fois plus légers. */
const arrondi = (v) => {
  const n = Math.round(v * 1e6) / 1e6;
  return Object.is(n, -0) ? 0 : n;
};

const nombres = (tableau) => Array.from(tableau, arrondi).join(" ");

/** Le XML n'admet ni & ni < dans du texte, et les noms de pièces en contiennent. */
export function echappeXml(texte) {
  return String(texte ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Un identifiant XML ne commence pas par un chiffre et n'a pas d'espaces. */
export function identifiant(brut) {
  const nettoye = String(brut ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9_-]/g, "_");
  return /^[A-Za-z_]/.test(nettoye) ? nettoye : `_${nettoye}`;
}

/**
 * Fichier MTL accompagnant un OBJ. Sans lui, la pièce arrive en gris dans le
 * logiciel de destination : le coloris choisi serait perdu.
 *
 * @param {MatiereExport[]} matieres
 */
export function mtlDocument(matieres) {
  const lignes = ["# Société Tunisienne de Décoration", ""];
  for (const m of matieres) {
    const [r, v, b] = m.color;
    lignes.push(
      `newmtl ${identifiant(m.id)}`,
      `Kd ${arrondi(r)} ${arrondi(v)} ${arrondi(b)}`,
      // Un peu d'ambiant et un spéculaire éteint : la pierre ne brille pas.
      `Ka ${arrondi(r * 0.3)} ${arrondi(v * 0.3)} ${arrondi(b * 0.3)}`,
      "Ks 0 0 0",
      "Ns 10",
      "d 1",
      "illum 2",
      ""
    );
  }
  return lignes.join("\n");
}

/**
 * Document Collada 1.4.1.
 *
 * Les sommets sont attendus DÉJÀ dans le repère du monde : chaque nœud de la
 * scène est donc à l'identité, ce qui évite d'avoir à transcrire les matrices
 * et supprime une source d'erreur entière.
 *
 * @param {{ nom?: string, meshes: MailleExport[], matieres: MatiereExport[] }} scene
 */
export function colladaDocument({ nom = "modele", meshes, matieres }) {
  const date = new Date().toISOString();

  const effets = matieres
    .map((m) => {
      const id = identifiant(m.id);
      const [r, v, b] = m.color;
      return `    <effect id="${id}-effet">
      <profile_COMMON>
        <technique sid="common">
          <lambert>
            <diffuse><color sid="diffuse">${arrondi(r)} ${arrondi(v)} ${arrondi(b)} 1</color></diffuse>
          </lambert>
        </technique>
      </profile_COMMON>
    </effect>`;
    })
    .join("\n");

  const materiaux = matieres
    .map((m) => {
      const id = identifiant(m.id);
      return `    <material id="${id}-materiau" name="${echappeXml(m.id)}"><instance_effect url="#${id}-effet"/></material>`;
    })
    .join("\n");

  const geometries = meshes
    .map((maille, i) => {
      const id = `geom-${i}`;
      const nbSommets = maille.positions.length / 3;
      const aNormales = !!maille.normals && maille.normals.length === maille.positions.length;

      // Collada entrelace les entrées : avec deux sources, chaque triangle
      // cite deux indices par sommet. Ils sont identiques ici, puisque
      // positions et normales partagent la même numérotation.
      const triangles = [];
      for (const idx of maille.indices) {
        triangles.push(idx);
        if (aNormales) triangles.push(idx);
      }

      const sourceNormales = aNormales
        ? `
        <source id="${id}-normales">
          <float_array id="${id}-normales-tab" count="${maille.normals.length}">${nombres(maille.normals)}</float_array>
          <technique_common>
            <accessor source="#${id}-normales-tab" count="${nbSommets}" stride="3">
              <param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/>
            </accessor>
          </technique_common>
        </source>`
        : "";

      const entreeNormales = aNormales
        ? `\n          <input semantic="NORMAL" source="#${id}-normales" offset="1"/>`
        : "";

      return `    <geometry id="${id}" name="${echappeXml(maille.name)}">
      <mesh>
        <source id="${id}-positions">
          <float_array id="${id}-positions-tab" count="${maille.positions.length}">${nombres(maille.positions)}</float_array>
          <technique_common>
            <accessor source="#${id}-positions-tab" count="${nbSommets}" stride="3">
              <param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/>
            </accessor>
          </technique_common>
        </source>${sourceNormales}
        <vertices id="${id}-sommets">
          <input semantic="POSITION" source="#${id}-positions"/>
        </vertices>
        <triangles count="${maille.indices.length / 3}" material="${identifiant(maille.material)}-lien">
          <input semantic="VERTEX" source="#${id}-sommets" offset="0"/>${entreeNormales}
          <p>${triangles.join(" ")}</p>
        </triangles>
      </mesh>
    </geometry>`;
    })
    .join("\n");

  const noeuds = meshes
    .map((maille, i) => {
      const id = identifiant(maille.material);
      return `        <node id="noeud-${i}" name="${echappeXml(maille.name)}" type="NODE">
          <instance_geometry url="#geom-${i}">
            <bind_material>
              <technique_common>
                <instance_material symbol="${id}-lien" target="#${id}-materiau"/>
              </technique_common>
            </bind_material>
          </instance_geometry>
        </node>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
  <asset>
    <contributor>
      <author>Société Tunisienne de Décoration</author>
      <authoring_tool>societetunisennededecoration.vercel.app</authoring_tool>
    </contributor>
    <created>${date}</created>
    <modified>${date}</modified>
    <unit meter="1" name="meter"/>
    <up_axis>Y_UP</up_axis>
  </asset>
  <library_effects>
${effets}
  </library_effects>
  <library_materials>
${materiaux}
  </library_materials>
  <library_geometries>
${geometries}
  </library_geometries>
  <library_visual_scenes>
    <visual_scene id="scene" name="${echappeXml(nom)}">
${noeuds}
    </visual_scene>
  </library_visual_scenes>
  <scene>
    <instance_visual_scene url="#scene"/>
  </scene>
</COLLADA>
`;
}

/** Les formats proposés au téléchargement, dans l'ordre d'utilité. */
export const FORMATS = [
  {
    id: "glb",
    label: "GLB",
    extension: "glb",
    note: "Le format d'origine. Blender, Three.js, visionneuses web.",
  },
  {
    id: "dae",
    label: "DAE",
    extension: "dae",
    note: "Collada. SketchUp, AutoCAD, Cinema 4D.",
  },
  {
    id: "obj",
    label: "OBJ",
    extension: "zip",
    note: "Avec son fichier de matières, dans une archive. Lu par à peu près tout.",
  },
  {
    id: "stl",
    label: "STL",
    extension: "stl",
    note: "Géométrie seule, sans couleur. Pour l'impression 3D.",
  },
];

/** @param {string} id */
export function estFormatConnu(id) {
  return FORMATS.some((f) => f.id === id);
}
