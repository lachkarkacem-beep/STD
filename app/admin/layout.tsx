import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center gap-6 border-b border-cream-line pb-4">
        <h1 className="text-xl font-medium text-ink">Administration</h1>
        <nav className="ml-auto flex gap-5 text-sm text-ink-soft">
          <Link href="/admin" className="hover:text-brand-600">
            Tableau de bord
          </Link>
          <Link href="/admin/devis" className="hover:text-brand-600">
            Devis
          </Link>
          <Link href="/admin/utilisateurs" className="hover:text-brand-600">
            Utilisateurs
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
