"use client";

import { useEffect, useRef, useState } from "react";

// Le logo en relief, tournant doucement à côté du titre d'accueil. Il ne
// passe pas par Viewer3D : celui-ci recolore la pierre selon un coloris
// produit, ce qui n'aurait aucun sens sur un logo — ses couleurs sont la
// marque elle-même.
export default function LogoViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Respecter qui demande moins de mouvement : le logo reste alors fixe.
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let disposed = false;
    const cleanups: (() => void)[] = [];

    (async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      if (disposed || !mountRef.current) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 20);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";

      scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d4c8, 2.4));
      const key = new THREE.DirectionalLight(0xfff6e8, 2.2);
      key.position.set(1.5, 2, 2.5);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xffffff, 0.8);
      fill.position.set(-2, 0.5, 1);
      scene.add(fill);

      const pivot = new THREE.Group();
      scene.add(pivot);

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

      try {
        const gltf = await new GLTFLoader().loadAsync("/models_logo/logo-std-couleur.glb");
        if (disposed) return;
        const model = gltf.scene;

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        model.position.set(-center.x, -center.y, -center.z);
        pivot.add(model);

        camera.position.set(0, 0, Math.max(size.x, size.y) * 2.6);
        camera.lookAt(0, 0, 0);
        setReady(true);
      } catch {
        // le logo 3D n'est qu'un ornement : son absence ne casse rien
      }

      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (!calme) {
          // Un léger balancement plutôt qu'un tour complet : on doit toujours
          // lire le logo de face.
          pivot.rotation.y = Math.sin(performance.now() / 2600) * 0.42;
          pivot.rotation.x = Math.sin(performance.now() / 4100) * 0.07;
        }
        renderer.render(scene, camera);
      };
      loop();

      cleanups.push(() => {
        cancelAnimationFrame(raf);
        observer.disconnect();
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
  }, []);

  return (
    <div className="relative aspect-square w-full max-w-sm">
      <div ref={mountRef} className="h-full w-full" aria-hidden />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src="/brand/logo.jpg"
            alt="Société Tunisienne de Décoration"
            className="h-32 w-32 rounded-full object-cover opacity-60"
          />
        </div>
      )}
    </div>
  );
}
