"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GALLERY_REFS, galleryCount, galleryLayout } from "@/lib/gallery.mjs";

type Piece = {
  ref: string;
  name: string;
  group: import("three").Group;
  base: { x: number; y: number; z: number };
  scale: number;
  phase: number;
  bob: number;
  speed: number;
  drift: number;
  spin: number;
  hover: number;
};

// Galerie flottante : les vraies pièces du catalogue, réduites et suspendues.
// Un seul contexte WebGL pour l'ensemble, et les modèles arrivent un par un —
// la galerie se remplit au fur et à mesure plutôt que d'attendre les douze.
export default function FloatingGallery({
  products,
}: {
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const mountRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(0);
  const [survol, setSurvol] = useState<{ name: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const mobile =
      window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 820;
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let disposed = false;
    const cleanups: (() => void)[] = [];

    (async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      if (disposed || !mountRef.current) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
      camera.position.set(0, 0, 8.5);

      const renderer = new THREE.WebGLRenderer({
        antialias: !mobile,
        alpha: true,
        powerPreference: mobile ? "low-power" : "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
      renderer.shadowMap.enabled = !mobile;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      mount.appendChild(renderer.domElement);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";

      // Éclairage de showroom : une clé chaude, un remplissage froid, un
      // contre-jour qui détache les silhouettes du fond.
      scene.add(new THREE.HemisphereLight(0xffffff, 0xe6ddd0, 2));
      const key = new THREE.DirectionalLight(0xfff4e4, 2.4);
      key.position.set(3, 4, 5);
      key.castShadow = !mobile;
      key.shadow.mapSize.set(1024, 1024);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xdfe9f2, 0.9);
      fill.position.set(-4, 1, 2);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0xffffff, 0.7);
      rim.position.set(0, 2, -5);
      scene.add(rim);

      const pieces: Piece[] = [];
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let pointed: Piece | null = null;

      let raf = 0;
      const resize = () => {
        const w = mount.clientWidth || 1;
        const h = mount.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(mount);
      resize();

      const count = galleryCount(mobile);
      const layout = galleryLayout(count);
      const loader = new GLTFLoader();

      // Chargement un par un : la première pièce apparaît sans attendre les
      // autres, et le fil principal n'est jamais bloqué longtemps.
      (async () => {
        for (const [i, spot] of layout.entries()) {
          if (disposed) return;
          const ref = GALLERY_REFS[i % GALLERY_REFS.length];
          try {
            const gltf = await loader.loadAsync(`/models_web/glb/${ref}.glb`);
            if (disposed) return;
            const model = gltf.scene;

            // Chaque pièce est ramenée à une taille commune : sans cela un
            // puits de 2 m écraserait un pas japonais de 5 cm.
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const norm = 1 / Math.max(size.x, size.y, size.z);
            model.position.set(-center.x * norm, -center.y * norm, -center.z * norm);
            model.scale.setScalar(norm);
            model.traverse((o) => {
              const m = o as import("three").Mesh;
              if (m.isMesh) {
                m.castShadow = !mobile;
                m.receiveShadow = false;
              }
            });

            const group = new THREE.Group();
            group.add(model);
            group.position.set(spot.x, spot.y, spot.z);
            group.scale.setScalar(spot.scale * 4.2);
            group.userData.ref = ref;
            scene.add(group);

            pieces.push({
              ref,
              name: products.find((p) => p.id === ref)?.name ?? ref,
              group,
              base: { x: spot.x, y: spot.y, z: spot.z },
              scale: spot.scale * 4.2,
              phase: spot.phase,
              bob: spot.bob,
              speed: spot.speed,
              drift: spot.drift,
              spin: spot.spin,
              hover: 0,
            });
            setLoaded((n) => n + 1);
          } catch {
            // une pièce manquante ne doit pas vider la galerie
          }
        }
      })();

      const onMove = (e: PointerEvent) => {
        const r = renderer.domElement.getBoundingClientRect();
        pointer.set(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          -((e.clientY - r.top) / r.height) * 2 + 1
        );
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(pieces.map((p) => p.group), true);
        let found: Piece | null = null;
        if (hits.length) {
          let cur: import("three").Object3D | null = hits[0].object;
          while (cur && !cur.userData.ref) cur = cur.parent;
          found = pieces.find((p) => p.group === cur) ?? null;
        }
        pointed = found;
        renderer.domElement.style.cursor = found ? "pointer" : "default";
        setSurvol(found ? { name: found.name, x: e.clientX - r.left, y: e.clientY - r.top } : null);
      };

      const onClick = () => {
        if (pointed) router.push(`/catalogue/${pointed.ref}`);
      };

      renderer.domElement.addEventListener("pointermove", onMove);
      renderer.domElement.addEventListener("click", onClick);
      renderer.domElement.addEventListener("pointerleave", () => {
        pointed = null;
        setSurvol(null);
      });

      const loop = () => {
        raf = requestAnimationFrame(loop);
        const t = performance.now() / 1000;

        for (const p of pieces) {
          if (!calme) {
            // Flottement : montée-descente, dérive latérale sur une période
            // différente, et rotation lente. Les trois se décalent, donc le
            // mouvement ne se répète jamais franchement.
            p.group.position.y = p.base.y + Math.sin(t * p.speed + p.phase) * p.bob;
            p.group.position.x = p.base.x + Math.sin(t * p.speed * 0.42 + p.phase * 1.7) * p.drift;
            p.group.rotation.y += p.spin * 0.016;
          }
          // Le survol grossit la pièce et l'éclaircit, en douceur.
          const cible = pointed === p ? 1 : 0;
          p.hover += (cible - p.hover) * 0.12;
          p.group.scale.setScalar(p.scale * (1 + p.hover * 0.18));
          p.group.traverse((o) => {
            const m = o as import("three").Mesh;
            const mat = m.material as import("three").MeshStandardMaterial | undefined;
            if (m.isMesh && mat?.emissive) {
              mat.emissive.setScalar(p.hover * 0.12);
            }
          });
        }
        renderer.render(scene, camera);
      };
      loop();

      cleanups.push(() => {
        cancelAnimationFrame(raf);
        observer.disconnect();
        renderer.domElement.removeEventListener("pointermove", onMove);
        renderer.domElement.removeEventListener("click", onClick);
        scene.traverse((o) => {
          const m = o as import("three").Mesh;
          m.geometry?.dispose();
          const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
          mats.forEach((x) => x.dispose());
        });
        renderer.dispose();
        renderer.domElement.remove();
      });
    })();

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
  }, [products, router]);

  return (
    <div className="relative h-[52vh] min-h-72 overflow-hidden rounded-xl border border-line bg-gradient-to-b from-surface via-leaf-50 to-leaf-100 sm:h-[58vh]">
      <div ref={mountRef} className="h-full w-full" />

      {survol && (
        <span
          className="pointer-events-none absolute rounded-full bg-ink/85 px-3 py-1 text-xs text-white"
          style={{ left: survol.x + 14, top: survol.y + 14 }}
        >
          {survol.name}
        </span>
      )}

      {loaded === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-ink-faint">
          Chargement de la galerie…
        </div>
      )}

      <span className="pointer-events-none absolute bottom-3 left-4 text-xs text-ink-faint">
        Cliquez une pièce pour ouvrir sa fiche
      </span>
    </div>
  );
}
