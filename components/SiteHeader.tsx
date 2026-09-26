import Image from "next/image";
import Link from "next/link";
import { getUserAndProfile } from "@/lib/auth";
import { estAdmin } from "@/lib/roles";
import LogoutButton from "@/components/LogoutButton";

export default async function SiteHeader() {
  const { user, profile } = await getUserAndProfile();
  const admin = estAdmin(profile);

  return (
    <header className="border-b border-line bg-white">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/brand/logo.jpg" alt="STD" width={40} height={40} className="rounded-full" />
          <span className="font-heading text-2xl font-medium tracking-wide text-brand-500">
            Société Tunisienne de Décoration
          </span>
        </Link>

        <div className="ml-auto flex flex-wrap items-center gap-5 text-sm text-ink-soft">
          <Link href="/catalogue" className="hover:text-grass-700">
            Catalogue
          </Link>
          <Link href="/previsualiser" className="hover:text-grass-700">
            Prévisualiser
          </Link>
          <Link href="/flipbook" className="hover:text-grass-700">
            Catalogue papier
          </Link>
          {/* L'administrateur ne dépose pas de demande : le lien n'a pas lieu
              d'être chez lui. La page le refuse de toute façon. */}
          {!admin && (
            <Link href="/devis" className="hover:text-grass-700">
              Mon devis
            </Link>
          )}

          {admin && (
            <Link href="/admin" className="font-medium text-brand-600 hover:text-brand-700">
              Admin
            </Link>
          )}

          {user ? (
            <>
              <Link href="/compte" className="hover:text-grass-700">
                Mon compte
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/connexion" className="hover:text-grass-700">
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
