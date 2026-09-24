"use client";

import { useState, useTransition } from "react";
import { replyToQuote } from "@/app/admin/devis/actions";

export default function ReplyForm({ quoteId }: { quoteId: string }) {
  const [reply, setReply] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await replyToQuote(quoteId, reply);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={3}
        placeholder="Votre réponse au client…"
        required
        className="input"
      />
      {error && <p className="text-sm text-brand-600">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary self-start">
        {pending ? "Envoi…" : "Envoyer la réponse"}
      </button>
    </form>
  );
}
