// Parametric builders for the Lachkar range.
//
// Almost every reference in the catalog is one archetype: a hollow, open-topped
// vessel with a tapered wall and vertical fluting, on a foot, with a lip. Rather
// than hand-model each one, a product supplies its printed dimensions plus a
// small parameter block and the geometry is derived. This is what lets the
// catalog grow to hundreds of references.
//
// Every vessel is built HOLLOW: outer shell, inner lining, floor and a soil
// plane, with the top left open for planting.

const MAT = (THREE) => ({
  body:   new THREE.MeshStandardMaterial({ name: 'body',    color: 0xf2f0ec, roughness: 0.86, metalness: 0.01 }),
  mold:   new THREE.MeshStandardMaterial({ name: 'molding', color: 0xe8e5e0, roughness: 0.80, metalness: 0.01 }),
  inner:  new THREE.MeshStandardMaterial({ name: 'inner',   color: 0xd6d3cd, roughness: 0.90, metalness: 0.01 }),
  relief: new THREE.MeshStandardMaterial({ name: 'relief',  color: 0xf6f4f0, roughness: 0.84, metalness: 0.01 }),
  soil:   new THREE.MeshStandardMaterial({ name: 'soil',    color: 0x3d2510, roughness: 0.97, metalness: 0.00 })
});

function mesh(m, name) {
  m.name = name; m.castShadow = true; m.receiveShadow = true; return m;
}

// A 4-sided cylinder started at 45° has its four vertices on the axes, giving a
// unit square cross-section — a closed tapered box with no corner gaps.
//
// Width and depth are written straight into the vertices in metres. An earlier
// version scaled the mesh as well, which multiplied the depth ratio twice and
// built every rectangular bac at d²/w deep — the global fit then stretched it
// back to size, distorting the taper and the flutes. Never scale the mesh here.
function taperedBox(THREE, wTop, dTop, wBot, dBot, h, mat, open) {
  const g = new THREE.CylinderGeometry(Math.SQRT1_2, Math.SQRT1_2, h, 4, 1, !!open, Math.PI / 4);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const f = (y + h / 2) / h;                       // 0 at base, 1 at top
    // unit coords are ±0.5 on each axis
    pos.setX(i, pos.getX(i) * (wBot + (wTop - wBot) * f));
    pos.setZ(i, pos.getZ(i) * (dBot + (dTop - dBot) * f));
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return mesh(new THREE.Mesh(g, mat), 'shell');
}

/**
 * Fluted vessel — the workhorse. opts:
 *   W, D, H      printed dimensions in metres (outer, at the widest point)
 *   taper        base width ÷ top width (1 = straight, 0.7 = strongly flared)
 *   flutes       number of vertical ribs across the widest face (0 = none)
 *   fluteDepth   rib projection in metres
 *   fluteFrom/To fraction of the wall the ribs span (catalog shows a plain
 *                bandeau above them and a plain strip at the base)
 *   rim          'plain' | 'beaded' | 'none'
 *   foot         'feet' | 'plinth' | 'scalloped'
 *   wall         wall thickness
 */
