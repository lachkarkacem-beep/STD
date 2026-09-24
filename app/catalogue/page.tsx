import { getCategories, getProducts } from "@/lib/catalog";
import CatalogueGrid from "@/components/CatalogueGrid";

export default function CataloguePage({
  searchParams,
}: {
  searchParams: { cat?: string };
}) {
  const products = getProducts();
  const categories = getCategories();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-medium text-ink">Catalogue</h1>
      <CatalogueGrid
        products={products}
        categories={categories}
        initialCat={searchParams.cat ?? null}
      />
    </div>
  );
}
