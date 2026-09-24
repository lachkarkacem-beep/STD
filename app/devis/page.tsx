import { getUserAndProfile } from "@/lib/auth";
import DevisForm from "@/components/DevisForm";

export default async function DevisPage() {
  const { user } = await getUserAndProfile();
  // middleware.ts guarantees `user` is set for this route; this is just the
  // type-safe fallback.
  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-medium text-ink">Mon devis</h1>
      <p className="mb-8 text-sm text-ink-soft">Réponse de notre équipe sous 24 à 48 heures.</p>
      <DevisForm userId={user.id} />
    </div>
  );
}