export function buildFlutedVessel(THREE, opts) {
  const {
    W, D, H, taper = 0.88, flutes = 14, fluteDepth = 0.010,
    fluteFrom = 0.06, fluteTo = 0.80,
    rim = 'plain', foot = 'feet', wall = 0.018, name = 'vessel'
  } = opts;

  const M = MAT(THREE);
  const group = new THREE.Group();
  group.name = name;

  const footH   = foot === 'none' ? 0 : (foot === 'plinth' ? 0.030 : 0.022);
  const rimH    = rim === 'none' ? 0 : 0.024;
  const bodyBot = footH;
  const bodyTop = H - rimH;
  const bodyH   = bodyTop - bodyBot;

  // The printed dimension is the widest point of the finished product, so the
  // flutes live inside it: the shell is inset by their projection. Otherwise the
  // ribs push the bounding box past the catalog size and the global fit squeezes
  // the whole vessel to compensate.
  const relief = flutes > 0 ? fluteDepth : 0;
  const wTop = W - relief * 2, dTop = D - relief * 2;
  const wBot = wTop * taper, dBot = dTop * taper;
  const widthAt = f => wBot + (wTop - wBot) * f;
  const depthAt = f => dBot + (dTop - dBot) * f;

  // Shell + lining + floor: the planting cavity
  const shell = taperedBox(THREE, wTop, dTop, wBot, dBot, bodyH, M.body, true);
  shell.position.y = bodyBot + bodyH / 2;
  group.add(shell);

  const lin = taperedBox(THREE, wTop - wall * 2, dTop - wall * 2, wBot - wall * 2, dBot - wall * 2, bodyH, M.inner, true);
  lin.name = 'lining'; lin.position.y = bodyBot + bodyH / 2;
  group.add(lin);

  const fl = mesh(new THREE.Mesh(new THREE.BoxGeometry(wBot - wall * 2, 0.016, dBot - wall * 2), M.inner), 'floor');
  fl.position.y = bodyBot + 0.008;
  group.add(fl);

  const soil = mesh(new THREE.Mesh(new THREE.BoxGeometry(wTop - wall * 2 - 0.008, 0.002, dTop - wall * 2 - 0.008), M.soil), 'soil');
  soil.position.y = bodyTop - Math.min(0.055, bodyH * 0.18);
  group.add(soil);

  // Vertical fluting, leaning with the taper. The catalog shows the ribs
  // stopping short: a plain bandeau runs under the lip and a plain strip sits
  // at the foot, so the ribs occupy a band rather than the whole wall.
  if (flutes > 0) {
    const leanX = Math.atan2((wTop - wBot) / 2, bodyH);
    const leanZ = Math.atan2((dTop - dBot) / 2, bodyH);
    const r = fluteDepth;
    const mid = (fluteFrom + fluteTo) / 2;          // band centre, as a fraction
    const runH = (fluteTo - fluteFrom) * bodyH;     // band height
    const faces = [
      { rotY: 0,            span: 'w', lean: leanZ, half: () => depthAt(mid) / 2 },
      { rotY: Math.PI,      span: 'w', lean: leanZ, half: () => depthAt(mid) / 2 },
      { rotY: Math.PI / 2,  span: 'd', lean: leanX, half: () => widthAt(mid) / 2 },
      { rotY: -Math.PI / 2, span: 'd', lean: leanX, half: () => widthAt(mid) / 2 }
    ];
    faces.forEach((face, fi) => {
      const across = face.span === 'w' ? widthAt(mid) : depthAt(mid);
      const n = Math.max(3, Math.round(flutes * (across / Math.max(wTop, dTop))));
      const usable = across * 0.94;
      const step = usable / n;
      for (let i = 0; i < n; i++) {
        const x = -usable / 2 + (i + 0.5) * step;
        const holder = new THREE.Group();
        holder.name = `flute-holder-${fi}-${i}`;
        holder.rotation.y = face.rotY;
        holder.position.y = bodyBot + mid * bodyH;
        const g = new THREE.CylinderGeometry(r, r, runH, 8, 1, false, -Math.PI / 2, Math.PI);
        const m = mesh(new THREE.Mesh(g, M.relief), `flute-${fi}-${i}`);
        m.position.set(x, 0, face.half());
        m.rotation.x = face.lean;   // MUST match the wall's slope, not oppose it
        holder.add(m);
        group.add(holder);
      }
    });
  }

  // Lip
  if (rim === 'plain' || rim === 'beaded') {
    const over = 0.012;
    const inW = wTop - wall * 2, inD = dTop - wall * 2;
    const oW = wTop + over * 2, oD = dTop + over * 2;

    // Both courses of the lip are FRAMES, never slabs: a solid box here would
    // cap the vessel and there would be nowhere to plant.
    const frame = (prefix, outerW, outerD, innerW, innerD, h, y) => {
      const sideD = (outerD - innerD) / 2;
      const sideW = (outerW - innerW) / 2;
      [
        [prefix + '-f', outerW, sideD, 0,  (innerD + sideD) / 2],
        [prefix + '-b', outerW, sideD, 0, -(innerD + sideD) / 2],
        [prefix + '-l', sideW, innerD, -(innerW + sideW) / 2, 0],
        [prefix + '-r', sideW, innerD,  (innerW + sideW) / 2, 0]
      ].forEach(([nm, bw, bd, bx, bz]) => {
        const bar = mesh(new THREE.Mesh(new THREE.BoxGeometry(bw, h, bd), M.mold), nm);
        bar.position.set(bx, y, bz);
        group.add(bar);
      });
    };

    frame('rim', oW, oD, inW, inD, rimH * 0.55, bodyTop + rimH * 0.275);
    frame('rim-top', oW, oD, inW, inD, rimH * 0.45, bodyTop + rimH * 0.55 + rimH * 0.225);
    if (rim === 'beaded') {
      // dentil/pearl course under the lip
      const pr = 0.007, gap = pr * 2.6;
      const runs = [
        { n: Math.floor(wTop / gap), axis: 'x', z:  dTop / 2 + over * 0.4 },
        { n: Math.floor(wTop / gap), axis: 'x', z: -dTop / 2 - over * 0.4 },
        { n: Math.floor(dTop / gap), axis: 'z', z:  wTop / 2 + over * 0.4 },
        { n: Math.floor(dTop / gap), axis: 'z', z: -wTop / 2 - over * 0.4 }
      ];
      runs.forEach((run, ri) => {
        const len = run.axis === 'x' ? wTop : dTop;
        for (let i = 0; i < run.n; i++) {
          const p = -len / 2 + (i + 0.5) * (len / run.n);
          const b = mesh(new THREE.Mesh(new THREE.SphereGeometry(pr, 8, 6), M.mold), `bead-${ri}-${i}`);
          if (run.axis === 'x') b.position.set(p, bodyTop - pr, run.z);
          else b.position.set(run.z, bodyTop - pr, p);
          group.add(b);
        }
      });
    }
  }

  // Foot
  if (foot === 'feet') {
    const fw = Math.min(0.09, wBot * 0.22), fd = Math.min(0.05, dBot * 0.30);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) => {
      const f = mesh(new THREE.Mesh(new THREE.BoxGeometry(fw, footH, fd), M.mold), `foot-${i}`);
      f.position.set(sx * (wBot / 2 - fw / 2 - 0.006), footH / 2, sz * (dBot / 2 - fd / 2 - 0.004));
      group.add(f);
    });
  } else if (foot === 'plinth') {
    const p1 = mesh(new THREE.Mesh(new THREE.BoxGeometry(wBot + 0.024, footH * 0.55, dBot + 0.024), M.mold), 'plinth-lo');
    p1.position.y = footH * 0.275; group.add(p1);
    const p2 = mesh(new THREE.Mesh(new THREE.BoxGeometry(wBot + 0.010, footH * 0.45, dBot + 0.010), M.mold), 'plinth-hi');
    p2.position.y = footH * 0.55 + footH * 0.225; group.add(p2);
  } else if (foot === 'scalloped') {
    // wavy skirt: lobes around the base, as on the BS series
    const lobes = Math.max(8, Math.round((wBot + dBot) * 14));
    for (let i = 0; i < lobes; i++) {
      const t = i / lobes;
      const per = Math.round(lobes * (wBot / (wBot + dBot)) / 2) || 1;
      const s = mesh(new THREE.Mesh(new THREE.SphereGeometry(footH * 0.7, 8, 6), M.mold), `lobe-${i}`);
      const a = t * Math.PI * 2;
      s.position.set(Math.cos(a) * wBot * 0.5, footH * 0.5, Math.sin(a) * dBot * 0.5);
      s.scale.set(1, 0.8, 1);
      group.add(s);
      void per;
    }
    const pad = mesh(new THREE.Mesh(new THREE.BoxGeometry(wBot * 0.9, footH * 0.5, dBot * 0.9), M.mold), 'foot-pad');
    pad.position.y = footH * 0.25; group.add(pad);
  }

  return group;
}

/**
 * Vasque sur piédouche (P 2008) — a Medici-form urn, read off the catalog
 * photograph: wide square plinth, spreading round foot, short waisted stem,
 * an egg-cup bowl whose lower half carries bulbous gadroons, a plain concave
 * sweep above them, a heavy reeded rim roll, and two scroll volutes springing
 * from the rim. Built directly at the printed size (geometry.prebuilt).
 */
