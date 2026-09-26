"use client";

import { useState, useTransition } from "react";
import { changerStatut, replyToQuote } from "@/app/admin/devis/actions";
import { STATUTS, estClos, lienWhatsApp } from "@/lib/devis-statuts.mjs";

/**
 * Le panneau de gestion d'une demande : avancer le statut, joindre le client,
 * consigner la réponse.
 *
 * L'administrateur répond par e-mail ou par WhatsApp — hors du site. Le statut
 * est donc posé à la main, et le texte consigné ici n'est qu'une trace, que le
 * client retrouve dans son espace.
 */
export default function GestionDevis({
  quoteId,
  statut,
  email,
  telephone,
  nom,
  reponse,
}: {
  quoteId: string;
  statut: string;
  email: string | null;
  telephone: string | null;
  nom: string | null;
  reponse: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState(reponse ?? "");
  const [ouvert, setOuvert] = useState(false);

  const whatsapp = lienWhatsApp(
    telephone,
    `Bonjour ${nom ?? ""}, au sujet de votre demande de devis à la Société Tunisienne de Décoration.`
  );

  function agir(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : "L'action n'a pas abouti.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 border-t border-sable-200 pt-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wide text-ink-faint">Statut</span>
        <div className="flex flex-wrap gap-2">
          {STATUTS.map((s) => {
            const actif = s.id === statut;
            return (
              <button
                key={s.id}
                type="button"
                disabled={pending || actif}
                onClick={() => agir(() => changerStatut(quoteId, s.id))}
                aria-pressed={actif}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  actif
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-line text-ink-soft hover:border-grass-500 hover:text-grass-700 disabled:opacity-40"
                }`}
              >
                {s.admin}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-xs uppercase tracking-wide text-ink-faint">Répondre</span>
        {email && (
          <a
            href={`mailto:${email}?subject=${encodeURIComponent("Votre demande de devis")}`}
            className="text-brand-600 hover:text-grass-700"
          >
            E-mail
          </a>
        )}
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 hover:text-grass-700"
          >
            WhatsApp
          </a>
        ) : (
          // Sans numéro exploitable, on le dit plutôt que d'afficher un lien
          // qui ouvrirait une conversation vide.
          <span className="text-xs text-ink-faint">Pas de numéro utilisable</span>
        )}
        {telephone && <span className="text-xs text-ink-faint">{telephone}</span>}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          className="text-xs text-ink-soft underline-offset-4 hover:text-grass-700 hover:underline"
        >
          {ouvert ? "Masquer la note au client" : reponse ? "Modifier la note au client" : "Consigner la réponse dans son espace"}
        </button>

        {ouvert && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              agir(() =>
                replyToQuote(
                  quoteId,
                  reply,
                  // Consigner une réponse sans avoir dit par où elle est
                  // partie n'aurait pas de sens : on retient l'e-mail par
                  // défaut, que l'administrateur peut corriger d'un clic.
                  estClos(statut) ? statut : "réponse_envoyée_email"
                )
              );
            }}
            className="mt-3 flex flex-col gap-2"
          >
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              required
              placeholder="Ce que le client verra dans son espace…"
              className="input"
            />
            <button type="submit" disabled={pending} className="btn-primary self-start disabled:opacity-50">
              {pending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </form>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-brand-600">
          {error}
        </p>
      )}
    </div>
  );
}
