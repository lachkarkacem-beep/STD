// Effets animés posés sur certaines pièces : flammes du barbecue, eau des
// fontaines. Purement décoratifs, et désactivables — une scène figée se juge
// mieux pour l'aménagement, une scène animée se montre mieux au client.
//
// THREE est injecté, comme dans les autres générateurs du projet.

/**
 * Où accrocher l'effet sur chaque référence, en mètres depuis le sol.
 *
 * Les hauteurs ne sont pas estimées : elles sont relevées dans les GLB
 * eux-mêmes. Les modèles de fontaine portent un matériau « eau » — la nappe
 * de chaque vasque — et un matériau « iron » pour le robinet. Chaque jet part
 * donc d'un point réel et retombe exactement sur une nappe existante, sans
 * jamais traverser le fond ni s'arrêter dans le vide.
 *
 * `ring` est le rayon d'où l'eau déborde : zéro pour un jet central, le rayon
 * de la vasque pour une chute de vasque à vasque.
 */
export const EFFECT_ANCHORS = {
  BARBACUE1: { kind: "feu", y: 0.9, size: 0.42 },
  BARBACUE2: { kind: "feu", y: 0.9, size: 0.42 },
  BARBACUE3: { kind: "feu", y: 0.9, size: 0.42 },

  // Fontaines sur pied : l'eau jaillit au sommet et cascade de vasque en
  // vasque jusqu'au bassin du bas.
  F1: {
    kind: "eau",
    spouts: [
      { y: 1.5, fall: 0.228, ring: 0 },
      { y: 1.272, fall: 0.411, ring: 0.135 },
    ],
  },
  F11: {
    kind: "eau",
    spouts: [
      { y: 2.3, fall: 0.222, ring: 0 },
      { y: 2.078, fall: 0.401, ring: 0.16 },
      { y: 1.677, fall: 0.723, ring: 0.275 },
    ],
  },
  F21: {
    kind: "eau",
    spouts: [
      { y: 1.45, fall: 0.228, ring: 0 },
      { y: 1.222, fall: 0.502, ring: 0.2 },
    ],
  },
  F22: {
    kind: "eau",
    spouts: [
      { y: 1.7, fall: 0.253, ring: 0 },
      { y: 1.447, fall: 0.714, ring: 0.27 },
    ],
  },

  // Jets muraux : l'eau sort sous le robinet en fer forgé et s'arrête net sur
  // la nappe du bassin.
  F40: { kind: "eau", spouts: [{ y: 0.642, fall: 0.53, ring: 0 }] },
  F86: { kind: "eau", spouts: [{ y: 1.14, fall: 0.308, ring: 0 }] },
  F100: { kind: "eau", spouts: [{ y: 0.686, fall: 0.432, ring: 0 }] },
  F170: { kind: "eau", spouts: [{ y: 0.715, fall: 0.435, ring: 0 }] },
  F625: { kind: "eau", spouts: [{ y: 0.794, fall: 0.524, ring: 0 }] },
};

export function effectFor(ref) {
  return EFFECT_ANCHORS[ref] ?? null;
}

function rng(seed) {
  let t = (seed >>> 0) || 1;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Flamme : quelques cônes émissifs superposés. Chacun a sa propre cadence de
 * battement, sinon l'ensemble palpite d'un bloc et le trucage se voit.
 */
function buildFlame(THREE, spec, seed) {
  const group = new THREE.Group();
  group.name = "effet-feu";
  const r = rng(seed);

  const tones = [0xff8a2b, 0xffc24a, 0xff5a1f];
  for (let i = 0; i < 5; i++) {
    const h = spec.size * (0.55 + r() * 0.6);
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(spec.size * (0.16 + r() * 0.1), h, 6),
      new THREE.MeshStandardMaterial({
        color: tones[i % tones.length],
        emissive: tones[i % tones.length],
        emissiveIntensity: 1.6,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      })
    );
    const a = r() * Math.PI * 2;
    const d = spec.size * 0.22 * Math.sqrt(r());
    mesh.position.set(Math.cos(a) * d, h / 2, Math.sin(a) * d);
    mesh.userData.base = h;
    mesh.userData.phase = r() * Math.PI * 2;
    mesh.userData.speed = 3 + r() * 3;
    group.add(mesh);
  }

  // Braises : une lueur rouge posée sur la grille.
  const embers = new THREE.Mesh(
    new THREE.CircleGeometry(spec.size * 0.4, 12),
    new THREE.MeshStandardMaterial({
      color: 0x8c1d0a,
      emissive: 0xc0392b,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.9,
    })
  );
  embers.rotation.x = -Math.PI / 2;
  embers.position.y = 0.01;
  group.add(embers);

  const light = new THREE.PointLight(0xff7b2b, 1.6, 3.2, 2);
  light.position.y = spec.size * 0.5;
  group.add(light);

  group.userData.animate = (t) => {
    for (const child of group.children) {
      if (!child.userData.base) continue;
      const k = 0.75 + Math.sin(t * child.userData.speed + child.userData.phase) * 0.28;
      child.scale.set(1, k, 1);
      child.material.opacity = 0.55 + k * 0.3;
    }
    light.intensity = 1.3 + Math.sin(t * 7.3) * 0.45;
  };

  return group;
}