export function buildUrn(THREE, opts) {
  const { diameter, H, name = 'urn' } = opts;
  const M = MAT(THREE);
  const group = new THREE.Group();
  group.name = name;

  const R = diameter / 2;
  const segs = 64;

  // Silhouette control points, measured off the photograph as fractions of the
  // overall height and of the rim radius. The lathe runs from the foot upward;
  // the plinth is a square block and is built separately.
  const CTRL = [
    [0.088, 0.46], [0.130, 0.40], [0.190, 0.28], [0.240, 0.21],
    [0.294, 0.185], [0.315, 0.20], [0.370, 0.29], [0.450, 0.42],
    [0.550, 0.53], [0.630, 0.595], [0.700, 0.635], [0.780, 0.705],
    [0.835, 0.800], [0.885, 0.905], [0.940, 0.970], [1.000, 1.000]
  ];

  // Catmull-Rom through the control points, so the ogee reads as a curve
  // rather than the faceted cone a linear profile would give.
  const curve = new THREE.CatmullRomCurve3(
    CTRL.map(([y, r]) => new THREE.Vector3(r * R, y * H, 0))
  );
  const SAMPLES = 96;
  const prof = curve.getSpacedPoints(SAMPLES);
  const radiusAt = y => {
    let best = prof[0];
    for (const p of prof) if (Math.abs(p.y - y) < Math.abs(best.y - y)) best = p;
    return best.x;
  };

  // Outer shell
  const outer = new THREE.Mesh(
    new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(Math.max(p.x, 0.004), p.y)), segs),
    M.body
  );
  group.add(mesh(outer, 'bowl'));

  // Cavity: the bowl is hollow from just above the stem to under the rim.
  const wall = 0.022;
  const cavBot = 0.36 * H;
  const inner = prof
    .filter(p => p.y >= cavBot)
    .map(p => new THREE.Vector2(Math.max(p.x - wall, 0.004), p.y));
  if (inner.length > 1) {
    group.add(mesh(new THREE.Mesh(new THREE.LatheGeometry(inner, segs), M.inner), 'bowl-lining'));
  }
  const floorR = Math.max(radiusAt(cavBot) - wall, 0.02);
  const fl = mesh(new THREE.Mesh(new THREE.CylinderGeometry(floorR, floorR, 0.02, segs), M.inner), 'floor');
  fl.position.y = cavBot + 0.01;
  group.add(fl);
  const soilR = Math.max(radiusAt(0.86 * H) - wall - 0.006, 0.03);
  const soil = mesh(new THREE.Mesh(new THREE.CylinderGeometry(soilR, soilR, 0.002, segs), M.soil), 'soil');
  soil.position.y = 0.86 * H;
  group.add(soil);

  // Square plinth, with a chamfered cap course above it
  const pw = R * 1.28;
  const pl = mesh(new THREE.Mesh(new THREE.BoxGeometry(pw, 0.055 * H, pw), M.mold), 'plinth');
  pl.position.y = 0.0275 * H;
  group.add(pl);
  const cap = mesh(new THREE.Mesh(new THREE.BoxGeometry(pw * 0.86, 0.033 * H, pw * 0.86), M.mold), 'plinth-cap');
  cap.position.y = 0.055 * H + 0.0165 * H;
  group.add(cap);

  // Gadroons: bulbous lobes on the lower bowl, broad at the top and tapering
  // to a point at the stem. Each follows the profile chord, so it lies on the
  // surface instead of spiking off it (the rib-lean lesson: match, never negate).
  const gad = 24;
  const gy0 = 0.335 * H, gy1 = 0.630 * H;
  const gr0 = radiusAt(gy0), gr1 = radiusAt(gy1);
  const lean = Math.atan2(gr1 - gr0, gy1 - gy0);
  const chord = Math.hypot(gr1 - gr0, gy1 - gy0);
  const rMid = (gr0 + gr1) / 2, yMid = (gy0 + gy1) / 2;
  const lobeTop = (2 * Math.PI * gr1 / gad) * 0.46;
  const lobeBot = (2 * Math.PI * gr0 / gad) * 0.42;
  for (let i = 0; i < gad; i++) {
    const a = (i / gad) * Math.PI * 2;
    const holder = new THREE.Group();
    holder.name = 'gadroon-holder-' + i;
    holder.rotation.y = -a;
    holder.position.y = yMid;
    const g = new THREE.CylinderGeometry(lobeTop, lobeBot, chord, 10, 1, false, -Math.PI / 2, Math.PI);
    const m = mesh(new THREE.Mesh(g, M.relief), 'gadroon-' + i);
    m.position.set(0, 0, rMid);
    m.rotation.x = lean;
    holder.add(m);
    group.add(holder);
  }

  // Rim: a heavy roll, reeded with short bars, over the lathe's flare
  const rimY = 0.955 * H;
  const rimR = radiusAt(rimY);
  const roll = mesh(new THREE.Mesh(new THREE.TorusGeometry(rimR - 0.020, 0.020, 12, segs), M.mold), 'rim-roll');
  roll.rotation.x = Math.PI / 2;
  roll.position.y = rimY;
  group.add(roll);
  const reeds = 56;
  for (let i = 0; i < reeds; i++) {
    const a = (i / reeds) * Math.PI * 2;
    const holder = new THREE.Group();
    holder.name = 'reed-holder-' + i;
    holder.rotation.y = -a;
    holder.position.y = rimY;
    const rd = mesh(new THREE.Mesh(new THREE.BoxGeometry((2 * Math.PI * rimR / reeds) * 0.44, 0.030, 0.012), M.mold), 'reed-' + i);
    rd.position.set(0, 0, rimR - 0.012);
    holder.add(rd);
    group.add(holder);
  }
  const top = new THREE.Mesh(new THREE.RingGeometry(Math.max(rimR - wall - 0.020, 0.03), R, segs), M.mold);
  top.name = 'rim-top';
  top.position.y = H;
  top.rotation.x = -Math.PI / 2;
  group.add(top);

  // Scroll volutes springing from the rim, curling outward and down
  [-1, 1].forEach((s, i) => {
    const holder = new THREE.Group();
    holder.name = 'handle-holder-' + i;
    holder.rotation.y = s > 0 ? 0 : Math.PI;
    const sr = R * 0.17;
    const arc = mesh(new THREE.Mesh(new THREE.TorusGeometry(sr, R * 0.048, 10, 30, Math.PI * 1.5), M.mold), 'handle-' + i);
    // torus plane is XY; leave it vertical and tuck it against the rim
    arc.rotation.z = -Math.PI * 0.35;
    arc.position.set(0, 0, R * 0.90);
    arc.rotation.y = Math.PI / 2;
    holder.position.y = 0.855 * H;
    holder.add(arc);
    group.add(holder);
  });

  return group;
}

/**
 * Colonne (C-series). Plinth, moulded base, shaft, capital. The catalog's
 * "C" prefix on the diameter marks a CONICAL shaft; a bare Ø is a straight
 * cylinder. Fluting is carved by modulating the shaft radius per radial
 * segment, so the grooves are real geometry and the silhouette scallops —
 * not stripes painted on a smooth cylinder.
 */
