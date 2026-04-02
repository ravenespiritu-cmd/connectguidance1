import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readPublicSupabaseEnv } from "@/lib/supabase/public-env";

/**
 * Server-only client with RLS bypass. Use only after an explicit permission check
 * (e.g. requireAdmin). Never expose the service role key to the browser.
 */
export function getSupabaseServiceRoleClient(): SupabaseClient | null {
  const { url } = readPublicSupabaseEnv();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
