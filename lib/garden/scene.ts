// Moteur de la scène « Prévisualiser mon jardin ».
//
// Volontairement hors de React : un seul contexte WebGL, une boucle de rendu,
// et un état d'objets que le composant React se contente de piloter et
// d'observer. Les GLB sont chargés à la demande et mis en cache par référence.

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { paletteFor } from "@/lib/finishes";
import { groundColor, type GroundKind } from "@/lib/garden/grounds";
import { buildBuilding, buildingDepth } from "@/lib/garden/buildings.mjs";
import { groundGeometry } from "@/lib/garden/ground-geometry.mjs";
import { fenceEdges } from "@/lib/garden/fence.mjs";
import { pavingLayout } from "@/lib/garden/paving.mjs";
import type { BuildingKind } from "@/lib/garden/buildings.mjs";

export type PlacedItem = {
  id: string;
  ref: string;
  finish: string;
  species: string | null;
  x: number;
  z: number;
  rotation: number;
};

export type CameraMode = "orbite" | "dessus" | "hauteur" | "marche";

export type { GroundKind } from "@/lib/garden/grounds";

// Références qui délimitent un terrain : poser des clôtures redessine la
// parcelle au sol.
const FENCE_REFS = new Set(["PQ200", "PQ250"]);

const GRID = 0.1; // aimantation au sol : 10 cm
const snap = (v: number) => Math.round(v / GRID) * GRID;

export type Half = { x: number; z: number };

// Emprise au sol d'une pièce. Une rotation proche du quart de tour échange
// longueur et largeur ; entre les deux, on prend l'enveloppe pour rester
// conservateur plutôt que de laisser deux pièces s'interpénétrer.
export function footprint(half: Half, x: number, z: number, rotation: number) {
  const c = Math.abs(Math.cos(rotation));
  const s = Math.abs(Math.sin(rotation));
  const hx = half.x * c + half.z * s;
  const hz = half.x * s + half.z * c;
  return new THREE.Box3(
    new THREE.Vector3(x - hx, 0, z - hz),
    new THREE.Vector3(x + hx, 1, z + hz)
  );
}