export function buildColumn(THREE, opts) {
  const { H, diameter, base, conical = false, fluted = false,
          capital = 'abacus', name = 'column' } = opts;
  const M = MAT(THREE);
  const group = new THREE.Group();
  group.name = name;

  const rBot = diameter / 2;
  const rTop = conical ? rBot * 0.80 : rBot * 0.97;

  const plinthH = H * 0.030;
  const baseH   = H * 0.028;
  const shaftY0 = plinthH + baseH;
  const capH    = H * (capital === 'flared' ? 0.115 : 0.085);
  const neckH   = H * 0.016;
  const shaftH  = H - shaftY0 - capH - neckH;

  // Square plinth
  const pl = mesh(new THREE.Mesh(new THREE.BoxGeometry(base, plinthH, base), M.mold), 'plinth');
  pl.position.y = plinthH / 2;
  group.add(pl);

  // Moulded base: a scotia flaring from the shaft down onto the plinth
  const bs = mesh(new THREE.Mesh(new THREE.CylinderGeometry(rBot * 1.04, rBot * 1.22, baseH, 48), M.mold), 'base-mould');
  bs.position.y = plinthH + baseH / 2;
  group.add(bs);

  // Shaft
  const FL = 20;
  const radial = fluted ? FL * 8 : 56;
  const sg = new THREE.CylinderGeometry(rTop, rBot, shaftH, radial, 1, false);
  if (fluted) {
    const pos = sg.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const rad = Math.hypot(v.x, v.z);
      if (rad < 1e-6) continue;
      const th = Math.atan2(v.z, v.x);
      // carve FL grooves: radius dips where cos(FL·θ) is high
      const k = 1 - 0.055 * (1 + Math.cos(FL * th)) / 2;
      pos.setX(i, v.x * k);
      pos.setZ(i, v.z * k);
    }
    pos.needsUpdate = true;
    sg.computeVertexNormals();
  }
  const shaft = mesh(new THREE.Mesh(sg, M.body), 'shaft');
  shaft.position.y = shaftY0 + shaftH / 2;
  group.add(shaft);

  // Necking astragal
  const nk = mesh(new THREE.Mesh(new THREE.CylinderGeometry(rTop * 1.06, rTop * 1.06, neckH, 48), M.mold), 'necking');
  nk.position.y = shaftY0 + shaftH + neckH / 2;
  group.add(nk);

  const capY = shaftY0 + shaftH + neckH;
  const ab = base * 0.95;

  if (capital === 'flared') {
    // C400: a deep cove sweeping from the shaft out to a wide abacus
    const cove = mesh(new THREE.Mesh(new THREE.CylinderGeometry(ab * 0.52, rTop * 1.02, capH * 0.72, 48), M.body), 'capital-cove');
    cove.position.y = capY + capH * 0.36;
    group.add(cove);
    const slab = mesh(new THREE.Mesh(new THREE.BoxGeometry(ab, capH * 0.28, ab), M.mold), 'abacus');
    slab.position.y = capY + capH * 0.72 + capH * 0.14;
    group.add(slab);
  } else {
    const echH = capH * 0.58;
    const echR = ab * (capital === 'ionic' ? 0.30 : 0.46);
    const ech = mesh(new THREE.Mesh(new THREE.CylinderGeometry(echR, rTop * 1.02, echH, 48), M.body), 'echinus');
    ech.position.y = capY + echH / 2;
    group.add(ech);
    const slab = mesh(new THREE.Mesh(new THREE.BoxGeometry(ab, capH * 0.42, ab), M.mold), 'abacus');
    slab.position.y = capY + echH + capH * 0.21;
    group.add(slab);

    if (capital === 'ionic') {
      // paired volutes, left and right under the abacus
      // Sized and seated so they clear the echinus and reach the abacus edge,
      // as an Ionic capital's volutes do — they were buried inside before.
      const vr = ab * 0.24, vt = ab * 0.055;
      [-1, 1].forEach((s, i) => {
        const vo = mesh(new THREE.Mesh(new THREE.TorusGeometry(vr, vt, 10, 28, Math.PI * 1.7), M.relief), 'volute-' + i);
        vo.position.set(s * (ab / 2 - vr), capY + echH * 0.5, 0);
        vo.rotation.z = s > 0 ? -0.45 : Math.PI + 0.45;
        group.add(vo);
      });
    } else if (capital === 'palm' || capital === 'corinthian') {
      // ring of leaves against the echinus
      const nLeaf = capital === 'corinthian' ? 10 : 4;
      const rShaft = rTop * 1.02;
      const bellLean = Math.atan2(echR - rShaft, echH);
      const chordL = Math.hypot(echR - rShaft, echH) * 0.94;
      const rMid = (rShaft + echR) / 2;
      const prot = echR * 0.14;                                  // relief depth
      const halfW = (2 * Math.PI * echR / nLeaf) * 0.5 * 0.82;   // half the arc share
      for (let i = 0; i < nLeaf; i++) {
        const a = (i / nLeaf) * Math.PI * 2;
        const holder = new THREE.Group();
        holder.name = 'leaf-holder-' + i;
        holder.rotation.y = -a;
        holder.position.y = capY + echH / 2;
        const lf = mesh(new THREE.Mesh(new THREE.CylinderGeometry(prot, prot * 0.45, chordL, 10, 1, false, -Math.PI / 2, Math.PI), M.relief), 'leaf-' + i);
        lf.scale.x = halfW / prot;   // widen without deepening
        lf.position.set(0, 0, rMid);
        lf.rotation.x = bellLean;   // matches the bell's slope, never opposes it
        holder.add(lf);
        group.add(holder);
      }
    }
  }
  return group;
}

/**
 * Piquet de clôture béton — a 10 × 10 cm concrete post, 2 m or 2.5 m long,
 * lightly tapered with a chamfered head and the wire notches down one edge.
 */
export function buildFencePost(THREE, opts) {
  const { W, D, H, name = 'post' } = opts;
  const M = MAT(THREE);
  const group = new THREE.Group();
  group.name = name;

  const taper = 0.86;
  const shaft = taperedBox(THREE, W * taper, D * taper, W, D, H * 0.97, M.body, false);
  shaft.name = 'shaft';
  shaft.position.y = H * 0.485;
  group.add(shaft);

  const head = mesh(new THREE.Mesh(new THREE.CylinderGeometry(W * taper * 0.40, W * taper * 0.62, H * 0.03, 4, 1, false, Math.PI / 4), M.mold), 'head');
  head.position.y = H * 0.97 + H * 0.015;
  group.add(head);

  // Wire notches: evenly spaced along one face
  const nN = Math.max(4, Math.round(H / 0.45));
  for (let i = 0; i < nN; i++) {
    const f = (i + 0.6) / (nN + 0.2);
    const y = f * H * 0.97;
    const w = W * (1 - (1 - taper) * f);
    const nt = mesh(new THREE.Mesh(new THREE.BoxGeometry(W * 0.30, H * 0.008, D * 0.16), M.inner), 'notch-' + i);
    nt.position.set(0, y, w / 2 - D * 0.05);
    group.add(nt);
  }
  return group;
}

/**
 * Niche DogHome — beton kennel: walled body with an arched doorway, recessed
 * side panels, and a corrugated gable roof. Cast in three separable parts,
 * so the body/roof split is modelled as a visible joint.
 */
