"use client";

import { useState, useTransition } from "react";
import { mettreAJourTelephone } from "@/app/admin/utilisateurs/actions";
import { lienWhatsApp } from "@/lib/devis-statuts.mjs";

/**
 * Le téléphone d'un client, modifiable sur place.
 *
 * Les comptes antérieurs au champ n'en ont pas : plutôt qu'une case vide et
 * définitive, l'administrateur le renseigne dès qu'il l'a.
 */
export default function TelephoneClient({
  userId,
  telephone,
  nom,
}: {
  userId: string;
  telephone: string | null;
  nom: string | null;
}) {
  const [edition, setEdition] = useState(false);
  const [valeur, setValeur] = useState(telephone ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const whatsapp = lienWhatsApp(
    telephone,
    `Bonjour ${nom ?? ""}, Société Tunisienne de Décoration.`
  );

  function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    startTransition(async () => {
      try {
        await mettreAJourTelephone(userId, valeur);
        setEdition(false);
      } catch (err) {
        setErreur(err instanceof Error ? err.message : "L'enregistrement n'a pas abouti.");
      }
    });
  }

  if (edition) {
    return (
      <form onSubmit={enregistrer} className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            type="tel"
            inputMode="tel"
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            placeholder="98 985 647"
            autoFocus
            className="input w-36 py-1 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="text-xs text-brand-600 hover:text-brand-700 disabled:opacity-50"
          >
            {pending ? "…" : "OK"}
          </button>
          <button
            type="button"
            onClick={() => {
              setValeur(telephone ?? "");
              setErreur(null);
              setEdition(false);
            }}
            className="text-xs text-ink-faint hover:text-ink-soft"
          >
            Annuler
          </button>
        </div>
        {erreur && (
          <span role="alert" className="text-xs text-brand-600">
            {erreur}
          </span>
        )}
      </form>
    );
  }

  return (
    <span className="flex items-center gap-2">
      {telephone ? (
        <>
          <span className="text-ink-soft">{telephone}</span>
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
        <span className="text-ink-faint">—</span>
      )}
      <button
        type="button"
        onClick={() => setEdition(true)}
        className="text-xs text-ink-faint underline-offset-4 hover:text-grass-700 hover:underline"
      >
        {telephone ? "Modifier" : "Renseigner"}
      </button>
    </span>
  );
}
