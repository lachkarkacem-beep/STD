import Link from "next/link";
import { getCategories, getCompany, getProducts, dimLine, has3D, viewerSrc } from "@/lib/catalog";
import ProductThumb from "@/components/ProductThumb";

export default function HomePage() {
  const company = getCompany();
  const products = getProducts();
  const categories = getCategories();
  const featured = products.slice(0, 3);

  const stats = [
    { value: String(products.length), label: "Références en ligne" },
    { value: String(products.filter(has3D).length), label: "Modèles 3D consultables" },
    { value: "5", label: "Coloris disponibles" },
  ];

  return (
    <div>
      <header className="mx-auto max-w-6xl px-6 pb-10 pt-16">
        <span className="mb-4 block text-xs font-medium uppercase tracking-widest text-brand-600">
          Fabricant · Maisons et jardins
        </span>
        <h1 className="max-w-2xl text-4xl font-medium leading-tight tracking-tight text-ink sm:text-5xl">
          {company.tagline}
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft">{company.intro}</p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/catalogue" className="btn-primary">
            Découvrir la collection
          </Link>
          <Link href="/flipbook" className="btn-secondary">
            Feuilleter le catalogue photo
          </Link>
        </div>
      </header>

      <section className="mx-auto mb-12 max-w-6xl px-6">
        <div className="flex flex-wrap gap-12 border-y border-cream-line py-8">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <span className="font-heading text-3xl font-medium text-ink">{s.value}</span>
              <span className="text-xs uppercase tracking-wide text-ink-faint">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mb-12 max-w-6xl px-6">
        <div className="mb-6 flex items-baseline gap-6">
          <h2 className="text-xl font-medium text-ink">Catégories</h2>
          <Link href="/catalogue" className="ml-auto text-sm text-brand-600 hover:text-brand-700">
            Tout le catalogue
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/catalogue?cat=${encodeURIComponent(cat.id)}`}
              className="card flex flex-col gap-2 p-6 hover:border-brand-300"
            >
              <span className="text-xs font-medium text-brand-600">
                {products.filter((p) => p.category === cat.id).length} références
              </span>
              <span className="text-lg font-medium text-ink">{cat.label}</span>
              <span className="text-sm text-ink-soft">{cat.note}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-6 flex items-baseline gap-6">
          <h2 className="text-xl font-medium text-ink">Sélection</h2>
          <span className="text-xs text-ink-faint">Vue 3D interactive sur chaque fiche</span>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <Link
              key={p.id}
              href={`/catalogue/${p.id}`}
              className="card flex flex-col overflow-hidden p-0"
            >
              {has3D(p) ? (
                <ProductThumb src={viewerSrc(p, { thumb: true })} title={p.name} />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-cream-soft text-sm text-ink-faint">
                  Photo à venir
                </div>
              )}
              <div className="flex flex-col gap-1 border-t border-cream-line p-5">
                <span className="text-xs font-medium text-brand-600">Réf. {p.id}</span>
                <span className="text-sm font-medium text-ink">{p.name}</span>
                <span className="text-xs text-ink-faint">{dimLine(p)}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