export function buildDogHouse(THREE, opts) {
  const { W, D, H, name = 'kennel' } = opts;
  const M = MAT(THREE);
  const roofMat = new THREE.MeshStandardMaterial({ name: 'roof', color: 0x8f2b23, roughness: 0.72, metalness: 0.02 });
  const darkMat = new THREE.MeshStandardMaterial({ name: 'doorway', color: 0x241f1c, roughness: 0.95, metalness: 0 });
  const group = new THREE.Group();
  group.name = name;

  const wallH = H * 0.62;
  const t = 0.05;
  const ridgeTop = H - 0.035;   // leaves room for the ridge roll within H

  // Four walls + floor, leaving the interior open
  const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
  group.add(at(mesh(new THREE.Mesh(new THREE.BoxGeometry(W, wallH, t), M.body), 'wall-back'),
    0, wallH / 2, -D / 2 + t / 2));
  group.add(at(mesh(new THREE.Mesh(new THREE.BoxGeometry(t, wallH, D), M.body), 'wall-left'),
    -W / 2 + t / 2, wallH / 2, 0));
  group.add(at(mesh(new THREE.Mesh(new THREE.BoxGeometry(t, wallH, D), M.body), 'wall-right'),
    W / 2 - t / 2, wallH / 2, 0));
  group.add(at(mesh(new THREE.Mesh(new THREE.BoxGeometry(W - t * 2, t, D - t * 2), M.inner), 'floor'),
    0, t / 2, 0));

  // Front wall built around an arched opening
  const dW = W * 0.40, dH = wallH * 0.78;
  const zf = D / 2 - t;
  const face = new THREE.Shape();
  face.moveTo(-W / 2, 0); face.lineTo(W / 2, 0);
  face.lineTo(W / 2, wallH); face.lineTo(-W / 2, wallH);
  face.closePath();
  const ar = dW / 2, spring = dH - ar;
  const hole = new THREE.Path();
  hole.moveTo(-ar, 0);
  hole.lineTo(-ar, spring);
  hole.absarc(0, spring, ar, Math.PI, 0, true);   // semicircle over the opening
  hole.lineTo(ar, 0);
  hole.closePath();
  face.holes.push(hole);
  const front = mesh(new THREE.Mesh(new THREE.ExtrudeGeometry(face, { depth: t, bevelEnabled: false, curveSegments: 16 }), M.body), 'wall-front');
  front.position.z = zf;
  group.add(front);
  // dark interior read through the doorway
  const cave = mesh(new THREE.Mesh(new THREE.BoxGeometry(dW, dH, t * 0.4), darkMat), 'doorway');
  cave.position.set(0, dH / 2, zf - t * 0.5);
  group.add(cave);

  // Recessed panel on each side wall
  [[-1, 'panel-left'], [1, 'panel-right']].forEach(([s, nm]) => {
    const p = mesh(new THREE.Mesh(new THREE.BoxGeometry(0.012, wallH * 0.56, D * 0.62), M.relief), nm);
    p.position.set(s * (W / 2 + 0.006), wallH * 0.5, 0);
    group.add(p);
  });

  // Gable walls close each end — the product's whole claim is shelter from
  // rain and wind, and both triangles were standing open.
  [-1, 1].forEach((s, i) => {
    const tri = new THREE.Shape();
    tri.moveTo(-D / 2, wallH);
    tri.lineTo(D / 2, wallH);
    tri.lineTo(0, ridgeTop);
    tri.closePath();
    const g = new THREE.ExtrudeGeometry(tri, { depth: t, bevelEnabled: false });
    const gm = mesh(new THREE.Mesh(g, M.body), 'gable-' + i);
    gm.rotation.y = Math.PI / 2;          // local +Z → world +X
    gm.position.x = s > 0 ? W / 2 - t : -W / 2;
    group.add(gm);
  });

  // Corrugated gable roof: two pitched slabs, ribbed along the slope
  const ridgeH = ridgeTop - wallH;
  const over = 0.03;
  const slopeLen = Math.hypot(D / 2 + over, ridgeH);
  const pitch = Math.atan2(ridgeH, D / 2 + over);
  [[-1, 'roof-front'], [1, 'roof-back']].forEach(([s, nm]) => {
    const holder = new THREE.Group();
    holder.name = nm + '-holder';
    const slab = mesh(new THREE.Mesh(new THREE.BoxGeometry(W + over * 2, 0.035, slopeLen), roofMat), nm);
    slab.position.set(0, wallH + ridgeH / 2, s * (D / 2 + over) / 2);
    slab.rotation.x = s * pitch;
    holder.add(slab);
    group.add(holder);
    // corrugation
    const nR = 16;
    for (let i = 0; i < nR; i++) {
      const x = -((W + over * 2) / 2) + (i + 0.5) * ((W + over * 2) / nR);
      const rb = mesh(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, slopeLen, 8), roofMat), nm + '-rib-' + i);
      rb.rotation.set(Math.PI / 2 + s * pitch, 0, 0);
      rb.position.set(x, wallH + ridgeH / 2 + 0.016 * Math.cos(pitch), s * (D / 2 + over) / 2 + 0.016 * Math.sin(pitch) * s);
      group.add(rb);
    }
  });
  const ridge = mesh(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, W + over * 2, 10), roofMat), 'ridge');
  ridge.rotation.z = Math.PI / 2;
  ridge.position.y = ridgeTop;
  group.add(ridge);

  return group;
}

/**
 * Puit décoratif — reconstituted-stone well: a paved base disc (D2), a
 * block-coursed drum (D1), a moulded curb, and the wrought-iron arch shown
 * as F1 on the catalog page. The printed height is the masonry; the arch
 * stands above it.
 */
