// Statuts d'une demande de devis, et ce qu'on en montre de part et d'autre.
//
// Les valeurs stockées en base sont celles-ci, à la lettre : elles servent de
// contrainte SQL, de filtre d'URL et de clé d'affichage. Les changer impose
// une migration — d'où le contrôle du harnais qui vérifie que le fichier SQL
// et ce module disent la même chose.
//
// L'ordre du tableau est l'ordre d'avancement : il décide de l'ordre des
// filtres et des boutons chez l'administrateur.

export const STATUTS = [
  {
    id: "demandé",
    // Ce que voit l'administrateur.
    admin: "Demandé",
    // Ce que voit le client — il n'a pas à connaître notre vocabulaire interne.
    client: "Demande reçue",
    aide: "Nous l'avons bien reçue. Réponse sous 24 à 48 heures.",
    ton: "attente",
  },
  {
    id: "en_cours_de_traitement",
    admin: "En cours de traitement",
    client: "En cours d'étude",
    aide: "Nous chiffrons votre demande.",
    ton: "encours",
  },
  {
    id: "réponse_envoyée_email",
    admin: "Réponse envoyée par e-mail",
    client: "Réponse envoyée par e-mail",
    aide: "Regardez votre boîte mail, et les indésirables au cas où.",
    ton: "fait",
  },
  {
    id: "réponse_envoyée_whatsapp",
    admin: "Réponse envoyée par WhatsApp",
    client: "Réponse envoyée par WhatsApp",
    aide: "Nous vous avons écrit sur WhatsApp, au numéro de votre compte.",
    ton: "fait",
  },
];

/** Le statut d'une demande qui vient d'être envoyée. */
export const STATUT_INITIAL = STATUTS[0].id;

/** Les identifiants seuls, dans l'ordre d'avancement. */
export const IDS_STATUTS = STATUTS.map((s) => s.id);

/** @param {string} id */
export function statut(id) {
  return STATUTS.find((s) => s.id === id) ?? null;
}

/** @param {string} id */
export function estStatutValide(id) {
  return IDS_STATUTS.includes(id);
}

/** Une demande traitée est une demande à laquelle on a répondu. */
export function estClos(id) {
  return statut(id)?.ton === "fait";
}

/**
 * Rang d'avancement, pour trier : les demandes qui attendent une action
 * passent devant celles qui sont traitées.
 * @param {string} id
 */
export function rang(id) {
  const i = IDS_STATUTS.indexOf(id);
  return i === -1 ? IDS_STATUTS.length : i;
}

/**
 * Tri de la liste côté administrateur : d'abord ce qui n'est pas traité, et
 * dans chaque groupe les plus récentes en premier.
 *
 * @template {{status: string, created_at: string}} T
 * @param {T[]} demandes
 * @returns {T[]}
 */
export function trierPourAdmin(demandes) {
  return [...demandes].sort((a, b) => {
    const ca = estClos(a.status) ? 1 : 0;
    const cb = estClos(b.status) ? 1 : 0;
    if (ca !== cb) return ca - cb;
    const ra = rang(a.status);
    const rb = rang(b.status);
    if (ra !== rb) return ra - rb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/**
 * Lien WhatsApp pour répondre à un client.
 *
 * Le numéro est réduit à ses chiffres, et l'indicatif tunisien ajouté si le
 * client a saisi un numéro local — « 98 985 647 » et « +216 98 985 647 »
 * doivent ouvrir la même conversation.
 *
 * @param {string | null | undefined} telephone
 * @param {string} [message]
 */
export function lienWhatsApp(telephone, message = "") {
  const chiffres = (telephone ?? "").replace(/\D+/g, "");
  if (chiffres.length < 8) return null;

  // 8 chiffres : numéro tunisien sans indicatif. 216xxxxxxxx : déjà complet.
  // 00216… : forme internationale longue.
  let e164 = chiffres;
  if (chiffres.length === 8) e164 = `216${chiffres}`;
  else if (chiffres.startsWith("00")) e164 = chiffres.slice(2);

  const texte = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${e164}${texte}`;
}

/**
 * Le téléphone est obligatoire à l'inscription. On accepte les formes
 * courantes — espaces, points, tirets, indicatif — et on refuse ce qui ne
 * peut pas être un numéro.
 *
 * @param {string} valeur
 * @returns {string | null} le message d'erreur, ou null si c'est bon
 */
export function erreurTelephone(valeur) {
  const brut = (valeur ?? "").trim();
  if (!brut) return "Le numéro de téléphone est obligatoire.";
  if (/[^\d\s+().-]/.test(brut)) return "Le numéro ne doit contenir que des chiffres.";
  const chiffres = brut.replace(/\D+/g, "");
  if (chiffres.length < 8) return "Ce numéro est trop court.";
  if (chiffres.length > 15) return "Ce numéro est trop long.";
  return null;
}
