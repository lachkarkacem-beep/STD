import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";
import { EMAIL_ADMIN } from "@/lib/roles";

const PROTECTED_PREFIXES = ["/compte", "/devis", "/admin"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  // No backend configured: keep the protected areas closed rather than
  // crashing, and let the sign-in page explain the situation.
  if (!isSupabaseConfigured) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

  if (isProtected && !user) {
    const redirectUrl = new URL("/connexion", request.url);
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (path.startsWith("/admin") && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", user.id)
      .single();

    // Les deux conditions, pas une seule : le rôle en base ET l'adresse
    // attendue. Une ligne de profil modifiée ne suffirait pas à entrer.
    const admin =
      profile?.role === "admin" &&
      (profile as { email?: string }).email?.trim().toLowerCase() === EMAIL_ADMIN;

    if (!admin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/compte/:path*", "/devis/:path*", "/admin/:path*"],
};
