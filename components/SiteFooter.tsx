export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-baseline gap-6 px-6 py-8 text-sm text-ink-soft">
        <span className="font-heading font-semibold text-brand-500">
          Société Tunisienne de Décoration
        </span>
        <span>Bacs et pots décoratifs pour maisons et jardins</span>
        <a href="/catalogue" className="ml-auto text-brand-600 hover:text-brand-700">
          Catalogue
        </a>
      </div>
    </footer>
  );
}
