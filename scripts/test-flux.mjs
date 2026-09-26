// Épreuve du parcours de devis, contre la vraie base.
//
//   node scripts/test-flux.mjs
//
// Ce n'est pas `npm run check`, qui ne touche à rien : ce script-ci CRÉE des
// comptes et des demandes réels. Il sert à vérifier ce qu'aucun contrôle hors
// ligne ne peut établir — que les règles d'accès posées en base font bien ce
// qu'elles annoncent.
//
// Tout passe par des requêtes HTTP nues, avec la seule clé publique : c'est
// le point de vue d'un visiteur, donc exactement celui d'un attaquant. Ce qui
// est refusé ici ne peut être obtenu par aucun autre chemin.
//
// Les comptes créés portent le préfixe « essai-flux- » pour qu'on les
// retrouve et qu'on les efface ensuite.

import fs from "node:fs";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const CLE = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL_BASE || !CLE) {
  console.error("Il manque NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const EMAIL_ADMIN = "lachkarkacem@gmail.com";

let pass = 0;
let fail = 0;
const ok = (cond, label, detail = "") => {
  if (cond) {
    pass++;
    console.log(`  ok     ${label}`);
  } else {
    fail++;
    console.log(`  ECHEC  ${label}${detail ? " — " + detail : ""}`);
  }
};

/** Requête PostgREST au nom d'un jeton donné. */
async function rest(jeton, chemin, options = {}) {
  const r = await fetch(`${URL_BASE}/rest/v1/${chemin}`, {
    method: options.method ?? "GET",
    headers: {
      apikey: CLE,
      Authorization: `Bearer ${jeton ?? CLE}`,
      "Content-Type": "application/json",
      // On veut voir les lignes touchées : c'est ainsi qu'on distingue « zéro
      // ligne modifiée » d'une erreur franche. Les deux valent refus, mais
      // pas pour la même raison.
      Prefer: "return=representation",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const texte = await r.text();
  let corps = null;
  try {
    corps = texte ? JSON.parse(texte) : null;
  } catch {
    corps = texte;
  }
  return { status: r.status, corps };
}

/** Une écriture est refusée si elle erre OU si elle ne touche aucune ligne. */
function refuse({ status, corps }) {
  if (status >= 400) return true;
  return Array.isArray(corps) && corps.length === 0;
}

const marque = Date.now().toString(36);
const adresse = (qui) => `essai-flux-${marque}-${qui}@example.com`;

async function inscrire(qui, champs) {
  const email = adresse(qui);
  const r = await fetch(`${URL_BASE}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: CLE, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: `Essai-${marque}-motdepasse`,
      data: champs,
    }),
  });
  const corps = await r.json();
  if (!r.ok) throw new Error(`inscription ${qui} : ${corps.msg ?? corps.error_description ?? r.status}`);
  if (!corps.access_token) {
    throw new Error(
      `inscription ${qui} : aucun jeton renvoyé. La confirmation par e-mail est-elle activée ?`
    );
  }
  return { jeton: corps.access_token, email, id: corps.user.id };
}

console.log("\n=== Parcours de devis : épreuve contre la base réelle ===\n");
console.log(`Comptes d'essai : essai-flux-${marque}-*@example.com\n`);

console.log("1. Inscription d'un client\n");

const alice = await inscrire("alice", {
  full_name: "Alice Essai",
  job_title: "Paysagiste",
  // Volontairement avec des espaces : on vérifie qu'il est stocké tel quel.
  telephone: "98 985 647",
});

const { corps: profils } = await rest(alice.jeton, `profiles?select=*&id=eq.${alice.id}`);
const profilAlice = Array.isArray(profils) ? profils[0] : null;

ok(!!profilAlice, "le profil est créé à l'inscription");
ok(profilAlice?.role === "user", "le nouveau compte reçoit le rôle « user »", `reçu : ${profilAlice?.role}`);
ok(profilAlice?.full_name === "Alice Essai", "le nom complet est enregistré");
ok(profilAlice?.job_title === "Paysagiste", "la fonction est enregistrée");
ok(
  profilAlice?.telephone === "98 985 647",
  "le téléphone est stocké TEL QUEL, espaces compris",
  `stocké : ${JSON.stringify(profilAlice?.telephone)}`
);

console.log("\n2. Le client ne peut pas se promouvoir administrateur\n");

{
  const r = await rest(alice.jeton, `profiles?id=eq.${alice.id}`, {
    method: "PATCH",
    body: { role: "admin" },
  });
  ok(refuse(r), "changer son propre rôle est refusé", `réponse ${r.status} ${JSON.stringify(r.corps)}`);

  const { corps } = await rest(alice.jeton, `profiles?select=role&id=eq.${alice.id}`);
  ok(corps?.[0]?.role === "user", "le rôle est toujours « user » après la tentative", `rôle : ${corps?.[0]?.role}`);
}

{
  const r = await rest(alice.jeton, `profiles?id=eq.${alice.id}`, {
    method: "PATCH",
    body: { email: EMAIL_ADMIN },
  });
  ok(refuse(r), "prendre l'adresse de l'administrateur est refusé", `réponse ${r.status}`);
}

{
  // La garde ne doit pas tout bloquer : corriger son nom reste permis.
  const r = await rest(alice.jeton, `profiles?id=eq.${alice.id}`, {
    method: "PATCH",
    body: { full_name: "Alice Essai II" },
  });
  ok(!refuse(r), "le client peut toujours corriger son nom", `réponse ${r.status} ${JSON.stringify(r.corps)}`);
}

console.log("\n3. Le client dépose une demande\n");

const items = [
  { ref: "B105", name: "Bac rectangulaire à lames", finish: "blanc", qty: 4 },
  { ref: "V90", name: "Veilleuse V90", finish: "gris", qty: 2 },
];

let devisId = null;
{
  const r = await rest(alice.jeton, "quotes", {
    method: "POST",
    body: {
      user_id: alice.id,
      items,
      message: "Terrasse de 40 m², livraison à Bizerte.",
      status: "demandé",
    },
  });
  const ligne = Array.isArray(r.corps) ? r.corps[0] : null;
  ok(!refuse(r), "la demande est acceptée", `réponse ${r.status} ${JSON.stringify(r.corps)}`);
  ok(ligne?.status === "demandé", "elle naît au statut « demandé »", `statut : ${ligne?.status}`);
  ok(!!ligne?.updated_at, "la date de modification est posée");
  devisId = ligne?.id ?? null;
}

{
  const r = await rest(alice.jeton, "quotes", {
    method: "POST",
    body: { user_id: alice.id, items, status: "pending" },
  });
  ok(refuse(r), "un statut hors de la liste est refusé par la base", `réponse ${r.status}`);
}

{
  const r = await rest(alice.jeton, `quotes?id=eq.${devisId}`, {
    method: "PATCH",
    body: { message: "Je change d'avis." },
  });
  ok(refuse(r), "une demande envoyée ne se modifie plus", `réponse ${r.status}`);
}

{
  const r = await rest(alice.jeton, `quotes?id=eq.${devisId}`, {
    method: "PATCH",
    body: { status: "réponse_envoyée_email" },
  });
  ok(refuse(r), "le client ne change pas le statut de sa demande", `réponse ${r.status}`);
}

{
  const r = await rest(alice.jeton, `quotes?id=eq.${devisId}`, { method: "DELETE" });
  ok(refuse(r), "le client ne supprime pas sa demande", `réponse ${r.status}`);
}

console.log("\n4. Un client ne voit que ses propres demandes\n");

const bob = await inscrire("bob", {
  full_name: "Bob Essai",
  job_title: "Architecte",
  telephone: "+216 22 333 444",
});

{
  const { corps } = await rest(bob.jeton, "quotes?select=*");
  const n = Array.isArray(corps) ? corps.length : -1;
  ok(n === 0, "Bob ne voit aucune demande d'Alice", `${n} visible(s)`);
}

{
  const { corps } = await rest(bob.jeton, `quotes?select=*&id=eq.${devisId}`);
  ok((corps ?? []).length === 0, "Bob ne voit pas la demande d'Alice même en la nommant");
}

{
  const { corps } = await rest(bob.jeton, "profiles?select=*");
  const autres = (Array.isArray(corps) ? corps : []).filter((p) => p.id !== bob.id);
  ok(autres.length === 0, "Bob ne voit aucun autre profil", `${autres.length} visible(s)`);
}

{
  const r = await rest(bob.jeton, "quotes", {
    method: "POST",
    body: { user_id: alice.id, items, status: "demandé" },
  });
  ok(refuse(r), "Bob ne dépose pas de demande au nom d'Alice", `réponse ${r.status}`);
}

{
  const r = await rest(bob.jeton, `profiles?id=eq.${alice.id}`, {
    method: "PATCH",
    body: { telephone: "00 00 00 00" },
  });
  ok(refuse(r), "Bob ne modifie pas la fiche d'Alice", `réponse ${r.status}`);
}

{
  const { corps } = await rest(alice.jeton, "quotes?select=*");
  ok((corps ?? []).length === 1, "Alice retrouve bien sa demande", `${(corps ?? []).length} trouvée(s)`);
  ok((corps ?? [])[0]?.items?.length === 2, "avec ses deux références");
}

console.log("\n5. Un visiteur non connecté\n");

{
  const { corps } = await rest(null, "quotes?select=*");
  ok((Array.isArray(corps) ? corps.length : 0) === 0, "ne voit aucune demande");
}
{
  const { corps } = await rest(null, "profiles?select=*");
  ok((Array.isArray(corps) ? corps.length : 0) === 0, "ne voit aucun profil");
}
{
  const r = await rest(null, "quotes", {
    method: "POST",
    body: { user_id: alice.id, items, status: "demandé" },
  });
  ok(refuse(r), "ne dépose aucune demande", `réponse ${r.status}`);
}

console.log("\n6. Le compte administrateur\n");

{
  // Son mot de passe ne nous appartient pas : on vérifie au moins qu'aucun
  // second compte ne peut naître sous cette adresse.
  const r = await fetch(`${URL_BASE}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: CLE, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL_ADMIN, password: `Essai-${marque}-motdepasse` }),
  });
  const corps = await r.json();
  const dejaPris = !r.ok || (corps.user?.identities && corps.user.identities.length === 0);
  ok(!!dejaPris, "l'adresse administratrice est déjà prise : pas de second compte");
}

// ---------------------------------------------------------------------------
// La moitié administrateur ne peut se jouer qu'avec son mot de passe, qui ne
// traîne nulle part dans le dépôt. Lancez :
//
//   MOT_DE_PASSE_ADMIN='…' node scripts/test-flux.mjs
//
// (PowerShell : $env:MOT_DE_PASSE_ADMIN='…'; node scripts/test-flux.mjs)
//
// Le mot de passe n'est ni écrit, ni journalisé, ni envoyé ailleurs qu'à
// Supabase.
// ---------------------------------------------------------------------------

const motDePasseAdmin = process.env.MOT_DE_PASSE_ADMIN;

if (!motDePasseAdmin) {
  console.log("\n7. Parcours administrateur — non joué\n");
  console.log("  passé  relancez avec MOT_DE_PASSE_ADMIN pour éprouver ce côté-là");
} else {
  console.log("\n7. Parcours administrateur\n");

  const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: CLE, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL_ADMIN, password: motDePasseAdmin }),
  });
  const session = await r.json();

  if (!r.ok || !session.access_token) {
    ok(false, "connexion de l'administrateur", session.error_description ?? session.msg ?? `${r.status}`);
  } else {
    const admin = { jeton: session.access_token, id: session.user.id };

    const { corps: profilAdmin } = await rest(admin.jeton, `profiles?select=*&id=eq.${admin.id}`);
    ok(profilAdmin?.[0]?.role === "admin", "le compte porte bien le rôle « admin »");

    // Il voit tout.
    const { corps: toutes } = await rest(admin.jeton, "quotes?select=*");
    ok((toutes ?? []).length >= 1, "l'administrateur voit les demandes des clients", `${(toutes ?? []).length}`);
    ok(
      (toutes ?? []).some((q) => q.id === devisId),
      "il voit précisément la demande d'Alice"
    );
    const { corps: tousProfils } = await rest(admin.jeton, "profiles?select=*");
    ok((tousProfils ?? []).length >= 3, "il voit les fiches clients", `${(tousProfils ?? []).length}`);

    // Il fait avancer le statut.
    for (const etape of ["en_cours_de_traitement", "réponse_envoyée_whatsapp"]) {
      const rep = await rest(admin.jeton, `quotes?id=eq.${devisId}`, {
        method: "PATCH",
        body: { status: etape },
      });
      ok(!refuse(rep), `il passe la demande à « ${etape} »`, `réponse ${rep.status} ${JSON.stringify(rep.corps)}`);
    }

    // updated_at doit avoir bougé, created_at non.
    const { corps: apres } = await rest(admin.jeton, `quotes?select=*&id=eq.${devisId}`);
    const q = apres?.[0];
    ok(q?.status === "réponse_envoyée_whatsapp", "le statut est bien celui posé en dernier");
    ok(
      new Date(q?.updated_at).getTime() > new Date(q?.created_at).getTime(),
      "la date de modification a suivi",
      `${q?.created_at} → ${q?.updated_at}`
    );

    // Il complète une fiche client.
    {
      const rep = await rest(admin.jeton, `profiles?id=eq.${bob.id}`, {
        method: "PATCH",
        body: { telephone: "55 111 222" },
      });
      ok(!refuse(rep), "il renseigne le téléphone d'un client", `réponse ${rep.status}`);
      const { corps } = await rest(admin.jeton, `profiles?select=telephone&id=eq.${bob.id}`);
      ok(corps?.[0]?.telephone === "55 111 222", "le numéro est enregistré tel quel");
    }

    // Mais il ne dépose pas de demande, et ne change aucun rôle.
    {
      const rep = await rest(admin.jeton, "quotes", {
        method: "POST",
        body: { user_id: admin.id, items, status: "demandé" },
      });
      ok(refuse(rep), "l'administrateur ne dépose PAS de demande de devis", `réponse ${rep.status}`);
    }
    {
      const rep = await rest(admin.jeton, `profiles?id=eq.${bob.id}`, {
        method: "PATCH",
        body: { role: "admin" },
      });
      ok(refuse(rep), "il ne peut pas nommer un second administrateur", `réponse ${rep.status}`);
      const { corps } = await rest(admin.jeton, `profiles?select=role&id=eq.${bob.id}`);
      ok(corps?.[0]?.role === "user", "le client reste « user »");
    }

    // Et le client voit la réponse arriver de son côté.
    const { corps: vuDuClient } = await rest(alice.jeton, `quotes?select=status&id=eq.${devisId}`);
    ok(
      vuDuClient?.[0]?.status === "réponse_envoyée_whatsapp",
      "le client voit le nouveau statut dans son espace",
      `vu : ${vuDuClient?.[0]?.status}`
    );
  }
}

console.log(`\n${fail === 0 ? "TOUT PASSE" : "DES CONTROLES ECHOUENT"} — ${pass} succès, ${fail} échecs`);
console.log(`\nComptes d'essai laissés en base :`);
console.log(`  ${adresse("alice")}`);
console.log(`  ${adresse("bob")}`);
console.log("Ils partiront avec supabase/maintenance/purge.sql.\n");

process.exit(fail === 0 ? 0 : 1);
