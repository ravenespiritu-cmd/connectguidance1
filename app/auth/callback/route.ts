import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readPublicSupabaseEnv } from "@/lib/supabase/public-env";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\0")) {
    return "/";
  }
  return next;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  let supabaseUrl: string;
  let supabaseAnonKey: string;
  try {
    const env = readPublicSupabaseEnv();
    supabaseUrl = env.url;
    supabaseAnonKey = env.anonKey;
  } catch {
    return NextResponse.redirect(new URL("/login?error=auth_callback", url.origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth_callback", url.origin));
  }

  const cookieStore = await cookies();
  const redirectTarget = new URL(next, url.origin);
  const response = NextResponse.redirect(redirectTarget);

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth_callback", url.origin));
  }

  return response;
}
