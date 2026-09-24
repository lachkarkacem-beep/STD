// Hand-written to match supabase/migrations/0001_init.sql. Regenerate with
// `supabase gen types typescript` once the project is live if the schema grows.

export type QuoteItem = {
  ref: string;
  name: string;
  finish: string;
  qty: number;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  job_title: string | null;
  role: "client" | "admin";
  created_at: string;
};

export type Quote = {
  id: string;
  user_id: string;
  items: QuoteItem[];
  message: string | null;
  status: "pending" | "answered";
  reply: string | null;
  replied_at: string | null;
  replied_by: string | null;
  created_at: string;
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
