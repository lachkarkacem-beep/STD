"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function replyToQuote(quoteId: string, reply: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("quotes")
    .update({
      reply,
      status: "answered",
      replied_at: new Date().toISOString(),
      replied_by: user.id,
    })
    .eq("id", quoteId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/devis");
}
