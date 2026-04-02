import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readPublicSupabaseEnv } from "@/lib/supabase/public-env";

export async function POST() {
  const env = readPublicSupabaseEnv();
  const cookieStore = await cookies();

  const response = NextResponse.json({ ok: true });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Mirror `lib/supabase/middleware.ts` behavior so Supabase updates session state.
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.signOut();
  return response;
}

