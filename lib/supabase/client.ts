import { createBrowserClient } from "@supabase/ssr";

import { readPublicSupabaseEnv } from "@/lib/supabase/public-env";

export function getSupabaseBrowserClient() {
  const { url, anonKey } = readPublicSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
