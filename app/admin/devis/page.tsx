import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import GestionDevis from "@/components/GestionDevis";
import { STATUTS, estStatutValide, statut as infoStatut, trierPourAdmin } from "@/lib/devis-statuts.mjs";
import type { Quote } from "@/lib/supabase/types";

type QuoteRow = Quote & {
  profile: {
    full_name: string | null;
    email: string;
    job_title: string | null;
    telephone: string | null;
  } | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminDevisPage({
  searchParams,
}: {
  searchParams: { statut?: string };
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("*, profile:profiles(full_name, email, job_title, telephone)")
    .order("created_at", { ascending: false });

  // Une requête qui échoue ne doit JAMAIS ressembler à une boîte vide : on
  // croirait n'avoir aucune demande alors qu'un client attend une réponse.
  if (error) {
    return (
      <div className="card border-brand-200 bg-brand-50 p-6">
        <h2 className="mb-2 text-lg font-normal text-ink">
          Les demandes n&apos;ont pas pu être lues
        </h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          La base a refusé la requête. Ce n&apos;est pas une boîte vide : il peut y avoir des
          demandes en attente.
        </p>
        <p className="mt-3 font-mono text-xs text-brand-700">{error.message}</p>
      </div>
    );
  }

  const toutes = (data as unknown as QuoteRow[] | null) ?? [];

  // Un filtre inconnu dans l'URL ne doit pas vider la liste sans explication :
  // on retombe sur « toutes ».
  const filtre = estStatutValide(searchParams.statut ?? "") ? searchParams.statut! : null;
  const visibles = trierPourAdmin(filtre ? toutes.filter((q) => q.status === filtre) : toutes);

  const compte = (id: string) => toutes.filter((q) => q.status === id).length;

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Filtrer par statut" className="flex flex-wrap gap-2">
        <Link
          href="/admin/devis"
          className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
            filtre === null
              ? "border-brand-500 bg-brand-500 text-white"
              : "border-line text-ink-soft hover:border-grass-500 hover:text-grass-700"
          }`}
        >
          Toutes ({toutes.length})
        </Link>
        {STATUTS.map((s) => (
          <Link
            key={s.id}
            href={`/admin/devis?statut=${encodeURIComponent(s.id)}`}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              filtre === s.id
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-line text-ink-soft hover:border-grass-500 hover:text-grass-700"
            }`}
          >
            {s.admin} ({compte(s.id)})
          </Link>
        ))}
      </nav>

      {visibles.length === 0 && (
        <p className="text-sm text-ink-soft">
          {filtre ? "Aucune demande à ce statut." : "Aucune demande de devis pour le moment."}
        </p>
      )}

      {visibles.map((q) => {
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
                {s?.admin ?? q.status}
              </span>
              <span className="text-sm font-medium text-ink">
                {q.profile?.full_name ?? "Client"} · {q.profile?.job_title ?? "—"}
              </span>
              <span className="text-xs text-ink-faint">{q.profile?.email}</span>
              <span className="ml-auto text-xs text-ink-faint">
                Reçue le {formatDate(q.created_at)}
                {q.updated_at && q.updated_at !== q.created_at
                  ? ` · modifiée le ${formatDate(q.updated_at)}`
                  : ""}
              </span>
            </div>

            <ul className="flex flex-col gap-1 text-sm text-ink">
              {q.items.map((item, i) => (
                <li key={i}>
                  Réf. {item.ref} — {item.name} · {item.finish} ·{" "}
                  <span className="font-medium">quantité {item.qty}</span>
                </li>
              ))}
            </ul>

            {q.message && <p className="text-sm italic text-ink-soft">« {q.message} »</p>}

            {/* La fiche complète : articles, poids, coordonnées, historique. */}
            <Link
              href={`/admin/devis/${q.id}`}
              className="btn-primary self-start"
            >
              Ouvrir la demande
            </Link>

            {q.reply && (
              <div className="rounded-md border border-sable-300 bg-sable-100 p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-grass-700">
                  Note au client{q.replied_at ? ` · ${formatDate(q.replied_at)}` : ""}
                </p>
                <p className="text-sm text-ink">{q.reply}</p>
              </div>
            )}

            <GestionDevis
              quoteId={q.id}
              statut={q.status}
              email={q.profile?.email ?? null}
              telephone={q.profile?.telephone ?? null}
              nom={q.profile?.full_name ?? null}
              reponse={q.reply}
            />
          </div>
        );
      })}
    </div>
  );
}
