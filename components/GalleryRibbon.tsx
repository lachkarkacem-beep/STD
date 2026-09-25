"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GALLERY_REFS } from "@/lib/gallery.mjs";
import { ribbonCount, ribbonLayout, ribbonSpan, ribbonX } from "@/lib/ribbon.mjs";

type Piece = {
  ref: string;
  name: string;
  group: import("three").Group;
  x0: number;
  y: number;
  z: number;
  scale: number;
  phase: number;
  bob: number;
  bobSpeed: number;
  spin: number;
  hover: number;
};

const VITESSE = 0.55; // unités par seconde — la lenteur d'une vitrine, pas d'un bandeau

// Bande défilante : les pièces du catalogue traversent l'accueil de droite à
// gauche, sans fin. Celle qui sort à gauche revient par la droite, hors champ,
// si bien que le raccord ne se voit jamais.
export default function GalleryRibbon({
  products,
}: {
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const mountRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(0);
  const [survol, setSurvol] = useState<{ name: string; x: number } | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    const cleanups: (() => void)[] = [];

    // Le moteur 3D ne se charge qu'à l'approche du regard : arriver sur
    // l'accueil ne doit pas coûter three.js.
    const demarrer = () => {
      if (disposed) return;
      void init();
    };

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === "undefined") {
      demarrer();
    } else {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io?.disconnect();
            demarrer();
          }
        },
        { rootMargin: "300px" }
      );
      io.observe(mount);
      cleanups.push(() => io?.disconnect());
    }

    async function init() {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      if (disposed || !mountRef.current) return;

      const mobile =
        window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 820;
      const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40);
      camera.position.set(0, 0, 4.2);

      const renderer = new THREE.WebGLRenderer({
        antialias: !mobile,
        alpha: true,
        powerPreference: mobile ? "low-power" : "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
      mount!.appendChild(renderer.domElement);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";

      // Même éclairage de showroom que la galerie du catalogue : une clé
      // chaude, un remplissage froid, un contre-jour qui détache les pièces.
      scene.add(new THREE.HemisphereLight(0xffffff, 0xe6ddd0, 2.1));
      const key = new THREE.DirectionalLight(0xfff4e4, 2.3);
      key.position.set(3, 4, 5);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xdfe9f2, 0.9);
      fill.position.set(-4, 1, 2);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0xffffff, 0.7);
      rim.position.set(0, 2, -5);
      scene.add(rim);

      // La largeur visible dépend de la fenêtre : on en déduit combien de
      // pièces il faut pour couvrir la bande sans laisser de trou.
      const demiLargeur = () => {
        const h = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
        return (h * camera.aspect) / 2;
      };

      const resize = () => {
        const w = mount!.clientWidth || 1;
        const h = mount!.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(mount!);
      resize();

      const count = ribbonCount(demiLargeur());
      const span = ribbonSpan(count);
      const layout = ribbonLayout(count);

      const pieces: Piece[] = [];
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let pointed: Piece | null = null;
      let ralenti = 0; // 0 = plein défilement, 1 = quasi arrêt sous le curseur
      let parcours = 0; // distance parcourue, pour que le ralenti ne saute pas

      const loader = new GLTFLoader();

      // Chargement un par un : la bande se remplit au fur et à mesure plutôt
      // que d'attendre la dernière pièce.
      (async () => {
        for (const [i, spot] of layout.entries()) {
          if (disposed) return;
          const ref = GALLERY_REFS[i % GALLERY_REFS.length];
          try {
            const gltf = await loader.loadAsync(`/models_web/glb/${ref}.glb`);
            if (disposed) return;
            const model = gltf.scene;

            // Toutes ramenées à une taille commune : sans cela un puits de 2 m
            // écraserait un pas japonais de 5 cm.
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const norm = 1 / Math.max(size.x, size.y, size.z);
            model.position.set(-center.x * norm, -center.y * norm, -center.z * norm);
            model.scale.setScalar(norm);

            const group = new THREE.Group();
            group.add(model);
            group.position.set(spot.x0, spot.y, spot.z);
            group.scale.setScalar(spot.scale);
            group.userData.ref = ref;
            scene.add(group);

            pieces.push({
              ref,
              name: products.find((p) => p.id === ref)?.name ?? ref,
              group,
              x0: spot.x0,
              y: spot.y,
              z: spot.z,
              scale: spot.scale,
              phase: spot.phase,
              bob: spot.bob,
              bobSpeed: spot.bobSpeed,
              spin: spot.spin,
              hover: 0,
            });
            setLoaded((n) => n + 1);
          } catch {
            // une pièce manquante ne doit pas interrompre la bande
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
        setSurvol(found ? { name: found.name, x: e.clientX - r.left } : null);
      };

      const onClick = () => {
        if (pointed) router.push(`/catalogue/${pointed.ref}`);
      };
      const onLeave = () => {
        pointed = null;
        setSurvol(null);
      };

      renderer.domElement.addEventListener("pointermove", onMove);
      renderer.domElement.addEventListener("click", onClick);
      renderer.domElement.addEventListener("pointerleave", onLeave);

      let raf = 0;
      let dernier = performance.now();

      const loop = () => {
        raf = requestAnimationFrame(loop);
        const maintenant = performance.now();
        const dt = Math.min((maintenant - dernier) / 1000, 0.05); // onglet en arrière-plan
        dernier = maintenant;
        const t = maintenant / 1000;

        // La bande ralentit presque à l'arrêt quand le curseur survole une
        // pièce : on ne peut pas cliquer ce qui fuit.
        const cible = pointed ? 1 : 0;
        ralenti += (cible - ralenti) * Math.min(dt * 5, 1);
        if (!calme) parcours += VITESSE * (1 - ralenti * 0.92) * dt;

        for (const p of pieces) {
          p.group.position.x = ribbonX(p.x0, parcours, 1, span);
          if (!calme) {
            p.group.position.y = p.y + Math.sin(t * p.bobSpeed + p.phase) * p.bob;
            p.group.rotation.y += p.spin * dt;
          }
          const h = pointed === p ? 1 : 0;
          p.hover += (h - p.hover) * Math.min(dt * 8, 1);
          p.group.scale.setScalar(p.scale * (1 + p.hover * 0.16));
          p.group.traverse((o) => {
            const m = o as import("three").Mesh;
            const mat = m.material as import("three").MeshStandardMaterial | undefined;
            if (m.isMesh && mat?.emissive) mat.emissive.setScalar(p.hover * 0.12);
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
        renderer.domElement.removeEventListener("pointerleave", onLeave);
        scene.traverse((o) => {
          const m = o as import("three").Mesh;
          m.geometry?.dispose();
          const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
          mats.forEach((x) => x.dispose());
        });
        renderer.dispose();
        renderer.domElement.remove();
      });
    }

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
  }, [products, router]);

  return (
    <div className="relative h-52 overflow-hidden sm:h-64">
      <div ref={mountRef} className="h-full w-full" />

      {/* Les bords s'estompent : les pièces entrent et sortent du champ sans
          qu'on voie jamais le raccord. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-page to-transparent sm:w-32"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-page to-transparent sm:w-32"
      />

      {survol && (
        <span
          className="pointer-events-none absolute bottom-4 rounded-full bg-ink/85 px-3 py-1 text-xs text-white"
          style={{ left: survol.x, transform: "translateX(-50%)" }}
        >
          {survol.name}
        </span>
      )}

      {loaded === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-ink-faint">
          Les pièces arrivent…
        </div>
      )}
    </div>
  );
}
