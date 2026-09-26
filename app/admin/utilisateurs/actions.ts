"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { estAdmin } from "@/lib/roles";
import { erreurTelephone } from "@/lib/devis-statuts.mjs";
import type { Profile } from "@/lib/supabase/types";

/**
 * Même garde que pour les devis : une action serveur est une route HTTP,
 * appelable de l'extérieur. Le rôle se vérifie ici, et la règle d'accès en
 * base le redit.
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
  return supabase;
}

/**
 * Renseigne ou corrige le téléphone d'un client.
 *
 * Les comptes créés avant que le champ n'existe n'en ont pas : c'est par ici
 * qu'on les complète, au fur et à mesure des échanges.
 *
 * Le numéro est enregistré TEL QUEL, dans la forme où on l'a reçu. On ne le
 * reformate pas : « 98 985 647 » écrit par le client doit rester lisible
 * comme il l'a écrit. La mise au format international n'a lieu qu'au moment
 * de fabriquer le lien WhatsApp.
 */
export async function mettreAJourTelephone(userId: string, telephone: string) {
  const brut = telephone.trim();

  // Vider le champ est permis : c'est ainsi qu'on retire un numéro faux.
  if (brut) {
    const faute = erreurTelephone(brut);
    if (faute) throw new Error(faute);
  }

  const supabase = await exigerAdmin();

  // `.select()` n'est pas décoratif : quand une règle d'accès refuse une mise
  // à jour, PostgREST répond « succès, zéro ligne modifiée » — sans erreur.
  // Sans ce retour, l'action se croyait accomplie et le numéro disparaissait
  // en silence.
  const { data, error } = await supabase
    .from("profiles")
    .update({ telephone: brut || null })
    .eq("id", userId)
    .select("id");

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error(
      "La base a refusé la modification : aucune ligne changée. La règle d'accès " +
        "« profiles: l'administrateur met à jour » est probablement absente — " +
        "appliquez la migration 0003."
    );
  }

  revalidatePath("/admin/utilisateurs");
}
