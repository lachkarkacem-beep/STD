"use client";

import Link from "next/link";
import { useState } from "react";
import { FORMATS } from "@/lib/export/formats.mjs";

type Exporteur = (format: string, avecPlantes: boolean, nom: string) => Promise<Blob>;

/**
 * Le téléchargement du modèle 3D.
 *
 * C'était un lien de texte perdu sous la visionneuse, sans dire ce qu'on
 * obtenait. C'est maintenant un bloc à part, qui nomme chaque format et le
 * logiciel qui le lit — un architecte veut du DAE, un imprimeur du STL, et
 * ils n'ont pas à le deviner.
 */
export default function TelechargerModele({
  reference,
  exporteur,
  avecPlantes,
  connecte,
}: {
  reference: string;
  exporteur: () => Exporteur | null;
  avecPlantes: boolean;
  connecte: boolean;
}) {
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [plantesIncluses, setPlantesIncluses] = useState(true);

  async function telecharger(format: string, extension: string) {
    const exporte = exporteur();
    if (!exporte) {
      setErreur("La vue 3D n'est pas encore prête. Patientez un instant.");
      return;
    }
    setErreur(null);
    setEnCours(format);
    try {
      const nom = `${reference}${avecPlantes && plantesIncluses ? "-plante" : ""}`;
      const blob = await exporte(format, avecPlantes && plantesIncluses, nom);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${nom}.${extension}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErreur("La conversion n'a pas abouti. Réessayez, ou appelez-nous.");
    } finally {
      setEnCours(null);
    }
  }

  // Sans compte, on annonce ce qui existe et on invite à s'inscrire : cacher
  // la section laisserait croire qu'il n'y a rien à télécharger.
  if (!connecte) {
    return (
      <div className="mt-4 rounded-xl border border-sable-200 bg-sable-50 p-5">
        <h3 className="text-base font-normal text-ink">Télécharger le modèle 3D</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Cette pièce est téléchargeable en {FORMATS.map((f) => f.label).join(", ")} — de quoi
          la poser directement dans votre plan. Le téléchargement demande un compte.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link href="/inscription" className="btn-primary">
            Créer un compte
          </Link>
          <Link href="/connexion" className="text-sm text-grass-700 underline-offset-4 hover:underline">
            J&apos;ai déjà un compte
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-sable-200 bg-sable-50 p-5">
      <h3 className="text-base font-normal text-ink">Télécharger le modèle 3D</h3>
      <p className="mt-1 text-sm text-ink-soft">
        Au coloris affiché, à l&apos;échelle réelle, en mètres.
      </p>

      {avecPlantes && (
        <label className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={plantesIncluses}
            onChange={(e) => setPlantesIncluses(e.target.checked)}
            className="h-4 w-4 rounded border border-line"
          />
          Inclure la plantation
        </label>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => telecharger(f.id, f.extension)}
            disabled={enCours !== null}
            className="flex flex-col items-start gap-0.5 rounded-lg border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-grass-500 disabled:opacity-50"
          >
            <span className="flex w-full items-center gap-2">
              <span className="font-medium text-brand-600">{f.label}</span>
              <span className="ml-auto text-xs text-ink-faint">
                {enCours === f.id ? "conversion…" : `.${f.extension}`}
              </span>
            </span>
            <span className="text-xs leading-snug text-ink-faint">{f.note}</span>
          </button>
        ))}
      </div>

      {erreur && (
        <p role="alert" className="mt-3 text-sm text-brand-600">
          {erreur}
        </p>
      )}
    </div>
  );
}