export function buildWell(THREE, opts) {
  const { d1, d2, H, name = 'well' } = opts;
  const M = MAT(THREE);
  const stone = new THREE.MeshStandardMaterial({ name: 'body', color: 0xb35c3f, roughness: 0.90, metalness: 0.01 });
  const iron  = new THREE.MeshStandardMaterial({ name: 'iron',  color: 0x8c2f22, roughness: 0.55, metalness: 0.35 });
  const group = new THREE.Group();
  group.name = name;

  const r1 = d1 / 2, r2 = d2 / 2;
  const padH = H * 0.10, curbH = H * 0.16;
  const drumY0 = padH, drumH = H - padH - curbH;
  const rIn = r1 * 0.74;              // bore: the shaft is genuinely open

  // Annular sector prism — a masonry block with a hollow back, so no geometry
  // ever crosses the axis and the shaft stays empty.
  const ring = (rOut, rInner, a0, sweep, h) => {
    const sh = new THREE.Shape();
    sh.absarc(0, 0, rOut, a0, a0 + sweep, false);
    sh.absarc(0, 0, rInner, a0 + sweep, a0, true);
    const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 24 });
    g.rotateX(-Math.PI / 2);
    return g;
  };

  // Paved base, laid as wedge slabs around the shaft
  const nPav = 8;
  for (let i = 0; i < nPav; i++) {
    const a0 = (i / nPav) * Math.PI * 2 + 0.02;
    const seg = mesh(new THREE.Mesh(
      ring(r2, rIn, a0, (Math.PI * 2) / nPav - 0.04, padH), M.mold), 'paver-' + i);
    seg.position.y = 0;
    group.add(seg);
  }

  // Drum: three staggered courses of blocks
  const courses = 3, perCourse = 8;
  const cH = drumH / courses;
  for (let c = 0; c < courses; c++) {
    for (let i = 0; i < perCourse; i++) {
      const off = c % 2 ? (Math.PI / perCourse) : 0;
      const a0 = (i / perCourse) * Math.PI * 2 + off + 0.03;
      const blk = mesh(new THREE.Mesh(
        ring(r1, rIn, a0, (Math.PI * 2) / perCourse - 0.06, cH * 0.90), stone), 'block-' + c + '-' + i);
      blk.position.y = drumY0 + (c + 0.05) * cH;
      group.add(blk);
    }
  }
  // Shaft lining — the inner face of the bore, dark and open top to bottom
  const lin = mesh(new THREE.Mesh(new THREE.CylinderGeometry(rIn, rIn, H, 48, 1, true), M.inner), 'lining');
  lin.material.side = THREE.DoubleSide;
  lin.position.y = H / 2;
  group.add(lin);

  // Curb: moulded ring, open centre
  const curb = mesh(new THREE.Mesh(ring(r1 * 1.06, rIn, 0, Math.PI * 2, curbH), stone), 'rim');
  curb.position.y = drumY0 + drumH;
  group.add(curb);

  // Wrought-iron arch (F1). One vertical plane through the well axis: an
  // upright each side rising off the curb, a semicircular crown spanning
  // between their heads, the windlass on its axle, and the bucket on a chain.
  const archR = r1 * 0.92;            // half-span = radius of the crown curve
  const postH = H * 0.42;             // straight run before the curve springs
  const tube = Math.max(0.011, r1 * 0.022);
  const springY = H + postH;          // where posts meet the curve
  const apexY = springY + archR;

  [-1, 1].forEach((s, i) => {
    const post = mesh(new THREE.Mesh(new THREE.CylinderGeometry(tube, tube * 1.15, postH, 10), iron), 'arch-post-' + i);
    post.position.set(s * archR, H + postH / 2, 0);
    group.add(post);
    // Foot plate bedded into the curb
    const shoe = mesh(new THREE.Mesh(new THREE.CylinderGeometry(tube * 2.4, tube * 2.4, H * 0.035, 12), iron), 'arch-shoe-' + i);
    shoe.position.set(s * archR, H + H * 0.017, 0);
    group.add(shoe);
    // Scroll volute in the haunch of the arch
    const sc = mesh(new THREE.Mesh(new THREE.TorusGeometry(archR * 0.17, tube * 0.8, 8, 22), iron), 'volute-' + i);
    sc.position.set(s * archR * 0.70, springY + archR * 0.20, 0);
    group.add(sc);
  });

  // Semicircular crown: default torus lies in XY, so an arc of PI runs from
  // (+archR, 0) up over (0, archR) and back down to (-archR, 0) — exactly the
  // two post heads.
  const crown = mesh(new THREE.Mesh(new THREE.TorusGeometry(archR, tube, 10, 48, Math.PI), iron), 'arch-crown');
  crown.position.y = springY;
  group.add(crown);

  const finial = mesh(new THREE.Mesh(new THREE.SphereGeometry(tube * 2.2, 14, 10), iron), 'arch-finial');
  finial.position.y = apexY + tube * 1.2;
  group.add(finial);

  // Windlass: a turned roller on an axle spanning the uprights, with a crank.
  const axleY = springY + archR * 0.34;
  const axle = mesh(new THREE.Mesh(new THREE.CylinderGeometry(tube * 0.8, tube * 0.8, archR * 2.20, 10), iron), 'axle');
  axle.rotation.z = Math.PI / 2;
  axle.position.y = axleY;
  group.add(axle);
  const roller = mesh(new THREE.Mesh(new THREE.CylinderGeometry(tube * 2.8, tube * 2.8, archR * 1.24, 18), M.mold), 'roller');
  roller.rotation.z = Math.PI / 2;
  roller.position.y = axleY;
  group.add(roller);
  const crankArm = mesh(new THREE.Mesh(new THREE.CylinderGeometry(tube * 0.7, tube * 0.7, archR * 0.34, 8), iron), 'crank-arm');
  crankArm.position.set(archR * 1.10, axleY - archR * 0.17, 0);
  group.add(crankArm);
  const crankGrip = mesh(new THREE.Mesh(new THREE.CylinderGeometry(tube * 0.9, tube * 0.9, archR * 0.26, 8), iron), 'crank-grip');
  crankGrip.rotation.x = Math.PI / 2;
  crankGrip.position.set(archR * 1.10, axleY - archR * 0.34, archR * 0.13);
  group.add(crankGrip);

  // Chain and bucket hanging over the mouth
  const bucketH = r1 * 0.46, bucketTop = axleY - archR * 0.62;
  const chain = mesh(new THREE.Mesh(new THREE.CylinderGeometry(tube * 0.35, tube * 0.35, archR * 0.62, 6), iron), 'chain');
  chain.position.y = axleY - archR * 0.31;
  group.add(chain);
  const bail = mesh(new THREE.Mesh(new THREE.TorusGeometry(r1 * 0.26, tube * 0.5, 6, 20, Math.PI), iron), 'bucket-bail');
  bail.position.y = bucketTop - r1 * 0.02;
  group.add(bail);
  const bucket = mesh(new THREE.Mesh(new THREE.CylinderGeometry(r1 * 0.26, r1 * 0.20, bucketH, 22, 1, true), M.mold), 'bucket');
  bucket.position.y = bucketTop - r1 * 0.02 - bucketH / 2;
  group.add(bucket);
  const bucketBase = mesh(new THREE.Mesh(new THREE.CircleGeometry(r1 * 0.20, 22), M.mold), 'bucket-base');
  bucketBase.rotation.x = Math.PI / 2;
  bucketBase.position.y = bucketTop - r1 * 0.02 - bucketH;
  group.add(bucketBase);

  return group;
}

/**
 * Tidies the exported node tree.
 *
 * Every repeated relief element (flute, gadroon, leaf, scale…) is built inside
 * its own holder group so its orientation is independent. That is right for
 * construction but wrong for delivery: a column arrived as ~100 anonymous
 * groups at the root of its GLB, which is unusable for anyone opening the file
 * in a 3D tool. This buckets them under one named part per family, preserving
 * world transforms (the wrapper is identity, children keep their own).
 */
const PART_NAMES = {
  flute: 'cannelures', gadroon: 'godrons', leaf: 'feuilles-chapiteau',
  reed: 'stries-margelle', scale: 'ecailles', weave: 'tresse',
  diamond: 'losanges', block: 'assises', paver: 'dallage',
  plank: 'lames', joint: 'joints', bead: 'perles', band: 'bandeaux',
  foot: 'pieds', lobe: 'festons', notch: 'encoches', arch: 'arceau',
  volute: 'volutes', rib: 'nervures-toiture', gable: 'pignons',
  wall: 'parois', rim: 'margelle', roof: 'toiture', base: 'socle',
  cadre: 'encadrement', cadre2: 'encadrement-interieur', cle: 'motif-cle',
  dalle: 'dalles', insert: 'inserts', plank: 'lames', octogone: 'octogone',
  losange: 'losanges', corps: 'corps',
  hatch: 'grenaillage', diagonale: 'diagonales', bordure: 'bordure',
  plinth: 'socle', frame: 'encadrements', post: 'montants', crank: 'manivelle',
  bucket: 'seau'
};

