"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="text-sm text-ink-soft hover:text-brand-600"
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Déconnexion
    </button>
  );
}
