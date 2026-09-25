import { getUserAndProfile } from "@/lib/auth";
import { DEVIS_INTRO } from "@/lib/marketing";
import DevisForm from "@/components/DevisForm";

export default async function DevisPage() {
  const { user } = await getUserAndProfile();
  // middleware.ts guarantees `user` is set for this route; this is just the
  // type-safe fallback.
  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-3 text-2xl font-semibold text-ink">Mon devis</h1>
      <p className="mb-8 text-sm leading-relaxed text-ink-soft">{DEVIS_INTRO}</p>
      <DevisForm userId={user.id} />
    </div>
  );
}
