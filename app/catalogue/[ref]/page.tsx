import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, dimLine, has3D, viewerSrc, specRows, relatedProducts } from "@/lib/catalog";
import ProductView from "@/components/ProductView";

export default function ProductPage({ params }: { params: { ref: string } }) {
  const product = getProduct(params.ref);
  if (!product) notFound();

  const related = relatedProducts(product);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <ProductView product={product} viewerBaseSrc={viewerSrc(product)} has3D={has3D(product)} />

      <table className="mt-10 w-full max-w-md border-collapse">
        <tbody>
          {specRows(product).map((row) => (
            <tr key={row.label} className="border-b border-cream-line">
              <th
                scope="row"
                className="py-2 text-left text-xs font-normal uppercase tracking-wide text-ink-faint"
              >
                {row.label}
              </th>
              <td className="py-2 text-right text-sm text-ink">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {related.length > 0 && (
        <section className="mt-14 border-t border-cream-line pt-10">
          <h2 className="mb-6 text-lg font-medium text-ink">Même catégorie</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <Link
                key={p.id}
                href={`/catalogue/${p.id}`}
                className="card flex flex-col gap-2 p-6 text-ink"
              >
                <span className="text-xs font-medium text-brand-600">Réf. {p.id}</span>
                <span className="text-sm font-medium leading-snug">{p.name}</span>
                <span className="text-xs text-ink-faint">{dimLine(p)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
