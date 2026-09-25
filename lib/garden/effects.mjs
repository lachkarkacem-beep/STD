// Effets animés posés sur certaines pièces : flammes du barbecue, eau des
// fontaines. Purement décoratifs, et désactivables — une scène figée se juge
// mieux pour l'aménagement, une scène animée se montre mieux au client.
//
// THREE est injecté, comme dans les autres générateurs du projet.

/**
 * Où accrocher l'effet sur chaque référence, en mètres depuis le sol.
 * Les hauteurs sont relevées sur les modèles : la grille d'un barbecue est à
 * 90 cm, l'eau d'une fontaine sort de la vasque haute.
 */
export const EFFECT_ANCHORS = {
  BARBACUE1: { kind: "feu", y: 0.9, size: 0.42 },
  BARBACUE2: { kind: "feu", y: 0.9, size: 0.42 },
  BARBACUE3: { kind: "feu", y: 0.9, size: 0.42 },

  // Fontaines sur pied : l'eau retombe de la vasque supérieure.
  F1: { kind: "eau", y: 1.35, fall: 0.75 },
  F11: { kind: "eau", y: 2.05, fall: 1.2 },
  F21: { kind: "eau", y: 1.3, fall: 0.8 },
  F22: { kind: "eau", y: 1.5, fall: 0.95 },

  // Jets muraux : l'eau sort du robinet et tombe dans le bassin.
  F40: { kind: "eau", y: 0.62, fall: 0.4 },
  F86: { kind: "eau", y: 1, fall: 0.62 },
  F100: { kind: "eau", y: 0.78, fall: 0.5 },
  F170: { kind: "eau", y: 0.82, fall: 0.5 },
  F625: { kind: "eau", y: 0.9, fall: 0.58 },
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
  const fall = spec.fall;

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

  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, fall, 6), material);
  stream.position.y = -fall / 2;
  group.add(stream);

  const drops = [];
  for (let i = 0; i < 7; i++) {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.018 + r() * 0.012, 5, 4), material);
    drop.userData.offset = r();
    drop.userData.sway = (r() - 0.5) * 0.05;
    group.add(drop);
    drops.push(drop);
  }

  // Remous à l'arrivée, pour que l'eau ne s'arrête pas dans le vide.
  const splash = new THREE.Mesh(new THREE.CircleGeometry(0.11, 14), material);
  splash.rotation.x = -Math.PI / 2;
  splash.position.y = -fall;
  group.add(splash);

  group.userData.animate = (t) => {
    for (const drop of drops) {
      const p = (t * 0.55 + drop.userData.offset) % 1;
      drop.position.set(drop.userData.sway * p, -p * fall, 0);
      drop.material.opacity = 0.55;
    }
    const k = 1 + Math.sin(t * 4) * 0.12;
    splash.scale.set(k, k, k);
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
  group.position.y = spec.y;
  group.userData.kind = spec.kind;
  return group;
}
