// Catalog dimensions are authoritative (cm). Source: catalog page 1.
// Every viewer fits its procedural geometry to these numbers, so the rendered
// bounding box always matches the printed product spec rather than whatever the
// hand-built geometry happened to add via rim overhangs and relief protrusion.
// fit: 'exact'     — scale each axis independently to the printed box (true boxes).
// fit: 'uniformXZ' — scale width and depth by ONE factor so the section keeps its
//                    shape, sized to fit inside the printed envelope. Needed for
//                    hexagons and circles: a regular hexagon measures 0.866× across
//                    its flats as across its points, so forcing 40 × 40 would squash
//                    it into an irregular hexagon the product does not have.
export const CATALOG_DIMS = {
  B105: { width: 82, depth: 43, height: 40, fit: 'exact' },
  B84:  { width: 82, depth: 30, height: 40, fit: 'exact' },
  B42:  { width: 35, depth: 35, height: 40, fit: 'exact' },
  B62:  { width: 35, depth: 35, height: 60, fit: 'exact' },
  B58:  { width: 40, depth: 40, height: 43, fit: 'uniformXZ' },
  B30:  { width: 41, depth: 41, height: 41, fit: 'uniformXZ' }   // catalog prints H 41 / Diamètre 41
};

// Scales `group` so its world bounding box equals the catalog box exactly, and
// re-seats it on the ground plane. Returns the measured-before/after report so a
// page can surface the correction instead of hiding it.
export function fitToCatalog(THREE, group, ref) {
  const spec = CATALOG_DIMS[ref];
  if (!spec) throw new Error('No catalog dimensions for ' + ref);

  const target = { x: spec.width / 100, y: spec.height / 100, z: spec.depth / 100 };
  const before = new THREE.Box3().setFromObject(group, true).getSize(new THREE.Vector3());
  if (before.x <= 0 || before.y <= 0 || before.z <= 0) throw new Error('Empty geometry for ' + ref);

  const s = { x: target.x / before.x, y: target.y / before.y, z: target.z / before.z };
  if (spec.fit === 'uniformXZ') {
    const k = Math.min(s.x, s.z);   // largest section that still fits the envelope
    s.x = k; s.z = k;
  }
  group.scale.set(s.x, s.y, s.z);
  group.updateMatrixWorld(true);

  // Re-seat: base flush to y=0, centred on x/z.
  const box = new THREE.Box3().setFromObject(group, true);
  group.position.x -= (box.min.x + box.max.x) / 2;
  group.position.z -= (box.min.z + box.max.z) / 2;
  group.position.y -= box.min.y;
  group.updateMatrixWorld(true);

  const after = new THREE.Box3().setFromObject(group, true).getSize(new THREE.Vector3());
  return {
    ref,
    target_cm: spec,
    built_cm:  { width: +(before.x * 100).toFixed(1), depth: +(before.z * 100).toFixed(1), height: +(before.y * 100).toFixed(1) },
    fitted_cm: { width: +(after.x * 100).toFixed(1),  depth: +(after.z * 100).toFixed(1),  height: +(after.y * 100).toFixed(1) },
    correction: { x: +s.x.toFixed(4), y: +s.y.toFixed(4), z: +s.z.toFixed(4) }
  };
}
