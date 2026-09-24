import Image from "next/image";
import Link from "next/link";
import { getUserAndProfile } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function SiteHeader() {
  const { user, profile } = await getUserAndProfile();

  return (
    <header className="border-b border-cream-line bg-white">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/brand/logo.jpg" alt="STD" width={40} height={40} className="rounded-full" />
          <span className="font-heading text-lg font-medium text-ink">
            Société Tunisienne de Décoration
          </span>
        </Link>

        <div className="ml-auto flex flex-wrap items-center gap-5 text-sm text-ink-soft">
          <Link href="/catalogue" className="hover:text-brand-600">
            Catalogue
          </Link>
          <Link href="/flipbook" className="hover:text-brand-600">
            Catalogue photo
          </Link>
          <Link href="/devis" className="hover:text-brand-600">
            Mon devis
          </Link>

          {profile?.role === "admin" && (
            <Link href="/admin" className="font-medium text-brand-600 hover:text-brand-700">
              Admin
            </Link>
          )}

          {user ? (
            <>
              <Link href="/compte" className="hover:text-brand-600">
                Mon compte
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/connexion" className="hover:text-brand-600">
                Connexion
              </Link>
              <Link href="/inscription" className="btn-primary">
                Créer un compte
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
