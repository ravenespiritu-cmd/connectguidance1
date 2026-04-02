/**
 * Central Supabase browser + server clients for GuidanceConnect.
 * Use `createBrowserClient` in client components; `createServerClient` in Server Components and Server Actions.
 */
import { createBrowserClient as createSupabaseBrowserClient, createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { readPublicSupabaseEnv } from "@/lib/supabase/public-env";

/** Client Components — session via cookies handled by @supabase/ssr. */
export function createBrowserClient() {
  const { url, anonKey } = readPublicSupabaseEnv();
  return createSupabaseBrowserClient(url, anonKey);
}

/**
 * Server Components / Server Actions — forwards cookie reads and writes so auth refreshes correctly.
 */
export async function createServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = readPublicSupabaseEnv();

  return createSupabaseServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
