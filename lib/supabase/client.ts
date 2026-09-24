import { createBrowserClient } from "@supabase/ssr";

// Untyped on purpose: the generated-Database generic fought the hand-written
// shapes in lib/supabase/types.ts more than it helped. Row/insert shapes are
// asserted at each call site instead (see Profile/Quote in types.ts).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
