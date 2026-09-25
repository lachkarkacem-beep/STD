"use client";

import { useEffect, useRef, useState } from "react";
import { paletteFor } from "@/lib/finishes";

// Visionneuse three.js maison. Elle remplace <model-viewer> sur la fiche
// produit parce qu'il faut pouvoir injecter des végétaux dans la scène, ce que
// le composant web ne permet pas. Le même socle servira l'éditeur de jardin.

type Props = {
  src: string;
  finish: string;
  species?: string | null;
  autoRotate?: boolean;
  interactive?: boolean;
  className?: string;
  onExportReady?: (exporter: (withPlants: boolean) => Promise<Blob>) => void;
};

export default function Viewer3D({
  src,
  finish,
  species = null,
  autoRotate = true,
  interactive = true,
  className = "",
  onExportReady,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<Record<string, unknown>>({});
  const [status, setStatus] = useState<"chargement" | "pret" | "erreur">("chargement");

  // Scène, rendu et chargement du modèle : monté une fois par source.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    const cleanups: (() => void)[] = [];

    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      if (disposed) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      mount.appendChild(renderer.domElement);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";

      scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d8d0, 2.2));
      const sun = new THREE.DirectionalLight(0xfff6e8, 2.4);
      sun.position.set(1.4, 2.6, 1.2);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      scene.add(sun);

      // Sol invisible qui ne reçoit que l'ombre : la pièce paraît posée.
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.ShadowMaterial({ opacity: 0.22 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.enabled = interactive;
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 0.8;
      controls.minPolarAngle = 0.15;
      controls.maxPolarAngle = Math.PI / 2 - 0.02;

      const root = new THREE.Group();
      scene.add(root);

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

      const loop = () => {
        raf = requestAnimationFrame(loop);
        controls.update();
        renderer.render(scene, camera);
      };
      loop();

      try {
        const gltf = await new GLTFLoader().loadAsync(src);
        if (disposed) return;
        const model = gltf.scene;
        model.traverse((o) => {
          const m = o as unknown as { isMesh?: boolean; castShadow: boolean; receiveShadow: boolean };
          if (m.isMesh) {
            m.castShadow = true;
            m.receiveShadow = true;
          }
        });
        root.add(model);

        // Cadrage : la pièce est posée au sol et la caméra reculée pour la voir
        // entière quelle que soit sa taille (un tabouret ou un banc de 2 m).
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        model.position.set(-center.x, -box.min.y, -center.z);

        const radius = Math.max(size.x, size.z) / 2;
        const distance = Math.max(size.y, radius * 2) * 1.9;
        camera.position.set(distance * 0.75, size.y * 0.85 + distance * 0.35, distance * 0.75);
        controls.target.set(0, size.y * 0.42, 0);
        controls.update();

        Object.assign(stateRef.current, { THREE, scene, root, model, renderer, camera });
        setStatus("pret");
      } catch {
        if (!disposed) setStatus("erreur");
      }

      cleanups.push(() => {
        cancelAnimationFrame(raf);
        observer.disconnect();
        controls.dispose();
        scene.traverse((o) => {
          const m = o as unknown as {
            geometry?: { dispose(): void };
            material?: { dispose(): void } | { dispose(): void }[];
          };
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
  }, [src, autoRotate, interactive]);

  // Coloris : ne touche qu'aux matériaux de pierre. La terre, le fer forgé et
  // le décor de carreaux gardent leurs couleurs, comme les plantes.
  useEffect(() => {
    const s = stateRef.current as {
      THREE?: typeof import("three");
      model?: import("three").Object3D;
    };
    if (!s.model || !s.THREE) return;
    const palette = paletteFor(finish);
    s.model.traverse((o) => {
      const mesh = o as import("three").Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        const target = palette[m.name];
        if (target) (m as import("three").MeshStandardMaterial).color.setRGB(target[0], target[1], target[2]);
      }
    });
  }, [finish, status]);

  // Plantation : reconstruite à chaque changement d'espèce, jamais recolorée.
  useEffect(() => {
    const s = stateRef.current as {
      THREE?: typeof import("three");
      root?: import("three").Group;
      model?: import("three").Object3D;
      plantation?: import("three").Object3D;
    };
    if (!s.root || !s.model || !s.THREE) return;

    if (s.plantation) {
      s.root.remove(s.plantation);
      s.plantation = undefined;
    }
    if (!species) return;

    let cancelled = false;
    import("@/public/3d/plants-builder.js").then(({ fillPlanter }) => {
      if (cancelled || !s.root || !s.model || !s.THREE) return;
      const plantation = fillPlanter(s.THREE, s.model, { species, seed: 7 });
      if (!plantation) return;
      plantation.traverse((o: import("three").Object3D) => {
        const mesh = o as import("three").Mesh;
        if (mesh.isMesh) mesh.castShadow = true;
      });
      s.model.add(plantation);
      s.plantation = plantation;
    });

    return () => {
      cancelled = true;
    };
  }, [species, status]);

  // Export GLB, avec ou sans les plantes.
  useEffect(() => {
    if (!onExportReady || status !== "pret") return;
    onExportReady(async (withPlants: boolean) => {
      const s = stateRef.current as {
        model?: import("three").Object3D;
        plantation?: import("three").Object3D;
      };
      const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
      const model = s.model!;
      const plantation = s.plantation;
      if (!withPlants && plantation) model.remove(plantation);
      try {
        const buffer = await new GLTFExporter().parseAsync(model, { binary: true });
        return new Blob([buffer as ArrayBuffer], { type: "model/gltf-binary" });
      } finally {
        if (!withPlants && plantation) model.add(plantation);
      }
    });
  }, [onExportReady, status]);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <div ref={mountRef} className="h-full w-full" />
      {status !== "pret" && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-ink-faint">
          {status === "erreur" ? "Vue 3D indisponible" : "Chargement de la vue 3D…"}
        </div>
      )}
    </div>
  );
}
