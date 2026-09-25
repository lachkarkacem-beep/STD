// Moteur de la scène « Prévisualiser mon jardin ».
//
// Volontairement hors de React : un seul contexte WebGL, une boucle de rendu,
// et un état d'objets que le composant React se contente de piloter et
// d'observer. Les GLB sont chargés à la demande et mis en cache par référence.

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { paletteFor } from "@/lib/finishes";

export type PlacedItem = {
  id: string;
  ref: string;
  finish: string;
  species: string | null;
  x: number;
  z: number;
  rotation: number;
};

export type CameraMode = "orbite" | "dessus" | "hauteur";

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
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    sun.shadow.mapSize.set(2048, 2048);
    const s = 16;
    Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.5, far: 50 });
    sun.shadow.camera.updateProjectionMatrix();
    this.scene.add(sun);

    // Pelouse : un simple plan teinté, sans texture, pour rester léger.
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
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
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
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
    holder.userData.model = model;

    // L'emprise n'est connue qu'ici, une fois le modèle mesuré : c'est donc
    // ici, et pas avant l'appel, que la place libre se cherche.
    const spot = this.findFreeSpot(half, item.x, item.z, item.rotation);
    holder.position.set(spot.x, 0, spot.z);
    holder.rotation.y = item.rotation;

    this.objects.set(item.id, holder);
    this.scene.add(holder);

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

  /** Affiche (ou masque) la parcelle de terre nue sous les pièces. */
  setPlot(size: { width: number; depth: number } | null) {
    if (!size) {
      this.plot.visible = false;
      return;
    }
    this.plot.geometry.dispose();
    this.plot.geometry = new THREE.PlaneGeometry(size.width, size.depth);
    this.plot.visible = true;
  }

  setCamera(mode: CameraMode) {
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
