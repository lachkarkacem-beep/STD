import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { fonction?: string };
}) {
  const supabase = createClient();
  const [{ data: profiles }, { data: quotes }] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "user").order("created_at", { ascending: false }),
    supabase.from("quotes").select("user_id"),
  ]);

  const clients = (profiles as Profile[] | null) ?? [];
  const quoteCounts = new Map<string, number>();
  for (const q of quotes ?? []) {
    quoteCounts.set(q.user_id, (quoteCounts.get(q.user_id) ?? 0) + 1);
  }

  const jobTitles = Array.from(
    new Set(clients.map((c) => c.job_title).filter((t): t is string => !!t))
  ).sort();

  const selected = searchParams.fonction ?? "";
  const filtered = selected ? clients.filter((c) => c.job_title === selected) : clients;

  return (
    <div>
      <form className="mb-6 flex items-center gap-3 text-sm" method="get">
        <label htmlFor="fonction" className="text-ink-soft">
          Filtrer par fonction
        </label>
        <select id="fonction" name="fonction" defaultValue={selected} className="input">
          <option value="">Toutes</option>
          {jobTitles.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-secondary">
          Filtrer
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Fonction</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Inscrit le</th>
              <th className="px-4 py-3">Devis</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{c.full_name ?? "—"}</td>
                <td className="px-4 py-3 text-ink-soft">{c.job_title ?? "—"}</td>
                <td className="px-4 py-3 text-ink-soft">{c.email}</td>
                <td className="px-4 py-3 text-ink-soft">{c.telephone ?? "—"}</td>
                <td className="px-4 py-3 text-ink-faint">{formatDate(c.created_at)}</td>
                <td className="px-4 py-3 text-ink-faint">{quoteCounts.get(c.id) ?? 0}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-faint">
                  Aucun client.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
