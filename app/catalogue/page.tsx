import { getCategories, getProducts } from "@/lib/catalog";
import { CATALOGUE_INTRO, CATALOGUE_OUTRO } from "@/lib/marketing";
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
      <h1 className="mb-3 text-2xl font-semibold text-ink">Catalogue</h1>
      <p className="mb-8 max-w-2xl text-sm leading-relaxed text-ink-soft">{CATALOGUE_INTRO}</p>
      <CatalogueGrid
        products={products}
        categories={categories}
        initialCat={searchParams.cat ?? null}
      />
      <p className="mt-12 border-t border-line pt-8 text-sm leading-relaxed text-ink-soft">
        {CATALOGUE_OUTRO}
      </p>
    </div>
  );
}
