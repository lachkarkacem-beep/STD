"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { estAdmin } from "@/lib/roles";
import { estStatutValide } from "@/lib/devis-statuts.mjs";
import type { Profile } from "@/lib/supabase/types";

/**
 * Toute action d'administration repasse par ici.
 *
 * Une action serveur est une route HTTP comme une autre : elle est appelable
 * depuis l'extérieur. Le fait que le bouton ne s'affiche que chez
 * l'administrateur ne protège donc rien — c'est ce contrôle-ci qui protège,
 * doublé par les règles d'accès en base.
 */
async function exigerAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!estAdmin(profile as Profile | null)) {
    throw new Error("Action réservée à l'administration.");
  }
  return { supabase, user };
}

/** Change le statut d'une demande. */
export async function changerStatut(quoteId: string, statut: string) {
  if (!estStatutValide(statut)) throw new Error("Statut inconnu.");
  const { supabase } = await exigerAdmin();

  const { data, error } = await supabase
    .from("quotes")
    .update({ status: statut })
    .eq("id", quoteId)
    .select("id");

  if (error) throw new Error(error.message);
  // Une règle d'accès qui refuse ne lève pas d'erreur : elle rend zéro ligne.
  // Sans ce contrôle, le statut semblait changer et revenait à l'affichage
  // suivant.
  if (!data || data.length === 0) {
    throw new Error("La base a refusé le changement de statut : aucune ligne modifiée.");
  }

  revalidatePath("/admin/devis");
  revalidatePath(`/admin/devis/${quoteId}`);
  revalidatePath("/compte");
}

/**
 * Consigne la réponse faite au client. Elle s'affiche dans son espace, en
 * plus du courriel ou du message WhatsApp qu'on lui a envoyé.
 */
export async function replyToQuote(quoteId: string, reply: string, statut: string) {
  if (!estStatutValide(statut)) throw new Error("Statut inconnu.");
  const texte = reply.trim();
  if (!texte) throw new Error("La réponse est vide.");

  const { supabase, user } = await exigerAdmin();

  const { data, error } = await supabase
    .from("quotes")
    .update({
      reply: texte,
      status: statut,
      replied_at: new Date().toISOString(),
      replied_by: user.id,
    })
    .eq("id", quoteId)
    .select("id");

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("La base a refusé l'enregistrement de la réponse : aucune ligne modifiée.");
  }

  revalidatePath("/admin/devis");
  revalidatePath(`/admin/devis/${quoteId}`);
  revalidatePath("/compte");
}
