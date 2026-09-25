"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import BackendUnavailable from "@/components/BackendUnavailable";

export default function SignupForm() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);

  if (!isSupabaseConfigured) return <BackendUnavailable />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, job_title: jobTitle } },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      router.push("/compte");
      router.refresh();
    } else {
      // Email confirmation is required by the Supabase project settings.
      setConfirmEmailSent(true);
    }
  }

  if (confirmEmailSent) {
    return (
      <p className="text-sm text-ink-soft">
        Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse avant de vous connecter.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        Nom complet
        <input
          type="text"
          required
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
          placeholder="ex. Architecte, Paysagiste, Particulier…"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          className="input"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        E-mail
        <input
          type="email"
          required
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
      </label>
      {error && <p className="text-sm text-brand-600">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Création…" : "Créer mon compte"}
      </button>
    </form>
  );
}
