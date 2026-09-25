import db from "@/public/3d/products/products.json";
import models from "@/public/models_web/models.json";

export type Dimensions = {
  width?: number;
  depth?: number;
  height?: number;
  diameter?: number;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  shape?: string;
  dimensions: Dimensions;
  weight?: number | null;
  weightPerM2?: number;
  piecesPerM2?: number;
  image?: string;
  model3D?: string;
  description: string;
  available: boolean;
  dimensionType: string;
  geometry?: Record<string, unknown>;
  notes?: string;
};

export type Category = { id: string; label: string; note: string };

export type CatalogDb = {
  company: {
    name: string;
    line: string;
    tagline: string;
    intro: string;
  };
  categories: Category[];
  products: Product[];
  model3DPolicy?: { procedural?: string; exports?: string };
};

const catalog = db as unknown as CatalogDb;

type ModelEntry = { id: string; plantable?: boolean };
const MODEL_ENTRIES = (models as { models: ModelEntry[] }).models;
const GLB_IDS = new Set(MODEL_ENTRIES.map((m) => m.id));
const PLANTABLE_IDS = new Set(MODEL_ENTRIES.filter((m) => m.plantable).map((m) => m.id));

// Un bac est plantable s'il expose une cavité de terre (matériau « soil »
// dans le GLB). 21 références sur 51 ; vérifié par `npm run check`.
export function isPlantable(p: Product) {
  return PLANTABLE_IDS.has(p.id);
}

export function getCompany() {
  return catalog.company;
}

export function getCategories() {
  return catalog.categories;
}

export function getProducts() {
  return catalog.products;
}

export function getProduct(ref: string) {
  return catalog.products.find((p) => p.id === ref) ?? null;
}

// Every one of the 46 references now ships a pre-baked GLB under
// public/models_web/glb/, so all of them render — including the six
// (B105, B84, B42, B62, B58, B30) that never had a procedural geometry spec.
export function has3D(p: Product) {
  return GLB_IDS.has(p.id);
}

export function glbSrc(p: Product) {
  return `/models_web/glb/${p.id}.glb`;
}

export function dimLine(p: Product) {
  const d = p.dimensions;
  switch (p.dimensionType) {
    case "cylinder":
      return `Ø ${d.diameter ?? d.width} × H ${d.height} cm`;
    case "column":
      return `Ø ${d.diameter} × H ${d.height} cm`;
    case "well":
      return `Ø ${d.width} × H ${d.height} cm`;
    case "slab":
    case "plinthe":
      return `${d.width} × ${d.depth} cm · ép. ${d.height} cm`;
    default:
      return `${d.width} × ${d.depth} × ${d.height} cm`;
  }
}

export function specRows(p: Product) {
  const d = p.dimensions;
  const dims = (() => {
    if (p.dimensionType === "cylinder")
      return [
        { label: "Hauteur", value: `${d.height} cm` },
        { label: "Diamètre", value: `${d.diameter ?? d.width} cm` },
      ];
    if (p.dimensionType === "column")
      return [
        { label: "Hauteur", value: `${d.height} cm` },
        { label: "Diamètre de fût", value: `${d.diameter} cm` },
        { label: "Socle", value: `${d.width} × ${d.depth} cm` },
      ];
    if (p.dimensionType === "slab" || p.dimensionType === "plinthe")
      return [
        { label: "Longueur", value: `${d.width} cm` },
        { label: "Largeur", value: `${d.depth} cm` },
        { label: "Épaisseur", value: `${d.height} cm` },
      ];
    if (p.dimensionType === "well")
      return [
        { label: "Hauteur", value: `${d.height} cm` },
        { label: "Diamètre margelle", value: `${d.diameter} cm` },
        { label: "Diamètre dallage", value: `${d.width} cm` },
      ];
    return [
      { label: "Largeur", value: `${d.width} cm` },
      { label: "Profondeur", value: `${d.depth} cm` },
      { label: "Hauteur", value: `${d.height} cm` },
    ];
  })();

  const weight = p.weightPerM2
    ? [
        { label: "Poids au m²", value: `${p.weightPerM2} kg` },
        { label: "Pièces au m²", value: String(p.piecesPerM2).replace(".", ",") },
      ]
    : // Les 5 références de la page 21 sont livrées sans poids communiqué.
      [{ label: "Poids", value: p.weight ? `${p.weight} kg` : "—" }];

  return [
    ...dims,
    ...weight,
    { label: "Forme", value: p.shape || "—" },
    { label: "Disponibilité", value: p.available ? "Disponible" : "Sur commande" },
  ];
}

export function relatedProducts(p: Product, count = 4) {
  return catalog.products
    .filter((x) => x.category === p.category && x.id !== p.id)
    .sort(
      (a, b) =>
        Math.abs((a.dimensions.height ?? 0) - (p.dimensions.height ?? 0)) -
        Math.abs((b.dimensions.height ?? 0) - (p.dimensions.height ?? 0))
    )
    .slice(0, count);
}