/**
 * Eau : un filet translucide, et des gouttes qui retombent en boucle. Les
 * gouttes descendent à vitesse constante et se replacent en haut, ce qui
 * suffit à lire un écoulement sans simuler quoi que ce soit.
 */
function buildWater(THREE, spec, seed) {
  const group = new THREE.Group();
  group.name = "effet-eau";
  const r = rng(seed);

  const material = new THREE.MeshStandardMaterial({
    color: 0x9fd8ee,
    emissive: 0x2f7f9e,
    emissiveIntensity: 0.25,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });

  const animated = [];

  for (const spout of spec.spouts) {
    const { y, fall, ring = 0 } = spout;
    // Un jet central est un filet unique ; une vasque qui déborde verse tout
    // autour de son rebord, d'où plusieurs filets répartis sur le pourtour.
    const threads = ring > 0 ? 8 : 1;

    for (let i = 0; i < threads; i++) {
      const a = threads === 1 ? 0 : (i / threads) * Math.PI * 2;
      const px = Math.cos(a) * ring;
      const pz = Math.sin(a) * ring;
      const thickness = ring > 0 ? 0.007 : 0.013;

      const stream = new THREE.Mesh(
        new THREE.CylinderGeometry(thickness, thickness * 1.5, fall, 5),
        material
      );
      stream.position.set(px, y - fall / 2, pz);
      group.add(stream);

      const drops = [];
      for (let d = 0; d < (ring > 0 ? 2 : 6); d++) {
        const drop = new THREE.Mesh(
          new THREE.SphereGeometry(0.012 + r() * 0.01, 5, 4),
          material
        );
        drop.userData.offset = r();
        group.add(drop);
        drops.push(drop);
      }

      // Remous à l'arrivée : l'eau doit visiblement toucher la nappe, et non
      // s'interrompre dans le vide.
      const splash = new THREE.Mesh(
        new THREE.CircleGeometry(ring > 0 ? 0.05 : 0.1, 12),
        material
      );
      splash.rotation.x = -Math.PI / 2;
      splash.position.set(px, y - fall + 0.004, pz);
      group.add(splash);

      animated.push({ drops, splash, px, pz, y, fall });
    }
  }

  group.userData.animate = (t) => {
    for (const set of animated) {
      for (const drop of set.drops) {
        const p = (t * 0.6 + drop.userData.offset) % 1;
        drop.position.set(set.px, set.y - p * set.fall, set.pz);
      }
      const k = 1 + Math.sin(t * 4 + set.px * 6) * 0.14;
      set.splash.scale.set(k, k, k);
    }
  };

  return group;
}

/**
 * Effet correspondant à une référence, ou null si elle n'en porte pas.
 *
 * @param {any} THREE
 * @param {string} ref
 * @param {number} seed
 */
export function buildEffect(THREE, ref, seed = 1) {
  const spec = effectFor(ref);
  if (!spec) return null;
  const group = spec.kind === "feu" ? buildFlame(THREE, spec, seed) : buildWater(THREE, spec, seed);
  // L'eau porte ses hauteurs absolues dans chaque jet ; seule la flamme se
  // positionne par son ancre.
  if (spec.kind === "feu") group.position.y = spec.y;
  group.userData.kind = spec.kind;
  return group;
}
