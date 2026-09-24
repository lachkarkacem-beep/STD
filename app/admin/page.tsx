import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = createClient();

  const [{ count: pending }, { count: total }, { count: clients }] = await Promise.all([
    supabase.from("quotes").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("quotes").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "client"),
  ]);

  const stats = [
    { label: "Devis en attente", value: pending ?? 0 },
    { label: "Devis au total", value: total ?? 0 },
    { label: "Clients inscrits", value: clients ?? 0 },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {stats.map((s) => (
        <div key={s.label} className="card p-6">
          <div className="font-heading text-3xl font-medium text-ink">{s.value}</div>
          <div className="mt-2 text-xs uppercase tracking-wide text-ink-faint">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
