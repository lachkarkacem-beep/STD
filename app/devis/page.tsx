import Link from "next/link";
import { getUserAndProfile } from "@/lib/auth";
import { DEVIS_INTRO } from "@/lib/marketing";
import { estAdmin } from "@/lib/roles";
import DevisForm from "@/components/DevisForm";

export default async function DevisPage() {
  const { user, profile } = await getUserAndProfile();
  // middleware.ts garantit `user` sur cette route ; ceci n'est que le repli.
  if (!user) return null;

  // L'administrateur gère les demandes, il n'en dépose pas. Le contrôle est
  // ici, du côté serveur, et la règle d'insertion en base le redit — masquer
  // le bouton ne suffirait pas.
  if (estAdmin(profile)) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="mb-3 text-3xl font-normal text-ink">Pas de devis de ce côté</h1>
        <p className="mb-6 text-sm leading-relaxed text-ink-soft">
          Le compte d&apos;administration sert à traiter les demandes, pas à en déposer.
        </p>
        <Link href="/admin/devis" className="btn-primary">
          Voir les demandes
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-3 text-3xl font-normal text-ink">Mon devis</h1>
      <p className="mb-8 text-sm leading-relaxed text-ink-soft">{DEVIS_INTRO}</p>
      <DevisForm userId={user.id} />
    </div>
  );
}
