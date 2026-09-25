import Link from "next/link";
import { getCategories, getProducts, dimLine, has3D, glbSrc } from "@/lib/catalog";
import { HERO, VALUE_PROPS, STEPS, AUDIENCE, FINAL_CTA } from "@/lib/marketing";
import { ACTIVITIES, COMPANY } from "@/lib/company";
import ProductThumb from "@/components/ProductThumb";

export default function HomePage() {
  const products = getProducts();
  const categories = getCategories();
  const featured = products.slice(0, 3);

  const stats = [
    { value: String(products.length), label: "Références au catalogue" },
    { value: String(products.filter(has3D).length), label: "Modèles 3D consultables" },
    { value: "5", label: "Coloris disponibles" },
    { value: "24-48h", label: "Réponse à votre devis" },
  ];

  return (
    <div>
      <header className="mx-auto max-w-6xl px-6 pb-12 pt-16">
        <span className="mb-4 block text-xs font-semibold uppercase tracking-widest text-grass-600">
          {HERO.kicker}
        </span>
        <h1 className="max-w-3xl text-5xl font-normal leading-[1.08] tracking-tight text-ink sm:text-6xl">
          {HERO.title}
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-soft">{HERO.subtitle}</p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/catalogue" className="btn-primary">
            {HERO.primaryCta}
          </Link>
          <Link href="/flipbook" className="btn-secondary">
            {HERO.secondaryCta}
          </Link>
        </div>
      </header>

      <section className="mx-auto mb-16 max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-8 rounded-xl border border-line bg-surface p-8 shadow-card sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <span className="font-heading text-4xl font-normal text-brand-500">{s.value}</span>
              <span className="text-xs uppercase tracking-wide text-ink-faint">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mb-16 max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {VALUE_PROPS.map((v) => (
            <div key={v.title} className="flex flex-col gap-2">
              <h2 className="text-2xl font-normal text-ink">{v.title}</h2>
              <p className="text-sm leading-relaxed text-ink-soft">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mb-16 max-w-6xl px-6">
        <div className="mb-8 flex items-baseline gap-6">
          <h2 className="text-2xl font-normal text-ink sm:text-3xl">Nos familles de produits</h2>
          <Link href="/catalogue" className="ml-auto text-sm text-brand-600 hover:text-brand-700">
            Tout le catalogue
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/catalogue?cat=${encodeURIComponent(cat.id)}`}
              className="card flex flex-col gap-2 p-6 transition-colors hover:border-leaf-400"
            >
              <span className="text-xs font-semibold text-grass-600">
                {products.filter((p) => p.category === cat.id).length} références
              </span>
              <span className="text-base font-semibold text-ink">{cat.label}</span>
              <span className="text-sm leading-relaxed text-ink-soft">{cat.note}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-16 bg-surface py-14">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-10 text-2xl font-normal text-ink sm:text-3xl">Comment ça se passe</h2>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.number} className="flex flex-col gap-3">
                <span className="font-heading text-3xl font-normal text-brand-500">
                  {s.number}
                </span>
                <h3 className="text-base font-semibold text-ink">{s.title}</h3>
                <p className="text-sm leading-relaxed text-ink-soft">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mb-16 max-w-6xl px-6">
        <div className="mb-6 flex items-baseline gap-6">
          <h2 className="text-2xl font-normal text-ink sm:text-3xl">Quelques pièces</h2>
          <span className="text-xs text-ink-faint">Vue 3D interactive sur chaque fiche</span>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <Link
              key={p.id}
              href={`/catalogue/${p.id}`}
              className="card flex flex-col overflow-hidden p-0 transition-colors hover:border-leaf-400"
            >
              {has3D(p) ? (
                <ProductThumb src={glbSrc(p)} title={p.name} />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-surface-soft text-sm text-ink-faint">
                  Photo à venir
                </div>
              )}
              <div className="flex flex-col gap-1 border-t border-line p-5">
                <span className="text-xs font-semibold text-grass-600">Réf. {p.id}</span>
                <span className="text-sm font-semibold text-ink">{p.name}</span>
                <span className="text-xs text-ink-faint">{dimLine(p)}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mb-16 max-w-6xl px-6">
        <div className="mb-8 flex items-baseline gap-6">
          <h2 className="text-2xl font-normal text-ink sm:text-3xl">Nos métiers</h2>
          <span className="ml-auto text-xs text-ink-faint">Atelier de {COMPANY.city}</span>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {ACTIVITIES.map((a) => (
            <div key={a.title} className="card flex flex-col gap-2 p-6">
              <h3 className="text-xl font-normal text-ink">{a.title}</h3>
              <p className="text-sm leading-relaxed text-ink-soft">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mb-16 max-w-6xl px-6">
        <div className="rounded-xl border border-leaf-200 bg-leaf-50 p-8">
          <h2 className="mb-3 text-xl font-normal text-ink">{AUDIENCE.title}</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-ink-soft">{AUDIENCE.body}</p>
          <p className="mt-4 text-sm text-ink-soft">
            Un conseil, une visite de l&apos;atelier ?{" "}
            <a href={COMPANY.phoneHref} className="text-brand-600 hover:text-brand-700">
              {COMPANY.phone}
            </a>
            {" · "}
            <span className="text-ink-faint">{COMPANY.address}</span>
          </p>
        </div>
      </section>

      <section className="mx-auto mb-20 max-w-6xl px-6">
        <div className="flex flex-col items-start gap-5 rounded-xl bg-brand-500 p-10 text-white sm:flex-row sm:items-center">
          <div className="flex-1">
            <h2 className="text-2xl font-normal sm:text-3xl">{FINAL_CTA.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/90">{FINAL_CTA.body}</p>
          </div>
          <Link
            href="/inscription"
            className="btn rounded-full border-white bg-white px-6 text-brand-600 hover:bg-white/90"
          >
            {FINAL_CTA.cta}
          </Link>
        </div>
      </section>
    </div>
  );
}
