import { getProducts, has3D, isPlantable } from "@/lib/catalog";
import GardenEditor, { type EditorProduct } from "@/components/garden/GardenEditor";

export const metadata = {
  title: "Prévisualiser mon jardin — Société Tunisienne de Décoration",
  description:
    "Composez votre aménagement en 3D avec les pièces du catalogue, puis envoyez-le en demande de devis.",
};

export default function PrevisualiserPage() {
  const products: EditorProduct[] = getProducts()
    .filter(has3D)
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      weight: p.weight ?? null,
      plantable: isPlantable(p),
    }));

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <h1 className="mb-2 text-3xl font-normal text-ink sm:text-4xl">Prévisualiser mon jardin</h1>
      <p className="mb-8 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Posez les pièces au sol, déplacez-les, changez le coloris et la plantation. Tout est à
        l&apos;échelle : si deux pièces ne tiennent pas côte à côte ici, elles ne tiendront pas
        chez vous. Les exemples ci-dessous sont des aménagements complets — partez-en si c&apos;est
        plus simple, puis envoyez le tout en demande de devis.
      </p>
      <GardenEditor products={products} />
    </div>
  );
}
