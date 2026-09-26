import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUTS, estClos } from "@/lib/devis-statuts.mjs";

export default async function AdminDashboard() {
  const supabase = createClient();

  const [parStatut, { count: total }, { count: clients }] = await Promise.all([
    Promise.all(
      STATUTS.map(async (s) => {
        const { count } = await supabase
          .from("quotes")
          .select("*", { count: "exact", head: true })
          .eq("status", s.id);
        return { ...s, count: count ?? 0 };
      })
    ),
    supabase.from("quotes").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "user"),
  ]);

  // Ce qui attend une action, c'est ce qui n'est pas encore traité.
  const aTraiter = parStatut.filter((s) => !estClos(s.id)).reduce((n, s) => n + s.count, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {[
          { label: "Demandes à traiter", value: aTraiter },
          { label: "Demandes au total", value: total ?? 0 },
          { label: "Comptes inscrits", value: clients ?? 0 },
        ].map((s) => (
          <div key={s.label} className="card p-6">
            <div className="font-heading text-3xl font-medium text-ink">{s.value}</div>
            <div className="mt-2 text-xs uppercase tracking-wide text-ink-faint">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-normal text-ink">Par statut</h2>
        <ul className="flex flex-col divide-y divide-line">
          {parStatut.map((s) => (
            <li key={s.id} className="flex items-center gap-4 py-3">
              <Link
                href={`/admin/devis?statut=${encodeURIComponent(s.id)}`}
                className="text-sm text-ink hover:text-grass-700"
              >
                {s.admin}
              </Link>
              <span className="ml-auto font-heading text-xl text-ink-soft tabular-nums">
                {s.count}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Pas de « composer un devis » ici, et ce n'est pas un oubli : ce compte
          traite les demandes, il n'en dépose pas. La base le refuse aussi. */}
      <p className="text-xs text-ink-faint">
        Ce compte ne dépose pas de demande de devis : il les reçoit et y répond.
      </p>
    </div>
  );
}
