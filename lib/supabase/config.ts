// NEXT_PUBLIC_* values are inlined at build time. If a deployment is built
// before the variables exist in the project settings, they are simply absent
// at runtime — so every caller checks rather than asserting, and the public
// catalogue keeps working even when authentication cannot.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