export function organiseParts(THREE, group) {
  const buckets = new Map();
  for (const child of [...group.children]) {
    const token = (child.name || '').split('-')[0];
    if (!token) continue;
    if (!buckets.has(token)) buckets.set(token, []);
    buckets.get(token).push(child);
  }
  for (const [token, members] of buckets) {
    if (members.length < 3) continue;            // singles stay at the root
    const label = PART_NAMES[token] || token;
    const wrap = new THREE.Group();
    wrap.name = label;
    for (const m of members) { group.remove(m); wrap.add(m); }
    group.add(wrap);
  }
  return group;
}

/**
 * Dallages — dalles et pavés.
 *
 * The catalog photographs each reference as FOUR tiles laid together, because
 * the motif only completes across the joint: a Tapis tile carries one QUARTER
 * of the rug, a Bois tile one direction of planks. Modelling a single tile in
 * isolation therefore misreads the product — which is what the first version
 * did. Each tile here is the quarter-motif, and buildSlabField lays them the
 * way they are laid on the ground.
 *
 * Motifs are incised, so the field stands proud and the pattern reads in the
 * grooves between raised pads — no CSG needed.
 */
export function slabMats(THREE) {
  const M = MAT(THREE);
  // 'insert' is deliberately absent from the finish ramp: the round inserts
  // are a fired colour, like the kennel roof, and do not follow the coloris.
  M.insert = new THREE.MeshStandardMaterial({ name: 'insert', color: 0xb0413a, roughness: 0.86, metalness: 0.01 });
  return M;
}

export function buildSlab(THREE, opts) {
  const { W, D, T, pattern = 'plain', name = 'dalle', mats } = opts;
  const M = mats || slabMats(THREE);
  const group = new THREE.Group();
  group.name = name;

  const baseT = T * 0.62, padT = T - baseT;
  const gv = 0.005;                        // groove width
  const padY = baseT + padT / 2;

  const pad = (nm, x, z, w, d, mat) => {
    const m = mesh(new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.002), padT, Math.max(d, 0.002)), mat || M.relief), nm);
    m.position.set(x, padY, z);
    group.add(m);
    return m;
  };
  const diag = (nm, x, z, len, wid, sign) => {
    const m = pad(nm, x, z, len, wid);
    m.rotation.y = sign * Math.PI / 4;
    return m;
  };

  // ── Pavés à contour découpé ────────────────────────────────────────
  if (pattern === 'huit' || pattern === 'huitR') {
    // Wave paver. Each side is an S-curve with odd symmetry about its
    // midpoint, and the four sides are 90° rotations of one another — that is
    // what makes the shape interlock with translated copies of itself.
    const a = W / 2, d = W * 0.10;
    const sh = new THREE.Shape();
    const corner = [[-a, -a], [a, -a], [a, a], [-a, a]];
    sh.moveTo(corner[0][0], corner[0][1]);
    for (let i = 0; i < 4; i++) {
      const [x0, y0] = corner[i], [x1, y1] = corner[(i + 1) % 4];
      // outward normal of this side, and the along-side direction
      const nx = (x0 + x1) / 2 / a, ny = (y0 + y1) / 2 / a;
      const tx = (x1 - x0) / (2 * a), ty = (y1 - y0) / (2 * a);
      sh.bezierCurveTo(
        x0 + tx * a * 0.55 + nx * d, y0 + ty * a * 0.55 + ny * d,
        x0 + tx * a * 1.45 - nx * d, y0 + ty * a * 1.45 - ny * d,
        x1, y1
      );
    }
    const g = new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false, curveSegments: 18 });
    const body = mesh(new THREE.Mesh(g, M.body), 'corps');
    body.rotation.x = -Math.PI / 2;
    body.position.y = 0;   // extrude already spans 0…T once laid flat
    group.add(body);
    if (pattern === 'huitR') {
      // "R" = surface grenaillée: a fine cross-hatch over the face
      const n = 9, span = W * 0.78, step = span / n;
      for (let i = 0; i < n; i++) {
        const p = -span / 2 + (i + 0.5) * step;
        const hx = mesh(new THREE.Mesh(new THREE.BoxGeometry(span, padT * 0.5, 0.003), M.relief), 'hatch-x-' + i);
        hx.position.set(0, T - padT * 0.25, p); group.add(hx);
        const hz = mesh(new THREE.Mesh(new THREE.BoxGeometry(0.003, padT * 0.5, span), M.relief), 'hatch-z-' + i);
        hz.position.set(p, T - padT * 0.25, 0); group.add(hz);
      }
    }
    return group;
  }

  if (pattern === 'moulin') {
    // Windmill paver: a square bitten by a quarter-circle at each corner. Four
    // tiles meeting at a corner leave a full circular void, which the round
    // insert fills — that is the pattern in the catalog photograph, and it is
    // why the reference is called Moulin.
    const a = W / 2, r = W * 0.26;
    const sh = new THREE.Shape();
    sh.moveTo(-a + r, -a);
    sh.lineTo(a - r, -a);
    sh.absarc(a, -a, r, Math.PI, Math.PI * 0.5, true);
    sh.lineTo(a, a - r);
    sh.absarc(a, a, r, -Math.PI * 0.5, -Math.PI, true);
    sh.lineTo(-a + r, a);
    sh.absarc(-a, a, r, 0, -Math.PI * 0.5, true);
    sh.lineTo(-a, -a + r);
    sh.absarc(-a, -a, r, Math.PI * 0.5, 0, true);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false, curveSegments: 14 });
    const body = mesh(new THREE.Mesh(g, M.body), 'corps');
    body.rotation.x = -Math.PI / 2;
    body.position.y = 0;   // extrude already spans 0…T once laid flat
    group.add(body);
    return group;
  }

  if (pattern === 'plinthe') {
    const body = mesh(new THREE.Mesh(new THREE.BoxGeometry(W, T * 0.70, D), M.body), 'corps');
    body.position.y = T * 0.35;
    group.add(body);
    const roll = mesh(new THREE.Mesh(new THREE.CylinderGeometry(T * 0.30, T * 0.30, W, 20), M.mold), 'nez');
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, T * 0.70, 0);
    group.add(roll);
    return group;
  }

  // ── Dalles carrées ─────────────────────────────────────────────────
  const body = mesh(new THREE.Mesh(new THREE.BoxGeometry(W, baseT, D), M.body), 'corps');
  body.position.y = baseT / 2;
  group.add(body);

  const hw = W / 2, hd = D / 2;

  if (pattern === 'bois') {
    // One direction of planks per tile. The parquet appears only when the
    // field alternates their orientation, exactly as the installed photograph
    // on page 26 shows.
    const n = 7, span = D - gv * 2, step = span / n;
    for (let i = 0; i < n; i++) {
      const z = -span / 2 + (i + 0.5) * step;
      pad('plank-' + i, 0, z, W - gv * 2, step - gv);
    }
  } else if (pattern === 'tapis') {
    // Quarter of the rug. The assembled centre is this tile's (+x, +z) corner,
    // so the field rotates each of the four tiles to meet there.
    const c = { x: hw, z: hd };
    const bar = W * 0.085;
    // Outer border: spans the FULL tile edge. Anything shorter breaks the rug
    // at the joint, and a shortfall biased onto the centre-facing end shows as
    // a gap twice its size once mirrored on the neighbour.
    pad('bordure-x', 0, -hd + bar / 2, W, bar);
    pad('bordure-z', -hw + bar / 2, 0, bar, D);

    // Octagon. The straight runs stop where the corner chamfer picks them up,
    // and the chamfer is sized to span exactly that opening — so the corner
    // resolves instead of leaving two stubs and a floating diagonal.
    const oct = W * 0.66;              // run distance from the assembled centre
    const cut = W * 0.30;              // where the chamfer crosses the run
    const runLen = oct - cut;          // run: from the tile edge in to the cut
    pad('octogone-x', c.x - runLen / 2, c.z - oct, runLen, bar * 0.8);
    pad('octogone-z', c.x - oct, c.z - runLen / 2, bar * 0.8, runLen);
    // chamfer centre sits on the diagonal at (oct − cut/2); it must reach both
    // run ends, a span of cut·√2 plus a little overlap to close the mitre
    diag('octogone-pan', c.x - oct + cut / 2, c.z - oct + cut / 2,
         cut * Math.SQRT2 + bar * 0.8, bar * 0.8, 1);

    // Inner diamond: the four chamfers must MEET on the axes, so each spans
    // its full chord — offset·√2·2 — not an arbitrary fraction of the tile.
    const dOff = W * 0.20;
    diag('losange', c.x - dOff, c.z - dOff, dOff * Math.SQRT2 * 2, bar * 0.7, 1);
  } else if (pattern === 'tapis1') {
    // Diagonal rug: a mitred diamond frame with hatched corners, so four tiles
    // read as the diagonal parquet photographed on page 25.
    const bar = W * 0.055;
    // border frame, all four edges
    const inset = bar * 1.6;
    pad('bordure-n', 0,  hd - inset, W - inset * 2, bar);
    pad('bordure-s', 0, -hd + inset, W - inset * 2, bar);
    pad('bordure-e',  hw - inset, 0, bar, D - inset * 2);
    pad('bordure-w', -hw + inset, 0, bar, D - inset * 2);
    // the X, corner to corner — radial by design, not a corner chamfer
    [1, -1].forEach((s, i) => {
      diag('diagonale-' + i, 0, 0, W * 1.30, bar, s);
    });
    // bands flanking each arm, offset perpendicular to it
    [1, -1].forEach((s, di) => {
      [-1, 1].forEach((side, si) => {
        const o = side * W * 0.19;
        // perpendicular to a bar at ±45° is (∓sin, cos) — offset along it
        const ox = -s * o * Math.SQRT1_2, oz = o * Math.SQRT1_2;
        diag('bande-' + di + '-' + si, ox, oz, W * 0.86, bar * 0.62, s);
      });
    });
  } else if (pattern === 'brique') {
    // Greek key. Each tile carries one squared spiral, and the field's
    // quarter-turns run it continuously across the joints.
    const bar = W * 0.10;
    const steps = [[0.86, 0.86], [0.60, 0.60], [0.34, 0.34]];
    steps.forEach(([fx, fz], k) => {
      const rw = hw * fx, rd = hd * fz;
      pad('cle-' + k + '-n', -bar * 0.5, rd - bar / 2, rw * 2 - bar, bar);
      pad('cle-' + k + '-e', rw - bar / 2, -bar * 0.5, bar, rd * 2 - bar);
    });
  } else if (pattern === 'texture') {
    // 301: a plain face inside a fine border line
    const bar = W * 0.045;
    pad('bordure-n', 0,  hd - bar / 2, W - bar, bar);
    pad('bordure-s', 0, -hd + bar / 2, W - bar, bar);
    pad('bordure-e',  hw - bar / 2, 0, bar, D - bar * 3);
    pad('bordure-w', -hw + bar / 2, 0, bar, D - bar * 3);
    pad('champ', 0, 0, W - bar * 4, D - bar * 4);
  } else {
    // 50R, 45: plain, the pad edge reading as a light chamfer
    pad('champ', 0, 0, W - gv * 2, D - gv * 2);
  }
  return group;
}

