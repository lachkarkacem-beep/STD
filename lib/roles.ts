// Les deux rôles, et le seul endroit qui décide lequel est lequel.
//
// La règle est vérifiée en base (déclencheur + index unique) ET ici, du côté
// serveur. L'interface s'appuie dessus pour masquer ce qui n'a pas lieu
// d'être, mais masquer n'est pas interdire : c'est la base qui tranche.

import type { Profile } from "@/lib/supabase/types";

/** L'unique adresse administratrice. */
export const EMAIL_ADMIN = "lachkarkacem@gmail.com";

export function estEmailAdmin(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase() === EMAIL_ADMIN;
}

/**
 * Administrateur ? On exige les DEUX : le rôle en base et l'adresse attendue.
 * Une ligne de profil trafiquée ne suffit donc pas, et une adresse seule non
 * plus.
 */
export function estAdmin(profile: Profile | null | undefined) {
  return profile?.role === "admin" && estEmailAdmin(profile.email);
}

/**
 * Qui peut déposer une demande de devis : tout compte connecté qui n'est pas
 * l'administrateur. Lui gère les demandes, il n'en dépose pas.
 */
export function peutDemanderDevis(profile: Profile | null | undefined) {
  return !!profile && !estAdmin(profile);
}
