// Écrits à la main d'après supabase/migrations/. À régénérer avec
// `supabase gen types typescript` si le schéma grossit.

export type QuoteItem = {
  ref: string;
  name: string;
  finish: string;
  qty: number;
};

/** Les quatre statuts. La liste fait foi dans lib/devis-statuts.mjs. */
export type QuoteStatus =
  | "demandé"
  | "en_cours_de_traitement"
  | "réponse_envoyée_email"
  | "réponse_envoyée_whatsapp";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  job_title: string | null;
  telephone: string | null;
  /** Un seul compte porte « admin », et c'est l'adresse fixée en base. */
  role: "user" | "admin";
  created_at: string;
};

export type Quote = {
  id: string;
  user_id: string;
  items: QuoteItem[];
  message: string | null;
  status: QuoteStatus;
  reply: string | null;
  replied_at: string | null;
  replied_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
      };
      quotes: {
        Row: Quote;
        Insert: Partial<Quote> & { user_id: string };
        Update: Partial<Quote>;
      };
    };
  };
};
