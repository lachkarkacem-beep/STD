// Découpe du sol de la scène.
//
// En JavaScript simple, et hors de la classe de scène, pour que le harnais
// puisse vérifier sans navigateur qu'un bassin perce réellement la pelouse :
// c'est en l'oubliant que la piscine est restée invisible, l'eau se trouvant
// sous un plan opaque.

import * as THREE from "three";

const HALF = 60;

/**
 * Contour du sol, éventuellement percé à l'emplacement d'un bassin.
 *
 * Le plan est construit dans le plan XY puis basculé de -90° autour de X par
 * la scène : un point (x, y) s'y retrouve en (x, 0, -y). Le trou est donc
 * décrit avec un y opposé au z du bassin.
 *
 * @param {{ width: number, depth: number, x?: number, z?: number } | null} hole
 */
export function groundShape(hole) {
  const shape = new THREE.Shape();
  shape.moveTo(-HALF, -HALF);
  shape.lineTo(HALF, -HALF);
  shape.lineTo(HALF, HALF);
  shape.lineTo(-HALF, HALF);
  shape.closePath();

  if (hole) {
    // Le trou est très légèrement plus petit que le bassin : les margelles
    // recouvrent le joint, et aucun filet de sol ne transparaît.
    const hw = hole.width / 2 - 0.02;
    const hd = hole.depth / 2 - 0.02;
    const cx = hole.x ?? 0;
    const cy = -(hole.z ?? 0);
    const path = new THREE.Path();
    path.moveTo(cx - hw, cy - hd);
    path.lineTo(cx + hw, cy - hd);
    path.lineTo(cx + hw, cy + hd);
    path.lineTo(cx - hw, cy + hd);
    path.closePath();
    shape.holes.push(path);
  }

  return shape;
}

/** @param {{ width: number, depth: number, x?: number, z?: number } | null} hole */
export function groundGeometry(hole) {
  return new THREE.ShapeGeometry(groundShape(hole));
}

/**
 * Le sol couvre-t-il ce point ? Utilisé par les contrôles : après percement,
 * aucun triangle ne doit recouvrir le centre du bassin.
 *
 * @param {THREE.BufferGeometry} geometry
 * @param {number} x @param {number} z coordonnées dans la scène
 */
export function groundCovers(geometry, x, z) {
  const pos = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const count = index ? index.count : pos.count;
  // Repère du plan avant bascule : (x, y) avec y = -z.
  const py = -z;

  const at = (i) => {
    const k = index ? index.getX(i) : i;
    return { x: pos.getX(k), y: pos.getY(k) };
  };
  const sign = (ax, ay, bx, by, cx, cy) => (ax - cx) * (by - cy) - (bx - cx) * (ay - cy);

  for (let i = 0; i < count; i += 3) {
    const a = at(i);
    const b = at(i + 1);
    const c = at(i + 2);
    const d1 = sign(x, py, a.x, a.y, b.x, b.y);
    const d2 = sign(x, py, b.x, b.y, c.x, c.y);
    const d3 = sign(x, py, c.x, c.y, a.x, a.y);
    const neg = d1 < 0 || d2 < 0 || d3 < 0;
    const pos2 = d1 > 0 || d2 > 0 || d3 > 0;
    if (!(neg && pos2)) return true;
  }
  return false;
}
