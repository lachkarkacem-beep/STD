"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GardenScene, PlacedItem, CameraMode } from "@/lib/garden/scene";
import { PRESETS } from "@/lib/garden/presets";
import { FINISHES, DEFAULT_FINISH } from "@/lib/finishes";
import { PLANT_SPECIES } from "@/lib/plants";
import { addToCart } from "@/lib/cart";

export type EditorProduct = {
  id: string;
  name: string;
  category: string;
  weight: number | null;
  plantable: boolean;
};

const STORAGE_KEY = "std-jardin";
const newId = () => Math.random().toString(36).slice(2, 10);

export default function GardenEditor({ products }: { products: EditorProduct[] }) {
  const router = useRouter();
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GardenScene | null>(null);
  const [items, setItems] = useState<PlacedItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("Toutes");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const byRef = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const categories = useMemo(
    () => ["Toutes", ...Array.from(new Set(products.map((p) => p.category)))],
    [products]
  );
  const visible = useMemo(
    () => (category === "Toutes" ? products : products.filter((p) => p.category === category)),
    [category, products]
  );

  // Montage de la scène, une seule fois.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let scene: GardenScene | null = null;
    let disposed = false;

    import("@/lib/garden/scene").then(({ GardenScene }) => {
      if (disposed || !mountRef.current) return;
      scene = new GardenScene(mountRef.current);
      scene.onChange = setItems;
      scene.onSelect = setSelectedId;
      sceneRef.current = scene;
      setReady(true);

      // Reprise du projet en cours, s'il y en a un.
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as PlacedItem[];
          if (Array.isArray(stored)) stored.forEach((it) => scene?.add(it));
        }
      } catch {
        // projet illisible : on démarre sur une scène vide
      }
    });

    return () => {
      disposed = true;
      scene?.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Sauvegarde continue.
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // stockage indisponible : le projet ne survivra pas au rechargement
    }
  }, [items, ready]);

  const addProduct = useCallback((ref: string) => {
    const scene = sceneRef.current;
    if (!scene) return;
    const id = newId();
    const spot = scene.freeSpotNear(id, 0, 0, 0);
    scene.add({ id, ref, finish: DEFAULT_FINISH, species: null, x: spot.x, z: spot.z, rotation: 0 });
  }, []);

  const selected = items.find((i) => i.id === selectedId) ?? null;
  const selectedProduct = selected ? byRef.get(selected.ref) : null;

  function loadPreset(presetId: string) {
    const scene = sceneRef.current;
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!scene || !preset) return;
    scene.clear();
    preset.items.forEach((it) =>
      scene.add({
        id: newId(),
        ref: it.ref,
        finish: it.finish ?? DEFAULT_FINISH,
        species: it.species ?? null,
        x: it.x,
        z: it.z,
        rotation: it.rotation ?? 0,
      })
    );
  }

  function duplicate() {
    const scene = sceneRef.current;
    if (!scene || !selected) return;
    const id = newId();
    const spot = scene.freeSpotNear(id, selected.x + 0.4, selected.z + 0.4, selected.rotation);
    scene.add({ ...selected, id, x: spot.x, z: spot.z });
  }

  const totals = useMemo(() => {
    const lines = new Map<string, { ref: string; name: string; finish: string; qty: number }>();
    let weight = 0;
    let unknownWeight = false;
    for (const it of items) {
      const product = byRef.get(it.ref);
      const key = `${it.ref}|${it.finish}`;
      const line = lines.get(key);
      if (line) line.qty += 1;
      else lines.set(key, { ref: it.ref, name: product?.name ?? it.ref, finish: it.finish, qty: 1 });
      if (product?.weight) weight += product.weight;
      else unknownWeight = true;
    }
    return { lines: [...lines.values()], weight, unknownWeight };
  }, [items, byRef]);

  function sendToQuote() {
    for (const line of totals.lines) addToCart(line.ref, line.finish, line.qty);
    router.push("/devis");
  }

  function exportProject() {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mon-jardin.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importProject(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const stored = JSON.parse(String(reader.result)) as PlacedItem[];
        const scene = sceneRef.current;
        if (!scene || !Array.isArray(stored)) return;
        scene.clear();
        stored.forEach((it) => scene.add({ ...it, id: newId() }));
      } catch {
        setSaved("Fichier illisible.");
      }
    };
    reader.readAsText(file);
  }

  function capture() {
    const scene = sceneRef.current;
    if (!scene) return;
    const a = document.createElement("a");
    a.href = scene.screenshot();
    a.download = "mon-jardin.png";
    a.click();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr_300px]">
      {/* Catalogue */}
      <aside className="card flex max-h-[70vh] flex-col overflow-hidden p-0">
        <div className="border-b border-line p-4">
          <h2 className="mb-3 text-lg font-normal text-ink">Catalogue</h2>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input w-full"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {visible.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => addProduct(p.id)}
              className="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-leaf-50"
            >
              <span className="text-sm text-ink">{p.name}</span>
              <span className="text-xs text-ink-faint">Réf. {p.id}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Scène */}
      <div className="flex flex-col gap-3">
        <div className="relative h-[70vh] overflow-hidden rounded-xl border border-line bg-surface-soft">
          <div ref={mountRef} className="h-full w-full" />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-ink-faint">
              Chargement de la scène…
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs text-ink-faint">Vue</span>
          {(["orbite", "dessus", "hauteur"] as CameraMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => sceneRef.current?.setCamera(m)}
              className="rounded-full border border-line px-3 py-1 text-xs text-ink-soft hover:border-leaf-400"
            >
              {m === "orbite" ? "Libre" : m === "dessus" ? "De dessus" : "Hauteur d'homme"}
            </button>
          ))}
          <span className="ml-auto text-xs text-ink-faint">
            Cliquez une pièce pour la sélectionner, glissez pour la déplacer.
          </span>
        </div>
      </div>

      {/* Projet */}
      <aside className="flex flex-col gap-4">
        <div className="card p-4">
          <h2 className="mb-3 text-lg font-normal text-ink">Exemples</h2>
          <div className="flex flex-col gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => loadPreset(p.id)}
                className="rounded-lg border border-line px-3 py-2 text-left hover:border-leaf-400"
              >
                <span className="block text-sm text-ink">{p.label}</span>
                <span className="block text-xs leading-snug text-ink-faint">{p.description}</span>
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <div className="card flex flex-col gap-3 p-4">
            <h2 className="text-lg font-normal text-ink">{selectedProduct?.name ?? selected.ref}</h2>

            <div className="flex flex-wrap gap-1.5">
              {FINISHES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    sceneRef.current?.applyFinish(selected.id, f.id);
                    setItems(sceneRef.current?.items() ?? []);
                  }}
                  title={f.label}
                  className={`h-7 w-7 rounded-full border-2 ${
                    selected.finish === f.id ? "border-brand-500" : "border-line"
                  }`}
                  style={{ background: f.swatch }}
                />
              ))}
            </div>

            {selectedProduct?.plantable && (
              <select
                value={selected.species ?? ""}
                onChange={(e) => {
                  sceneRef.current
                    ?.applySpecies(selected.id, e.target.value || null)
                    .then(() => setItems(sceneRef.current?.items() ?? []));
                }}
                className="input w-full text-sm"
              >
                <option value="">Sans plantation</option>
                {PLANT_SPECIES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}

            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => sceneRef.current?.rotate(selected.id)}
                className="rounded-full border border-line px-3 py-1 hover:border-leaf-400"
              >
                Pivoter 15°
              </button>
              <button
                type="button"
                onClick={duplicate}
                className="rounded-full border border-line px-3 py-1 hover:border-leaf-400"
              >
                Dupliquer
              </button>
              <button
                type="button"
                onClick={() => sceneRef.current?.remove(selected.id)}
                className="rounded-full border border-brand-300 px-3 py-1 text-brand-600 hover:bg-brand-50"
              >
                Retirer
              </button>
            </div>
          </div>
        )}

        <div className="card flex flex-col gap-3 p-4">
          <h2 className="text-lg font-normal text-ink">Mon projet</h2>
          {totals.lines.length === 0 ? (
            <p className="text-sm leading-relaxed text-ink-soft">
              Choisissez une pièce dans le catalogue, ou partez d&apos;un exemple.
            </p>
          ) : (
            <>
              <ul className="flex flex-col gap-1 text-sm text-ink">
                {totals.lines.map((l) => (
                  <li key={`${l.ref}-${l.finish}`} className="flex justify-between gap-2">
                    <span>
                      {l.qty} × {l.ref}
                      <span className="text-ink-faint"> · {l.finish}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink-faint">
                {items.length} pièce{items.length > 1 ? "s" : ""} · poids total{" "}
                {totals.weight > 0 ? `${totals.weight} kg` : "—"}
                {totals.unknownWeight && totals.weight > 0 ? " (hors pièces sans poids connu)" : ""}
              </p>
              <button type="button" onClick={sendToQuote} className="btn-primary w-full">
                Demander un devis
              </button>
            </>
          )}

          <div className="flex flex-wrap gap-2 border-t border-line pt-3 text-xs">
            <button type="button" onClick={capture} className="text-brand-600 hover:text-brand-700">
              Capture PNG
            </button>
            <button type="button" onClick={exportProject} className="text-brand-600 hover:text-brand-700">
              Exporter
            </button>
            <label className="cursor-pointer text-brand-600 hover:text-brand-700">
              Importer
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && importProject(e.target.files[0])}
              />
            </label>
            <button
              type="button"
              onClick={() => sceneRef.current?.clear()}
              className="ml-auto text-ink-faint hover:text-brand-600"
            >
              Tout effacer
            </button>
          </div>
          {saved && <p className="text-xs text-brand-600">{saved}</p>}
        </div>
      </aside>
    </div>
  );
}
