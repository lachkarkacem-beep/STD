import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GestionDevis from "@/components/GestionDevis";
import { getProduct, dimLine } from "@/lib/catalog";
import { FINISHES } from "@/lib/finishes";
import { statut as infoStatut, lienWhatsApp } from "@/lib/devis-statuts.mjs";
import type { Quote } from "@/lib/supabase/types";

type FicheClient = {
  id: string;
  full_name: string | null;
  email: string;
  job_title: string | null;
  telephone: string | null;
  created_at: string;
};

type QuoteRow = Quote & { profile: FicheClient | null };

function dateLongue(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DevisDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  // Deux requêtes, et non une jointure imbriquée : `quotes` pointe deux fois
  // vers `profiles` (l'auteur par `user_id`, le répondant par `replied_by`),
  // ce qui rend l'embarquement ambigu et fait échouer la requête.
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", params.id)
    .single();

  const devis = data as Quote | null;

  const { data: fiche, error: erreurFiche } = devis
    ? await supabase
        .from("profiles")
        .select("id, full_name, email, job_title, telephone, created_at")
        .eq("id", devis.user_id)
        .maybeSingle()
    : { data: null, error: null };

  // « Introuvable » et « la requête a échoué » ne se disent pas de la même
  // façon : la première est un fait, la seconde une panne qu'il faut voir.
  const incident = (error && error.code !== "PGRST116" ? error : null) ?? erreurFiche;
  if (incident) {
    return (
      <div className="card border-brand-200 bg-brand-50 p-6">
        <h2 className="mb-2 text-lg font-normal text-ink">La demande n&apos;a pas pu être lue</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          La base a refusé la requête. La demande existe peut-être toujours.
        </p>
        <p className="mt-3 font-mono text-xs text-brand-700">{incident.message}</p>
        <Link href="/admin/devis" className="mt-4 inline-block text-sm text-brand-600 hover:text-grass-700">
          ‹ Toutes les demandes
        </Link>
      </div>
    );
  }

  if (!devis) notFound();
  const q: QuoteRow = { ...devis, profile: (fiche as FicheClient | null) ?? null };

  const s = infoStatut(q.status);
  const whatsapp = lienWhatsApp(
    q.profile?.telephone,
    `Bonjour ${q.profile?.full_name ?? ""}, au sujet de votre demande de devis à la Société Tunisienne de Décoration.`
  );

  // Poids : c'est lui qui décide du mode de livraison, donc il a sa place ici.
  // Toutes les références n'en ont pas — on ne présente un total que s'il est
  // complet, faute de quoi il serait faussement rassurant.
  const lignes = q.items.map((item) => {
    const p = getProduct(item.ref);
    const poidsUnite = p?.weight ?? null;
    return {
      ...item,
      produit: p,
      poidsUnite,
      poidsLigne: poidsUnite === null ? null : poidsUnite * item.qty,
    };
  });

  const pieces = lignes.reduce((n, l) => n + l.qty, 0);
  const poidsConnu = lignes.every((l) => l.poidsLigne !== null);
  const poidsTotal = poidsConnu ? lignes.reduce((n, l) => n + (l.poidsLigne ?? 0), 0) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/devis" className="text-sm text-ink-soft hover:text-grass-700">
          ‹ Toutes les demandes
        </Link>
        <span
          className={
            s?.ton === "fait" ? "badge-answered" : s?.ton === "encours" ? "badge-encours" : "badge-pending"
          }
        >
          {s?.admin ?? q.status}
        </span>
        <span className="ml-auto text-xs text-ink-faint">Reçue le {dateLongue(q.created_at)}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* ---------------------------------------------------------------- */}
        {/* Les articles : c'est le cœur de la demande.                      */}
        {/* ---------------------------------------------------------------- */}
        <div className="card overflow-hidden">
          <div className="border-b border-line px-6 py-4">
            <h2 className="text-lg font-normal text-ink">Articles demandés</h2>
            <p className="mt-1 text-xs text-ink-faint">
              {q.items.length} référence{q.items.length > 1 ? "s" : ""} · {pieces} pièce
              {pieces > 1 ? "s" : ""}
              {poidsTotal !== null ? ` · ${Math.round(poidsTotal)} kg au total` : ""}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="px-6 py-3">Référence</th>
                  <th className="px-6 py-3">Coloris</th>
                  <th className="px-6 py-3 text-right">Quantité</th>
                  <th className="px-6 py-3 text-right">Poids</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => {
                  const coloris = FINISHES.find((f) => f.id === l.finish);
                  return (
                    <tr key={i} className="border-b border-line last:border-0 align-top">
                      <td className="px-6 py-4">
                        <div className="font-medium text-ink">
                          {l.produit ? (
                            <Link
                              href={`/catalogue/${l.ref}`}
                              className="hover:text-grass-700"
                              target="_blank"
                            >
                              {l.name}
                            </Link>
                          ) : (
                            l.name
                          )}
                        </div>
                        <div className="text-xs text-ink-faint">
                          Réf. {l.ref}
                          {l.produit ? ` · ${dimLine(l.produit)}` : " · référence retirée du catalogue"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-ink-soft">
                        <span className="inline-flex items-center gap-2">
                          {coloris && (
                            <span
                              className="h-4 w-4 rounded-full border border-line"
                              style={{ background: coloris.swatch }}
                            />
                          )}
                          {coloris?.label ?? l.finish}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-heading text-xl tabular-nums text-ink">
                        {l.qty}
                      </td>
                      <td className="px-6 py-4 text-right text-ink-soft tabular-nums">
                        {l.poidsLigne === null ? (
                          <span className="text-ink-faint">—</span>
                        ) : (
                          `${Math.round(l.poidsLigne)} kg`
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-sable-50">
                  <td className="px-6 py-3 text-xs uppercase tracking-wide text-ink-faint" colSpan={2}>
                    Total
                  </td>
                  <td className="px-6 py-3 text-right font-heading text-xl tabular-nums text-ink">
                    {pieces}
                  </td>
                  <td className="px-6 py-3 text-right text-sm tabular-nums text-ink">
                    {poidsTotal === null ? (
                      // Un total partiel induirait en erreur au moment de
                      // commander le transport.
                      <span className="text-ink-faint">poids incomplet</span>
                    ) : (
                      `${Math.round(poidsTotal)} kg`
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {q.message && (
            <div className="border-t border-line px-6 py-5">
              <p className="mb-2 text-xs uppercase tracking-wide text-ink-faint">Message du client</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{q.message}</p>
            </div>
          )}

          {q.reply && (
            <div className="border-t border-line bg-sable-50 px-6 py-5">
              <p className="mb-2 text-xs uppercase tracking-wide text-grass-700">
                Note au client{q.replied_at ? ` · ${dateLongue(q.replied_at)}` : ""}
              </p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{q.reply}</p>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Le client et la conduite de la demande.                          */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-col gap-6">
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-normal text-ink">Le client</h2>
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-faint">Nom</dt>
                <dd className="text-ink">{q.profile?.full_name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-faint">Fonction</dt>
                <dd className="text-ink-soft">{q.profile?.job_title ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-faint">E-mail</dt>
                <dd>
                  <a
                    href={`mailto:${q.profile?.email}?subject=${encodeURIComponent("Votre demande de devis")}`}
                    className="text-brand-600 hover:text-grass-700"
                  >
                    {q.profile?.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-faint">Téléphone</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  {q.profile?.telephone ? (
                    <>
                      <a
                        href={`tel:${q.profile.telephone.replace(/\s+/g, "")}`}
                        className="text-brand-600 hover:text-grass-700"
                      >
                        {q.profile.telephone}
                      </a>
                      {whatsapp && (
                        <a
                          href={whatsapp}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-grass-700 hover:underline"
                        >
                          WhatsApp
                        </a>
                      )}
                    </>
                  ) : (
                    <span className="text-ink-faint">
                      non renseigné —{" "}
                      <Link href="/admin/utilisateurs" className="text-brand-600 hover:text-grass-700">
                        le compléter
                      </Link>
                    </span>
                  )}
                </dd>
              </div>
              {q.profile?.created_at && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-faint">Inscrit le</dt>
                  <dd className="text-ink-faint">{dateLongue(q.profile.created_at)}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="card p-6">
            <h2 className="mb-1 text-lg font-normal text-ink">Conduite de la demande</h2>
            <p className="mb-2 text-xs text-ink-faint">
              Dernière modification : {dateLongue(q.updated_at)}
            </p>
            <GestionDevis
              quoteId={q.id}
              statut={q.status}
              email={q.profile?.email ?? null}
              telephone={q.profile?.telephone ?? null}
              nom={q.profile?.full_name ?? null}
              reponse={q.reply}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
