import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Quote } from "@/lib/supabase/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function ComptePage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) return null;

  const supabase = createClient();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-1 text-2xl font-medium text-ink">Mon compte</h1>
      <p className="mb-8 text-sm text-ink-soft">
        {profile?.full_name} · {profile?.job_title} · {profile?.email}
      </p>

      <h2 className="mb-4 text-lg font-medium text-ink">Mes demandes de devis</h2>

      {!quotes || quotes.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Aucune demande pour le moment. Ajoutez des références au{" "}
          <a href="/catalogue" className="text-brand-600 hover:text-brand-700">
            catalogue
          </a>{" "}
          puis rendez-vous sur{" "}
          <a href="/devis" className="text-brand-600 hover:text-brand-700">
            mon devis
          </a>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {(quotes as Quote[]).map((q) => (
            <div key={q.id} className="card flex flex-col gap-4 p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className={q.status === "answered" ? "badge-answered" : "badge-pending"}>
                  {q.status === "answered" ? "Répondu" : "En attente"}
                </span>
                <span className="text-xs text-ink-faint">Envoyé le {formatDate(q.created_at)}</span>
              </div>

              <ul className="flex flex-col gap-1 text-sm text-ink">
                {q.items.map((item, i) => (
                  <li key={i}>
                    Réf. {item.ref} — {item.name} · {item.finish} · quantité {item.qty}
                  </li>
                ))}
              </ul>

              {q.message && <p className="text-sm italic text-ink-soft">« {q.message} »</p>}

              {q.status === "answered" ? (
                <div className="rounded-md border border-leaf-300 bg-leaf-50 p-4">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-grass-700">
                    Réponse{q.replied_at ? ` · ${formatDate(q.replied_at)}` : ""}
                  </p>
                  <p className="text-sm text-ink">{q.reply}</p>
                </div>
              ) : (
                <p className="text-xs text-brand-600">Réponse sous 24 à 48 heures.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
