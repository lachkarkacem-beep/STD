import { createClient } from "@/lib/supabase/server";
import ReplyForm from "@/components/ReplyForm";
import type { Quote } from "@/lib/supabase/types";

type QuoteRow = Quote & {
  profile: { full_name: string | null; email: string; job_title: string | null } | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminDevisPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("quotes")
    .select("*, profile:profiles(full_name, email, job_title)")
    .order("created_at", { ascending: false });

  const quotes = (data as unknown as QuoteRow[] | null) ?? [];
  const sorted = [...quotes].sort((a, b) => {
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="flex flex-col gap-6">
      {sorted.length === 0 && <p className="text-sm text-ink-soft">Aucune demande de devis pour le moment.</p>}

      {sorted.map((q) => (
        <div key={q.id} className="card flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className={q.status === "answered" ? "badge-answered" : "badge-pending"}>
              {q.status === "answered" ? "Répondu" : "En attente"}
            </span>
            <span className="text-sm font-medium text-ink">
              {q.profile?.full_name ?? "Client"} · {q.profile?.job_title ?? "—"}
            </span>
            <span className="text-xs text-ink-faint">{q.profile?.email}</span>
            <span className="ml-auto text-xs text-ink-faint">{formatDate(q.created_at)}</span>
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
            <div className="rounded-md border border-leaf-400/40 bg-leaf-50 p-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-leaf-700">
                Réponse envoyée{q.replied_at ? ` · ${formatDate(q.replied_at)}` : ""}
              </p>
              <p className="text-sm text-ink">{q.reply}</p>
            </div>
          ) : (
            <ReplyForm quoteId={q.id} />
          )}
        </div>
      ))}
    </div>
  );
}