export class GardenScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private ground: THREE.Mesh;
  private plot: THREE.Mesh;
  private manualPlot: { width: number; depth: number; x?: number; z?: number } | null = null;
  private pool: THREE.Group | null = null;
  private water: THREE.Mesh | null = null;
  private keys = new Set<string>();
  private walking = false;
  private fencePanels: THREE.Group | null = null;
  private fenceTexture: THREE.CanvasTexture | null = null;
  private fenceMeshEnabled = true;
  private building: THREE.Group | null = null;
  private paving: THREE.Group | null = null;
  readonly isMobile: boolean;
  private loader = new GLTFLoader();
  private cache = new Map<string, THREE.Object3D>();
  private objects = new Map<string, THREE.Object3D>();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private selection: THREE.Box3Helper | null = null;
  private dragging: string | null = null;
  private frame = 0;
  private observer: ResizeObserver;

  selectedId: string | null = null;
  onChange: (items: PlacedItem[]) => void = () => {};
  onSelect: (id: string | null) => void = () => {};

  constructor(private mount: HTMLElement) {
    // Mode allégé sur mobile : même scène, mêmes fichiers, mais moins de
    // pixels à calculer et des ombres plus grossières. Rien n'est retiré,
    // seule la charge de rendu baisse.
    const mobile =
      typeof window !== "undefined" &&
      (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 820);
    this.isMobile = mobile;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !mobile,
      preserveDrawingBuffer: true,
      powerPreference: mobile ? "low-power" : "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = mobile ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
    mount.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.touchAction = "none";

    this.scene.background = new THREE.Color("#cfe4f2");
    this.scene.fog = new THREE.Fog("#cfe4f2", 22, 60);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.05, 200);
    this.camera.position.set(6, 4.5, 7);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 35;
    this.controls.target.set(0, 0.4, 0);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x6f8f5a, 2));
    const sun = new THREE.DirectionalLight(0xfff4e2, 2.6);
    sun.position.set(8, 12, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    const s = 16;
    Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.5, far: 50 });
    sun.shadow.camera.updateProjectionMatrix();
    this.scene.add(sun);

    // Pelouse : un simple plan teinté, sans texture, pour rester léger. Il est
    // percé lorsqu'un bassin est posé, faute de quoi il recouvrirait l'eau.
    this.ground = new THREE.Mesh(
      groundGeometry(null),
      new THREE.MeshStandardMaterial({ color: 0x7fa65c, roughness: 1 })
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // Parcelle de terre nue, posée sur la pelouse (masquée par défaut).
    this.plot = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshStandardMaterial({ color: 0x8a6748, roughness: 1 })
    );
    this.plot.rotation.x = -Math.PI / 2;
    this.plot.position.y = 0.004;
    this.plot.receiveShadow = true;
    this.plot.visible = false;
    this.scene.add(this.plot);

    const grid = new THREE.GridHelper(40, 40, 0x6f9450, 0x769a56);
    (grid.material as THREE.Material).opacity = 0.35;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = 0.002;
    this.scene.add(grid);

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(mount);
    this.resize();

    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.addEventListener("pointermove", this.onPointerMove);
    this.renderer.domElement.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp);

    this.loop();
  }

  private resize() {
    const w = this.mount.clientWidth || 1;
    const h = this.mount.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    this.frame = requestAnimationFrame(this.loop);
    if (this.walking) this.stepWalk();
    if (this.water) {
      // Respiration lente de la surface : assez pour que l'eau ne soit pas figée,
      // assez discrète pour ne pas distraire.
      const t = performance.now() / 1000;
      this.water.position.y = -0.12 + Math.sin(t * 0.8) * 0.006;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  // Déplacement à hauteur d'homme : les touches avancent la cible et la
  // caméra ensemble, dans la direction du regard.
  private stepWalk() {
    const forward = (this.keys.has("z") || this.keys.has("w") || this.keys.has("arrowup") ? 1 : 0) -
      (this.keys.has("s") || this.keys.has("arrowdown") ? 1 : 0);
    const strafe = (this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0) -
      (this.keys.has("q") || this.keys.has("a") || this.keys.has("arrowleft") ? 1 : 0);
    if (!forward && !strafe) return;

    const speed = this.keys.has("shift") ? 0.14 : 0.06;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));

    const move = new THREE.Vector3()
      .addScaledVector(dir, forward * speed)
      .addScaledVector(right, strafe * speed);
    this.camera.position.add(move);
    this.controls.target.add(move);
  }

  private static readonly SCROLL_KEYS = new Set([
    "arrowup",
    "arrowdown",
    "arrowleft",
    "arrowright",
    " ",
    "pagedown",
    "pageup",
  ]);

  private onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    // En mode marche, les flèches pilotent la caméra : il faut empêcher la
    // page de défiler en même temps. On laisse passer si la frappe vise un
    // champ de saisie.
    const target = e.target as HTMLElement | null;
    const typing =
      target &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
    if (this.walking && !typing && GardenScene.SCROLL_KEYS.has(key)) e.preventDefault();
    this.keys.add(key);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private setPointer(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  // Remonte du mesh touché jusqu'à l'objet placé auquel il appartient.
  private ownerOf(o: THREE.Object3D | null): string | null {
    let cur: THREE.Object3D | null = o;
    while (cur) {
      if (cur.userData.placedId) return cur.userData.placedId as string;
      cur = cur.parent;
    }
    return null;
  }

  private onPointerDown = (e: PointerEvent) => {
    this.setPointer(e);
    const hits = this.raycaster.intersectObjects([...this.objects.values()], true);
    const id = hits.length ? this.ownerOf(hits[0].object) : null;
    this.select(id);
    if (id) {
      this.dragging = id;
      this.controls.enabled = false;
      this.renderer.domElement.setPointerCapture(e.pointerId);
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    this.setPointer(e);
    const hit = this.raycaster.intersectObject(this.ground)[0];
    if (!hit) return;
    const obj = this.objects.get(this.dragging);
    if (!obj) return;
    const x = snap(hit.point.x);
    const z = snap(hit.point.z);
    const half = obj.userData.half as Half;
    if (this.collidesAt(half, x, z, obj.userData.rotation as number, this.dragging)) return;
    obj.position.x = x;
    obj.position.z = z;
    this.refreshSelectionBox();
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.dragging) return;
    this.renderer.domElement.releasePointerCapture(e.pointerId);
    this.dragging = null;
    this.controls.enabled = true;
    this.syncPlotToFences();
    this.emit();
  };

  // Collision : emprises au sol (boîtes alignées), avec une petite tolérance
  // pour que deux pièces puissent se toucher sans être refusées.
  //
  // L'emprise est passée explicitement, et non lue sur un objet de la scène :
  // au moment de poser une pièce, elle n'y est pas encore, et l'interroger
  // faisait échouer tout test de collision — les pièces s'empilaient à
  // l'origine.
  private collidesAt(half: Half, x: number, z: number, rotation: number, ignoreId?: string) {
    const box = footprint(half, x, z, rotation);
    for (const [otherId, other] of this.objects) {
      if (otherId === ignoreId) continue;
      const b = footprint(
        other.userData.half as Half,
        other.position.x,
        other.position.z,
        other.userData.rotation as number
      );
      const overlapX = Math.min(box.max.x, b.max.x) - Math.max(box.min.x, b.min.x);
      const overlapZ = Math.min(box.max.z, b.max.z) - Math.max(box.min.z, b.min.z);
      if (overlapX > 0.02 && overlapZ > 0.02) return true;
    }
    return false;
  }

  // Place libre la plus proche, en spirale autour du point visé.
  private findFreeSpot(half: Half, x: number, z: number, rotation: number, ignoreId?: string) {
    if (!this.collidesAt(half, x, z, rotation, ignoreId)) return { x: snap(x), z: snap(z) };
    for (let ring = 1; ring < 60; ring++) {
      const radius = ring * GRID * 3;
      const steps = Math.min(48, 8 * ring);
      for (let a = 0; a < steps; a++) {
        const angle = (a / steps) * Math.PI * 2;
        const cx = snap(x + Math.cos(angle) * radius);
        const cz = snap(z + Math.sin(angle) * radius);
        if (!this.collidesAt(half, cx, cz, rotation, ignoreId)) return { x: cx, z: cz };
      }
    }
    return { x: snap(x), z: snap(z) };
  }

  private async load(ref: string) {
    const cached = this.cache.get(ref);
    if (cached) return cached.clone(true);
    const gltf = await this.loader.loadAsync(`/models_web/glb/${ref}.glb`);
    const model = gltf.scene;
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        // Chaque instance doit pouvoir porter son propre coloris.
        m.material = Array.isArray(m.material)
          ? m.material.map((x) => x.clone())
          : (m.material as THREE.Material).clone();
      }
    });
    this.cache.set(ref, model);
    return model.clone(true);
  }

  async add(item: PlacedItem) {
    const model = await this.load(item.ref);
    const holder = new THREE.Group();
    holder.userData.placedId = item.id;
    holder.userData.ref = item.ref;
    holder.userData.rotation = item.rotation;

    // La pièce est centrée sur X/Z et posée sur le sol.
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -box.min.y, -center.z);
    holder.add(model);
    const half: Half = { x: size.x / 2, z: size.z / 2 };
    holder.userData.half = half;
    holder.userData.height = size.y;
    holder.userData.model = model;

    // L'emprise n'est connue qu'ici, une fois le modèle mesuré : c'est donc
    // ici, et pas avant l'appel, que la place libre se cherche.
    const spot = this.findFreeSpot(half, item.x, item.z, item.rotation);
    holder.position.set(spot.x, 0, spot.z);
    holder.rotation.y = item.rotation;

    this.objects.set(item.id, holder);
    this.scene.add(holder);

    this.syncPlotToFences();
    this.applyFinish(item.id, item.finish);
    if (item.species) await this.applySpecies(item.id, item.species);
    this.emit();
  }

  applyFinish(id: string, finish: string) {
    const holder = this.objects.get(id);
    if (!holder) return;
    const palette = paletteFor(finish);
    const model = holder.userData.model as THREE.Object3D;
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.parent?.name === "plantation" || mesh.userData.plant) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        const rgba = palette[m.name];
        if (rgba) (m as THREE.MeshStandardMaterial).color.setRGB(rgba[0], rgba[1], rgba[2]);
      }
    });
    holder.userData.finish = finish;
  }

  async applySpecies(id: string, species: string | null) {
    const holder = this.objects.get(id);
    if (!holder) return;
    const model = holder.userData.model as THREE.Object3D;

    const previous = model.getObjectByName("plantation");
    if (previous) model.remove(previous);
    holder.userData.species = species;
    if (!species) return;

    const { fillPlanter } = await import("@/public/3d/plants-builder.js");
    const plantation = fillPlanter(THREE, model, { species, seed: 7 });
    if (!plantation) return;
    plantation.traverse((o: THREE.Object3D) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.userData.plant = true;
      }
    });
    model.add(plantation);
  }

  rotate(id: string, step = Math.PI / 12) {
    const holder = this.objects.get(id);
    if (!holder) return;
    const rotation = (holder.userData.rotation as number) + step;
    const half = holder.userData.half as Half;
    if (this.collidesAt(half, holder.position.x, holder.position.z, rotation, id)) return;
    holder.userData.rotation = rotation;
    holder.rotation.y = rotation;
    this.refreshSelectionBox();
    this.emit();
  }

  remove(id: string) {
    const holder = this.objects.get(id);
    if (!holder) return;
    this.scene.remove(holder);
    this.objects.delete(id);
    this.syncPlotToFences();
    if (this.selectedId === id) this.select(null);
    this.emit();
  }

  select(id: string | null) {
    if (this.selection) {
      this.scene.remove(this.selection);
      this.selection = null;
    }
    this.selectedId = id;
    if (id) this.refreshSelectionBox();
    this.onSelect(id);
  }

  private refreshSelectionBox() {
    if (this.selection) this.scene.remove(this.selection);
    const holder = this.selectedId ? this.objects.get(this.selectedId) : null;
    if (!holder) return;
    const box = new THREE.Box3().setFromObject(holder);
    this.selection = new THREE.Box3Helper(box, new THREE.Color("#c0392b"));
    this.scene.add(this.selection);
  }

  /** Affiche (ou masque) la parcelle sous les pièces. */
  setPlot(size: { width: number; depth: number; x?: number; z?: number } | null) {
    if (!size) {
      this.plot.visible = false;
      this.manualPlot = null;
      return;
    }
    this.manualPlot = size;
    this.plot.geometry.dispose();
    this.plot.geometry = new THREE.PlaneGeometry(size.width, size.depth);
    this.plot.position.x = size.x ?? 0;
    this.plot.position.z = size.z ?? 0;
    this.plot.visible = true;
  }

  /** Couleur du sol général (pelouse, terre, sable…). */
  setGround(kind: GroundKind) {
    const color = groundColor(kind);
    (this.ground.material as THREE.MeshStandardMaterial).color.setHex(color);
  }

  /** Couleur de la parcelle délimitée. */
  setPlotGround(kind: GroundKind) {
    const color = groundColor(kind);
    (this.plot.material as THREE.MeshStandardMaterial).color.setHex(color);
  }

  /** Tend (ou retire) le grillage entre les piquets posés. */
  setFenceMesh(enabled: boolean) {
    this.fenceMeshEnabled = enabled;
    this.syncFenceMesh();
  }

  // Grillage : on relie chaque piquet à ses voisins proches. Le seuil exclut
  // les diagonales de coin (2,26 m pour un pas de 1,60 m) tout en gardant les
  // travées d'un alignement.
  private syncFenceMesh() {
    if (this.fencePanels) {
      this.scene.remove(this.fencePanels);
      this.fencePanels.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      this.fencePanels = null;
    }
    if (!this.fenceMeshEnabled) return;

    const posts = [...this.objects.values()].filter((o) => FENCE_REFS.has(o.userData.ref as string));
    if (posts.length < 2) return;

    const group = new THREE.Group();
    const material = this.fenceMaterial();

    for (const [i, j] of fenceEdges(posts.map((p) => ({ x: p.position.x, z: p.position.z })))) {
      const a = posts[i].position;
      const b = posts[j].position;
      const span = Math.hypot(b.x - a.x, b.z - a.z);

      // Hauteur du grillage : celle du piquet, moins un retrait en tête. La
      // valeur par défaut évite une géométrie NaN si la hauteur manque.
      const poteau = Number(posts[i].userData.height);
      const height = Math.max(0.4, (Number.isFinite(poteau) ? poteau : 2) - 0.15);

      const panel = new THREE.Mesh(new THREE.PlaneGeometry(span, height), material);
      panel.position.set((a.x + b.x) / 2, height / 2, (a.z + b.z) / 2);
      panel.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
      group.add(panel);
    }

    this.fencePanels = group;
    this.scene.add(group);
  }

  // Texture de grillage dessinée une fois sur un canevas : une maille losange
  // claire sur fond transparent, bien plus légère que des barreaux modélisés.
  private fenceMaterial() {
    if (!this.fenceTexture) {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, size, size);
      ctx.strokeStyle = "rgba(190, 195, 190, 0.95)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size, size);
      ctx.moveTo(size, 0);
      ctx.lineTo(0, size);
      ctx.stroke();
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(12, 12);
      this.fenceTexture = texture;
    }
    return new THREE.MeshStandardMaterial({
      map: this.fenceTexture,
      transparent: true,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      roughness: 0.7,
      metalness: 0.3,
    });
  }

  /**
   * Pave une surface avec une référence de dallage. Les plaques sont posées
   * au pas du module (voir paving.mjs) et non au pas de leur boîte, sinon un
   * vide apparaîtrait à chaque plaque. Une seule InstancedMesh par maillage
   * de la plaque : paver une terrasse coûte alors quelques dizaines d'appels
   * de rendu, quel que soit le nombre de dalles.
   */
  async setPaving(ref: string | null, area?: { width: number; depth: number; x?: number; z?: number }) {
    if (this.paving) {
      this.scene.remove(this.paving);
      this.paving.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      this.paving = null;
    }
    if (!ref) return;

    const surface = area ?? (this.isMobile ? { width: 10, depth: 8 } : { width: 16, depth: 12 });
    const layout = pavingLayout(ref, surface);
    if (!layout) return;

    const model = await this.load(ref);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    // La plaque est recentrée et posée au sol avant d'être répétée.
    const recentre = new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z);

    const meshes: THREE.Mesh[] = [];
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) meshes.push(m);
    });

    const group = new THREE.Group();
    const tmp = new THREE.Matrix4();
    for (const mesh of meshes) {
      const instanced = new THREE.InstancedMesh(
        mesh.geometry,
        mesh.material,
        layout.positions.length
      );
      instanced.castShadow = false;
      instanced.receiveShadow = true;
      layout.positions.forEach((p, i) => {
        tmp
          .makeTranslation(p.x, 0.005, p.z)
          .multiply(recentre)
          .multiply(mesh.matrixWorld);
        instanced.setMatrixAt(i, tmp);
      });
      instanced.instanceMatrix.needsUpdate = true;
      group.add(instanced);
    }

    this.paving = group;
    this.scene.add(group);
  }

  /** Maison ou villa de décor, reculée derrière la scène. */
  setBuilding(kind: BuildingKind, z?: number) {
    if (this.building) {
      this.scene.remove(this.building);
      this.building.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      this.building = null;
    }
    const built = buildBuilding(kind);
    if (!built) return;
    // Posé en fond de scène, façade tournée vers la caméra.
    built.position.z = z ?? -(buildingDepth(kind) / 2 + 7);
    this.building = built;
    this.scene.add(built);
  }

  // La parcelle suit les clôtures posées : on la redessine sur l'emprise des
  // piquets, avec une marge pour qu'elle affleure sous eux.
  private syncPlotToFences() {
    this.syncFenceMesh();
    if (this.manualPlot) return;
    const posts = [...this.objects.values()].filter((o) => FENCE_REFS.has(o.userData.ref as string));
    if (posts.length < 3) {
      this.plot.visible = false;
      return;
    }
    const box = new THREE.Box3();
    for (const p of posts) {
      const half = p.userData.half as Half;
      box.expandByPoint(new THREE.Vector3(p.position.x - half.x, 0, p.position.z - half.z));
      box.expandByPoint(new THREE.Vector3(p.position.x + half.x, 0, p.position.z + half.z));
    }
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    if (size.x < 0.5 || size.z < 0.5) return;
    this.plot.geometry.dispose();
    this.plot.geometry = new THREE.PlaneGeometry(size.x, size.z);
    this.plot.position.set(center.x, this.plot.position.y, center.z);
    this.plot.visible = true;
  }

  /**
   * Bassin rectangulaire avec margelles et eau. Procédural : aucun modèle à
   * charger, et les dimensions restent libres.
   */
  setPool(
    spec: { width: number; depth: number; x?: number; z?: number; water?: boolean } | null
  ) {
    // Percer le sol fait partie de la pose du bassin : sans cela, la pelouse
    // masque l'eau et les parois, et le bassin paraît vide.
    this.ground.geometry.dispose();
    this.ground.geometry = groundGeometry(spec);

    if (this.pool) {
      this.scene.remove(this.pool);
      this.pool.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
      });
      this.pool = null;
      this.water = null;
    }
    if (!spec) return;

    const { width: w, depth: d } = spec;
    const group = new THREE.Group();
    group.position.set(spec.x ?? 0, 0, spec.z ?? 0);

    // Cuvette : un fond clair et des parois, creusés sous le niveau du sol.
    const depthOfWater = 1.4;
    const basin = new THREE.Mesh(
      new THREE.BoxGeometry(w, depthOfWater, d),
      new THREE.MeshStandardMaterial({ color: 0x9fd4e8, roughness: 0.5, side: THREE.BackSide })
    );
    basin.position.y = -depthOfWater / 2;
    basin.receiveShadow = true;
    group.add(basin);

    // Eau : plan translucide, légèrement animé. Un bassin vide s'en passe et
    // laisse voir le fond, comme une piscine hors saison ou en construction.
    if (spec.water !== false) {
      this.water = new THREE.Mesh(
        new THREE.PlaneGeometry(w - 0.05, d - 0.05),
        new THREE.MeshStandardMaterial({
          color: 0x3aa3c9,
          roughness: 0.12,
          metalness: 0.25,
          transparent: true,
          opacity: 0.82,
        })
      );
      this.water.rotation.x = -Math.PI / 2;
      this.water.position.y = -0.12;
      group.add(this.water);
    }

    // Margelles : quatre dalles claires autour du bassin.
    const coping = new THREE.MeshStandardMaterial({ color: 0xe6e0d4, roughness: 0.9 });
    const band = 0.4;
    const pieces: [number, number, number, number][] = [
      [w + band * 2, band, 0, -d / 2 - band / 2],
      [w + band * 2, band, 0, d / 2 + band / 2],
      [band, d, -w / 2 - band / 2, 0],
      [band, d, w / 2 + band / 2, 0],
    ];
    for (const [sx, sz, px, pz] of pieces) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.08, sz), coping);
      slab.position.set(px, 0.04, pz);
      slab.castShadow = true;
      slab.receiveShadow = true;
      group.add(slab);
    }

    this.pool = group;
    this.scene.add(group);
  }

  setCamera(mode: CameraMode) {
    this.walking = mode === "marche";
    if (this.walking) {
      const t = this.controls.target;
      this.camera.position.set(t.x, 1.65, t.z + 4);
      this.controls.target.set(t.x, 1.55, t.z);
      this.controls.maxPolarAngle = Math.PI / 2 + 0.25;
      this.controls.minDistance = 0.4;
      this.controls.update();
      return;
    }
    this.controls.minDistance = 1.5;
    this.applyCamera(mode);
  }

  private applyCamera(mode: CameraMode) {
    const t = this.controls.target;
    if (mode === "dessus") {
      this.camera.position.set(t.x, 14, t.z + 0.01);
      this.controls.maxPolarAngle = Math.PI;
    } else if (mode === "hauteur") {
      this.camera.position.set(t.x + 5, 1.65, t.z + 5);
      this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    } else {
      this.camera.position.set(t.x + 6, 4.5, t.z + 7);
      this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    }
    this.controls.update();
  }

  screenshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL("image/png");
  }

  items(): PlacedItem[] {
    return [...this.objects.entries()].map(([id, o]) => ({
      id,
      ref: o.userData.ref as string,
      finish: (o.userData.finish as string) ?? "blanc",
      species: (o.userData.species as string | null) ?? null,
      x: o.position.x,
      z: o.position.z,
      rotation: o.userData.rotation as number,
    }));
  }

  clear() {
    for (const id of [...this.objects.keys()]) this.remove(id);
  }

  private emit() {
    this.onChange(this.items());
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.removeEventListener("pointermove", this.onPointerMove);
    this.renderer.domElement.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.controls.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      mats.forEach((x) => x.dispose());
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
