"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { erreurTelephone } from "@/lib/devis-statuts.mjs";
import BackendUnavailable from "@/components/BackendUnavailable";

/**
 * Les messages de Supabase sont en anglais et parlent de « users » : on les
 * traduit en ce que la personne devant l'écran doit comprendre et faire.
 */
function messageLisible(brut: string) {
  const m = brut.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Cette adresse a déjà un compte. Connectez-vous, ou utilisez une autre adresse.";
  if (m.includes("duplicate key") || m.includes("unique constraint"))
    return "Cette adresse a déjà un compte.";
  if (m.includes("invalid email") || m.includes("email address") )
    return "Cette adresse e-mail n'est pas valide.";
  if (m.includes("password") && m.includes("6"))
    return "Le mot de passe doit faire au moins 6 caractères.";
  if (m.includes("password")) return "Ce mot de passe n'est pas accepté.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Trop de tentatives. Patientez une minute avant de réessayer.";
  return "La création du compte n'a pas abouti. Réessayez, ou appelez-nous.";
}

export default function SignupForm() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);

  if (!isSupabaseConfigured) return <BackendUnavailable />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Vérifié ici pour répondre tout de suite, et en base pour de bon.
    const mauvaisTel = erreurTelephone(telephone);
    if (mauvaisTel) {
      setError(mauvaisTel);
      return;
    }
    if (!fullName.trim()) {
      setError("Indiquez votre nom complet.");
      return;
    }
    if (!jobTitle.trim()) {
      setError("Indiquez votre fonction : la réponse n'est pas la même pour un architecte et pour un particulier.");
      return;
    }

    setLoading(true);
    const { data, error } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      // Le rôle n'est PAS envoyé d'ici : il se décide en base, d'après
      // l'adresse. Ce qui partirait de ce formulaire serait ignoré.
      options: {
        data: {
          full_name: fullName.trim(),
          job_title: jobTitle.trim(),
          telephone: telephone.trim(),
        },
      },
    });

    setLoading(false);
    if (error) {
      setError(messageLisible(error.message));
      return;
    }

    // Supabase renvoie un utilisateur sans identités quand l'adresse existe
    // déjà, plutôt qu'une erreur : sans ce test, on annoncerait la création
    // d'un compte qui n'a pas eu lieu.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("Cette adresse a déjà un compte. Connectez-vous, ou utilisez une autre adresse.");
      return;
    }

    if (data.session) {
      router.push("/compte");
      router.refresh();
    } else {
      setConfirmEmailSent(true);
    }
  }

  if (confirmEmailSent) {
    return (
      <p className="text-sm leading-relaxed text-ink-soft">
        Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse avant de vous
        connecter.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        Nom complet
        <input
          type="text"
          required
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        Fonction / métier
        <input
          type="text"
          required
          autoComplete="organization-title"
          placeholder="ex. Architecte, Paysagiste, Particulier, Hôtelier…"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        Téléphone
        <input
          type="tel"
          required
          autoComplete="tel"
          inputMode="tel"
          placeholder="ex. 98123456"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          className="input"
        />
        <span className="text-xs text-ink-faint">
          C&apos;est par là qu&apos;on vous joint si la réponse demande deux mots de vive voix.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        E-mail
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        Mot de passe
        <input
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
        <span className="text-xs text-ink-faint">Six caractères au minimum.</span>
      </label>

      {error && (
        <p role="alert" className="text-sm text-brand-600">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
        {loading ? "Création…" : "Créer mon compte"}
      </button>
    </form>
  );
}
