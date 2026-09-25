"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GardenScene, PlacedItem, CameraMode } from "@/lib/garden/scene";
import { GROUNDS, groundCss, type GroundKind } from "@/lib/garden/grounds";
import type { BuildingKind } from "@/lib/garden/buildings.mjs";
import { PAVINGS, pavingCount } from "@/lib/garden/paving.mjs";
import { ROTATION_STEP, toDegrees } from "@/lib/garden/rotation.mjs";
import { PRESETS } from "@/lib/garden/presets.mjs";
import { PROPS, isProp } from "@/lib/garden/props.mjs";
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

/**
 * Interrupteur dessiné de bout en bout. Les cases à cocher natives ne
 * survivent pas au reset de Tailwind, qui impose border-width:0 à tous les
 * éléments : elles restaient visuellement vides quel que soit leur état.
 */
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-left text-sm text-ink-soft"
    >
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-grass-500" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
      {label}
    </button>
  );
}

export default function GardenEditor({ products }: { products: EditorProduct[] }) {
  const router = useRouter();
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GardenScene | null>(null);
  const [items, setItems] = useState<PlacedItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("Toutes");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [ground, setGround] = useState<GroundKind>("pelouse");
  const [camera, setCameraMode] = useState<CameraMode>("orbite");
  const [building, setBuilding] = useState<BuildingKind>("aucune");
  const [fenceMesh, setFenceMesh] = useState(true);
  const [poolWater, setPoolWater] = useState(true);
  const [paving, setPaving] = useState("");
  const [effects, setEffects] = useState(true);
  const [nuit, setNuit] = useState(false);
  const poolRef = useRef<{ width: number; depth: number; x?: number; z?: number } | null>(null);

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

  // Raccourcis clavier sur la pièce sélectionnée : R pour pivoter, Suppr pour
  // retirer. Ignorés dès que la frappe vise un champ de saisie.
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      )
        return;
      const key = e.key.toLowerCase();
      if (key === "r") sceneRef.current?.rotate(selectedId, e.shiftKey ? -ROTATION_STEP : ROTATION_STEP);
      else if (key === "delete" || key === "suppr") sceneRef.current?.remove(selectedId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

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
    // La scène cherche elle-même une place libre : elle seule connaît
    // l'emprise de la pièce, qu'elle ne mesure qu'après chargement du modèle.
    scene.add({ id: newId(), ref, finish: DEFAULT_FINISH, species: null, x: 0, z: 0, rotation: 0 });
  }, []);

  const selected = items.find((i) => i.id === selectedId) ?? null;
  const selectedProduct = selected ? byRef.get(selected.ref) : null;

  function loadPreset(presetId: string) {
    const scene = sceneRef.current;
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!scene || !preset) return;
    scene.clear();
    scene.setPlot(preset.plot ?? null);
    poolRef.current = preset.pool ?? null;
    scene.setPool(preset.pool ? { ...preset.pool, water: poolWater } : null);
    const kind = (preset.building ?? "aucune") as BuildingKind;
    scene.setBuilding(kind, preset.buildingZ);
    scene.setPaving(preset.paving ?? null, preset.pavingArea);
    setPaving(preset.paving ?? "");
    setBuilding(kind);
    if (preset.ground) {
      const kind = preset.ground as GroundKind;
      scene.setGround(kind);
      setGround(kind);
    }
    // Certains exemples sont conçus pour la nuit : il serait dommage de les
    // ouvrir en plein jour, veilleuses éteintes.
    const heure = preset.nuit ? "nuit" : "jour";
    scene.setMoment(heure);
    setNuit(heure === "nuit");
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

    // Les repères de simulation font vivre la scène — un parasol, deux cafés,
    // quelqu'un debout. Ils n'entrent ni dans le devis ni dans le poids.
    (preset.props ?? []).forEach((p) =>
      scene.add({
        id: newId(),
        ref: p.ref,
        finish: DEFAULT_FINISH,
        species: null,
        x: p.x,
        z: p.z,
        rotation: p.rotation ?? 0,
      })
    );
  }

  // Familles employées par un exemple, pour que la liste dise de quoi la
  // scène est faite avant même de la charger.
  function presetFamilies(preset: (typeof PRESETS)[number]) {
    const seen: string[] = [];
    for (const it of preset.items) {
      const famille = byRef.get(it.ref)?.category;
      if (famille && !seen.includes(famille)) seen.push(famille);
    }
    return seen;
  }

  function duplicate() {
    const scene = sceneRef.current;
    if (!scene || !selected) return;
    scene.add({ ...selected, id: newId(), x: selected.x + 0.4, z: selected.z + 0.4 });
  }

  const totals = useMemo(() => {
    const lines = new Map<string, { ref: string; name: string; finish: string; qty: number }>();
    let weight = 0;
    let unknownWeight = false;
    for (const it of items) {
      // Les repères de simulation ne se vendent pas : ils n'ont rien à faire
      // dans le devis ni dans le poids total.
      if (isProp(it.ref)) continue;
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
    // Trois colonnes sur grand écran : ce qu'on ajoute à gauche, la scène au
    // milieu, ce qu'on règle et ce qu'on emporte à droite. En dessous, tout
    // s'empile et la scène passe en tête — sur un téléphone c'est elle qu'on
    // veut voir d'abord, pas une liste de références.
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)_minmax(260px,320px)]">
      {/* Ajouter : catalogue et exemples */}
      <aside className="order-2 flex flex-col gap-4 lg:order-1">
        <div className="card flex max-h-[45vh] flex-col overflow-hidden p-0 lg:max-h-[38vh]">
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
        </div>

        <div className="card flex flex-col gap-3 p-4">
          <h2 className="text-lg font-normal text-ink">Mode simulation</h2>
          <p className="text-xs leading-snug text-ink-faint">
            Des repères à l&apos;échelle réelle pour se projeter : ils se déplacent et pivotent
            comme les pièces, mais ne comptent pas dans le devis.
          </p>
          <div className="flex flex-col gap-1.5">
            {PROPS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addProduct(p.id)}
                className="rounded-lg border border-line px-3 py-2 text-left text-sm text-ink hover:border-leaf-400"
              >
                {p.label}
                <span className="block text-xs text-ink-faint">
                  {p.id === "SIM:homme" ? "1,75 m" : `${(p.height * 100).toFixed(0)} cm`}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="card flex max-h-[45vh] flex-col overflow-hidden p-0">
          <h2 className="border-b border-line p-4 text-lg font-normal text-ink">Exemples</h2>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
            {PRESETS.map((p) => {
              const familles = presetFamilies(p);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => loadPreset(p.id)}
                  className="group rounded-lg border border-line p-3 text-left transition-colors hover:border-grass-500 hover:bg-leaf-50"
                >
                  <span className="flex items-baseline gap-2">
                    <span className="font-heading text-base font-normal text-ink">{p.label}</span>
                    <span className="ml-auto shrink-0 text-xs text-ink-faint">
                      {p.items.length} pièces
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-ink-soft">
                    {p.description}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1">
                    {familles.slice(0, 4).map((f) => (
                      <span
                        key={f}
                        className="rounded-full bg-surface-soft px-2 py-0.5 text-[10px] text-ink-faint group-hover:bg-white"
                      >
                        {f}
                      </span>
                    ))}
                    {p.pool && (
                      <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[10px] text-ink-faint group-hover:bg-white">
                        bassin
                      </span>
                    )}
                    {p.props?.length && (
                      <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[10px] text-ink-faint group-hover:bg-white">
                        mise en scène
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Scène */}
      <div className="order-1 flex flex-col gap-3 lg:order-2">
        <div className="relative h-[52vh] min-h-80 overflow-hidden rounded-xl border border-line bg-surface-soft sm:h-[60vh] lg:h-[70vh]">
          <div ref={mountRef} className="h-full w-full" />

          {/* Commandes posées sur la scène : la rotation est le geste le plus
              courant, elle ne doit pas obliger à chercher dans un panneau. */}
          <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2">
            <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-surface/95 p-1 shadow-card">
              <button
                type="button"
                disabled={!selected}
                onClick={() => selected && sceneRef.current?.rotate(selected.id, -ROTATION_STEP)}
                aria-label="Pivoter de 15° vers la gauche"
                title="Pivoter à gauche (Maj + R)"
                className="h-9 w-9 rounded-full text-lg text-ink-soft hover:bg-leaf-50 hover:text-grass-700 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                ↺
              </button>
              <span className="min-w-12 text-center text-xs text-ink-faint">
                {selected ? `${toDegrees(selected.rotation)}°` : "—"}
              </span>
              <button
                type="button"
                disabled={!selected}
                onClick={() => selected && sceneRef.current?.rotate(selected.id, ROTATION_STEP)}
                aria-label="Pivoter de 15° vers la droite"
                title="Pivoter à droite (R)"
                className="h-9 w-9 rounded-full text-lg text-ink-soft hover:bg-leaf-50 hover:text-grass-700 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                ↻
              </button>
            </div>

            {selected && (
              <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-surface/95 p-1 shadow-card">
                <button
                  type="button"
                  onClick={duplicate}
                  title="Dupliquer"
                  aria-label="Dupliquer la pièce"
                  className="h-9 w-9 rounded-full text-ink-soft hover:bg-leaf-50 hover:text-grass-700"
                >
                  ⧉
                </button>
                <button
                  type="button"
                  onClick={() => sceneRef.current?.remove(selected.id)}
                  title="Retirer (Suppr)"
                  aria-label="Retirer la pièce"
                  className="h-9 w-9 rounded-full text-brand-600 hover:bg-brand-50"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {!selected && ready && (
            <div className="pointer-events-none absolute bottom-16 left-3 max-w-56 rounded-lg bg-ink/75 px-3 py-2 text-xs leading-snug text-white">
              Cliquez une pièce pour la sélectionner : vous pourrez alors la
              pivoter, la dupliquer ou la retirer.
            </div>
          )}

          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-ink-faint">
              Chargement de la scène…
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs text-ink-faint">Vue</span>
          {(["orbite", "dessus", "hauteur", "marche"] as CameraMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                sceneRef.current?.setCamera(m);
                setCameraMode(m);
              }}
              className={`rounded-full border px-3 py-1 text-xs ${
                camera === m
                  ? "border-grass-500 bg-leaf-50 text-grass-700"
                  : "border-line text-ink-soft hover:border-leaf-400"
              }`}
            >
              {m === "orbite"
                ? "Libre"
                : m === "dessus"
                  ? "De dessus"
                  : m === "hauteur"
                    ? "Hauteur d'homme"
                    : "Se déplacer"}
            </button>
          ))}

          <span className="ml-4 text-xs text-ink-faint">Sol</span>
          {GROUNDS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                sceneRef.current?.setGround(g.id);
                setGround(g.id);
              }}
              title={g.label}
              aria-label={g.label}
              className={`h-6 w-6 rounded-full border-2 ${
                ground === g.id ? "border-brand-500" : "border-line"
              }`}
              style={{ background: groundCss(g.id) }}
            />
          ))}
        </div>

        <p className="text-xs leading-relaxed text-ink-faint">
          {camera === "marche"
            ? "Déplacez-vous avec ZQSD ou les flèches, Maj pour accélérer. Glissez pour regarder autour de vous."
            : "Cliquez une pièce pour la sélectionner, glissez pour la déplacer. Maj + glisser (ou clic droit) la fait pivoter, R au clavier la tourne de 15°. Trois piquets de clôture suffisent à délimiter un terrain."}
        </p>
      </div>

      {/* Régler et emporter : décor, pièce sélectionnée, projet */}
      <aside className="order-3 flex flex-col gap-4">
        <div className="card flex flex-col gap-3 p-4">
          <h2 className="text-lg font-normal text-ink">Le décor</h2>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-ink-faint">Bâtiment</span>
            <div className="flex flex-wrap gap-2">
              {(["aucune", "maison", "villa"] as BuildingKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    sceneRef.current?.setBuilding(k);
                    setBuilding(k);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    building === k
                      ? "border-grass-500 bg-leaf-50 text-grass-700"
                      : "border-line text-ink-soft hover:border-leaf-400"
                  }`}
                >
                  {k === "aucune" ? "Aucun" : k === "maison" ? "Maison" : "Villa"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-ink-faint">Terrasse dallée</span>
            <select
              value={paving}
              onChange={(e) => {
                setPaving(e.target.value);
                sceneRef.current?.setPaving(e.target.value || null);
              }}
              className="input w-full text-sm"
            >
              <option value="">Aucune</option>
              {PAVINGS.map((p) => (
                <option key={p.ref} value={p.ref}>
                  {p.label}
                </option>
              ))}
            </select>
            {paving && (
              <span className="text-xs leading-snug text-ink-faint">
                {(() => {
                  const c = pavingCount(paving, { width: 16, depth: 12 });
                  return c ? `${c.tiles} dalles · ${c.m2.toFixed(1)} m²` : "";
                })()}
              </span>
            )}
          </div>

          {/* Interrupteurs dessinés, et non cases natives : le reset de
              Tailwind pose border-width:0 sur tout, ce qui empêchait la case
              d'afficher son état coché — on croyait activer l'eau en la
              coupant. */}
          <Toggle
            label="Flammes et jets d'eau animés"
            checked={effects}
            onChange={(v) => {
              setEffects(v);
              sceneRef.current?.setEffects(v);
            }}
          />

          <Toggle
            label="Mode nuit — veilleuses allumées"
            checked={nuit}
            onChange={(v) => {
              setNuit(v);
              sceneRef.current?.setMoment(v ? "nuit" : "jour");
            }}
          />

          <Toggle
            label="Grillage entre les piquets"
            checked={fenceMesh}
            onChange={(v) => {
              setFenceMesh(v);
              sceneRef.current?.setFenceMesh(v);
            }}
          />

          <Toggle
            label="Bassin rempli d'eau"
            checked={poolWater}
            onChange={(v) => {
              setPoolWater(v);
              const pool = poolRef.current;
              if (pool) sceneRef.current?.setPool({ ...pool, water: v });
            }}
          />

          {!poolRef.current && (
            <p className="text-xs leading-snug text-ink-faint">
              Aucun bassin dans la scène : chargez « Villa avec piscine » pour en poser un.
            </p>
          )}
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

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-ink-faint">Orientation</span>
                <span className="text-sm text-ink-soft">{toDegrees(selected.rotation)}°</span>
                <button
                  type="button"
                  onClick={() => sceneRef.current?.rotate(selected.id, -ROTATION_STEP)}
                  aria-label="Pivoter de 15° vers la gauche"
                  className="ml-auto h-7 w-7 rounded-full border border-line hover:border-leaf-400"
                >
                  ↺
                </button>
                <button
                  type="button"
                  onClick={() => sceneRef.current?.rotate(selected.id, ROTATION_STEP)}
                  aria-label="Pivoter de 15° vers la droite"
                  className="h-7 w-7 rounded-full border border-line hover:border-leaf-400"
                >
                  ↻
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={345}
                step={15}
                value={toDegrees(selected.rotation)}
                onChange={(e) =>
                  sceneRef.current?.setRotation(selected.id, (Number(e.target.value) * Math.PI) / 180)
                }
                aria-label="Orientation de la pièce"
                className="w-full accent-brand-500"
              />
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => sceneRef.current?.setRotation(selected.id, 0)}
                className="rounded-full border border-line px-3 py-1 hover:border-leaf-400"
              >
                Remettre droit
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