/**
 * Lays a patch of paving the way it goes down on the ground — the exposition
 * view. A single tile cannot show these products: the motif completes across
 * the joint, and the interlocking pavers only make sense nested.
 *
 * Per-pattern placement:
 *   bois            planks quarter-turn on a checkerboard → parquet
 *   tapis/tapis1/brique  each 2×2 block assembles one complete motif
 *   huit/huitR      pure translation; the S-sides nest into one another
 *   moulin          square lattice, with a round insert in every void where
 *                   four corner bites meet
 */
export function buildSlabField(THREE, opts) {
  const { W, D, T, pattern = 'plain', cols = 4, rows = 2,
          joint = 0.004, name = 'dallage' } = opts;
  const M = slabMats(THREE);
  const field = new THREE.Group();
  field.name = name;

  const nested = (pattern === 'huit' || pattern === 'huitR');
  const pitchX = nested ? W : W + joint;
  const pitchZ = nested ? D : D + joint;

  // Quarter-motif patterns: the assembled centre is each tile's (+x,+z)
  // corner, so the tile at the (−,−) station needs no turn and the others
  // rotate to bring their corner to the shared point.
  // Only these carry a QUARTER of the motif. Tapis 1 is complete per tile
  // (border frame + full X), so it is laid square.
  const QUARTER = { tapis: 1, brique: 1 };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = buildSlab(THREE, { W, D, T, pattern, mats: M, name: 'dalle-' + (r * cols + c) });
      tile.position.set(
        (c - (cols - 1) / 2) * pitchX,
        0,
        (r - (rows - 1) / 2) * pitchZ
      );
      if (pattern === 'bois') {
        tile.rotation.y = ((c + r) % 2) * Math.PI / 2;
      } else if (QUARTER[pattern]) {
        const sx = (c % 2) ? 1 : -1, sz = (r % 2) ? 1 : -1;
        tile.rotation.y = sx < 0
          ? (sz < 0 ? 0 : Math.PI / 2)
          : (sz < 0 ? -Math.PI / 2 : Math.PI);
      }
      field.add(tile);
    }
  }

  if (pattern === 'moulin') {
    // One insert per interior lattice vertex — the void four bites leave.
    const r = W * 0.26;
    for (let r0 = 0; r0 < rows - 1; r0++) {
      for (let c0 = 0; c0 < cols - 1; c0++) {
        const disc = mesh(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r * 0.94, T, 28), M.insert), 'insert-' + r0 + '-' + c0);
        disc.position.set(
          (c0 - (cols - 1) / 2 + 0.5) * pitchX,
          T / 2,
          (r0 - (rows - 1) / 2 + 0.5) * pitchZ
        );
        field.add(disc);
      }
    }
  }

  return field;
}
