import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { readPublicSupabaseEnv } from "@/lib/supabase/public-env";

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = readPublicSupabaseEnv();

  return createServerClient(
    url,
    anonKey,
    {
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
    },
  );
}
