import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Profile } from "@/lib/supabase/types";

export async function getUserAndProfile(): Promise<{
  user: { id: string; email?: string } | null;
  profile: Profile | null;
}> {
  // The header calls this on every page, so a missing or unreachable backend
  // must degrade to "signed out" rather than take the whole site down.
  if (!isSupabaseConfigured) return { user: null, profile: null };

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { user: null, profile: null };

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return { user, profile: profile ?? null };
  } catch {
    return { user: null, profile: null };
  }
}
