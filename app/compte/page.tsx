import Link from "next/link";
import { getUserAndProfile } from "@/lib/auth";
import { COMPTE_INTRO } from "@/lib/marketing";
import { createClient } from "@/lib/supabase/server";
import { estAdmin } from "@/lib/roles";
import { statut as infoStatut } from "@/lib/devis-statuts.mjs";
import type { Quote } from "@/lib/supabase/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ComptePage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) return null;

  const supabase = createClient();
  // Filtré sur l'utilisateur ici, et les règles d'accès en base le redisent :
  // même une requête forgée ne rendrait que ses propres lignes.
  const { data: quotes } = await supabase
    .from("quotes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const admin = estAdmin(profile);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-1 text-3xl font-normal text-ink">
        Bonjour {profile?.full_name?.split(" ")[0] ?? ""}
      </h1>
      <p className="mb-2 text-sm text-ink-soft">
        {profile?.job_title ? `${profile.job_title} · ` : ""}
        {profile?.email}
        {profile?.telephone ? ` · ${profile.telephone}` : ""}
      </p>

      {admin ? (
        <>
          <p className="mb-8 text-sm leading-relaxed text-ink-soft">
            Ce compte gère les demandes. Il n&apos;en dépose pas.
          </p>
          <Link href="/admin/devis" className="btn-primary">
            Voir les demandes
          </Link>
        </>
      ) : (
        <>
          <p className="mb-8 text-sm leading-relaxed text-ink-soft">{COMPTE_INTRO}</p>

          <h2 className="mb-4 text-xl font-normal text-ink">Mes demandes de devis</h2>

          {!quotes || quotes.length === 0 ? (
            <p className="text-sm leading-relaxed text-ink-soft">
              Aucune demande pour le moment. Réunissez vos pièces depuis le{" "}
              <Link href="/catalogue" className="text-brand-600 hover:text-grass-700">
                catalogue
              </Link>
              , puis envoyez-les dans{" "}
              <Link href="/devis" className="text-brand-600 hover:text-grass-700">
                votre devis
              </Link>
              .
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {(quotes as Quote[]).map((q) => {
                const s = infoStatut(q.status);
                return (
                  <div key={q.id} className="card flex flex-col gap-4 p-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={
                          s?.ton === "fait"
                            ? "badge-answered"
                            : s?.ton === "encours"
                              ? "badge-encours"
                              : "badge-pending"
                        }
                      >
                        {s?.client ?? q.status}
                      </span>
                      <span className="text-xs text-ink-faint">
                        Envoyée le {formatDate(q.created_at)}
                      </span>
                    </div>

                    {s?.aide && <p className="text-sm text-ink-soft">{s.aide}</p>}

                    <ul className="flex flex-col gap-1 text-sm text-ink">
                      {q.items.map((item, i) => (
                        <li key={i}>
                          Réf. {item.ref} — {item.name} · {item.finish} · quantité {item.qty}
                        </li>
                      ))}
                    </ul>

                    {q.message && <p className="text-sm italic text-ink-soft">« {q.message} »</p>}

                    {q.reply && (
                      <div className="rounded-md border border-sable-300 bg-sable-100 p-4">
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-grass-700">
                          Notre réponse{q.replied_at ? ` · ${formatDate(q.replied_at)}` : ""}
                        </p>
                        <p className="text-sm text-ink">{q.reply}</p>
                      </div>
                    )}

                    {/* Une demande envoyée ne se modifie plus : autant le dire
                        ici plutôt que de laisser chercher le bouton. */}
                    <p className="text-xs text-ink-faint">
                      Une demande envoyée ne se modifie plus. Pour un changement, envoyez-en une
                      nouvelle ou appelez-nous.
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
