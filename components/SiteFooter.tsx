import Link from "next/link";
import { COMPANY } from "@/lib/company";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-12 sm:grid-cols-3">
        <div className="flex flex-col gap-3">
          <span className="font-heading text-2xl font-medium tracking-wide text-brand-500">
            {COMPANY.name}
          </span>
          <span className="text-sm leading-relaxed text-ink-soft">{COMPANY.tagline}</span>
        </div>

        <div className="flex flex-col gap-2 text-sm text-ink-soft">
          <span className="text-xs uppercase tracking-widest text-ink-faint">Nous trouver</span>
          <address className="not-italic leading-relaxed">{COMPANY.address}</address>
          <a href={COMPANY.phoneHref} className="text-brand-600 hover:text-brand-700">
            {COMPANY.phone}
          </a>
          <a
            href={COMPANY.facebook}
            target="_blank"
            rel="noreferrer noopener"
            className="text-brand-600 hover:text-brand-700"
          >
            Notre page Facebook
          </a>
        </div>

        <div className="flex flex-col gap-2 text-sm text-ink-soft">
          <span className="text-xs uppercase tracking-widest text-ink-faint">Le catalogue</span>
          <Link href="/catalogue" className="hover:text-brand-600">
            Toutes les références
          </Link>
          <Link href="/previsualiser" className="hover:text-brand-600">
            Prévisualiser mon jardin
          </Link>
          <Link href="/flipbook" className="hover:text-brand-600">
            Catalogue photo
          </Link>
          <Link href="/devis" className="hover:text-brand-600">
            Demander un devis
          </Link>
        </div>
      </div>
    </footer>
  );
}
