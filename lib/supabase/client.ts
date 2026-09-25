import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

// Untyped on purpose: the generated-Database generic fought the hand-written
// shapes in lib/supabase/types.ts more than it helped. Row/insert shapes are
// asserted at each call site instead (see Profile/Quote in types.ts).
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
