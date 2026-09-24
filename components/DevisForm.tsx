"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearCart, readCart, removeLine, type CartLine } from "@/lib/cart";
import { FINISHES } from "@/lib/finishes";
import type { CatalogDb } from "@/lib/catalog";

export default function DevisForm({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [cart, setCart] = useState<CartLine[]>([]);
  const [db, setDb] = useState<CatalogDb | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setCart(readCart());
    fetch("/3d/products/products.json")
      .then((r) => r.json())
      .then(setDb)
      .catch(() => setDb(null));
  }, []);

  function product(id: string) {
    return db?.products.find((p) => p.id === id) ?? null;
  }

  function onRemove(id: string, finish: string) {
    setCart(removeLine(id, finish));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const items = cart.map((l) => ({
      ref: l.id,
      name: product(l.id)?.name ?? l.id,
      finish: l.finish,
      qty: l.qty,
    }));

    const { error } = await supabase.from("quotes").insert({
      user_id: userId,
      items,
      message: message || null,
    });

    setSubmitting(false);
    if (error) {
      setError("Impossible d'envoyer la demande. Réessayez.");
      return;
    }

    clearCart();
    setCart([]);
    setSent(true);
    router.refresh();
  }

  if (sent) {
    return (
      <div className="card flex flex-col gap-3 p-8">
        <h2 className="text-lg font-medium text-ink">Demande envoyée</h2>
        <p className="text-sm text-ink-soft">
          Merci, votre demande de devis a été transmise. Nous répondons sous 24 à 48 heures — la
          réponse apparaîtra dans{" "}
          <a href="/compte" className="text-brand-600 hover:text-brand-700">
            votre compte
          </a>
          .
        </p>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="card flex flex-col gap-3 p-8">
        <p className="text-sm text-ink-soft">
          Votre devis est vide. Parcourez le{" "}
          <a href="/catalogue" className="text-brand-600 hover:text-brand-700">
            catalogue
          </a>{" "}
          et ajoutez des références.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8">
      <div className="card divide-y divide-cream-line">
        {cart.map((line) => {
          const p = product(line.id);
          const finishLabel = FINISHES.find((f) => f.id === line.finish)?.label ?? line.finish;
          return (
            <div key={`${line.id}-${line.finish}`} className="flex items-center gap-4 p-5">
              <div className="flex-1">
                <div className="text-sm font-medium text-ink">
                  Réf. {line.id} — {p?.name ?? ""}
                </div>
                <div className="text-xs text-ink-faint">
                  {finishLabel} · quantité {line.qty}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(line.id, line.finish)}
                className="text-xs text-brand-600 hover:text-brand-700"
              >
                Retirer
              </button>
            </div>
          );
        })}
      </div>

      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        Message (précisions, quantités, délais…)
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="input"
        />
      </label>

      {error && <p className="text-sm text-brand-600">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary self-start">
        {submitting ? "Envoi…" : "Envoyer la demande de devis"}
      </button>
    </form>
  );
}
