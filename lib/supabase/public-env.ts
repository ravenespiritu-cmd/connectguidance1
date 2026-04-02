const SUPABASE_CLOUD_URL = /^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i;

function parseJwtProjectRef(anonKey: string): string | null {
  const parts = anonKey.split(".");
  if (parts.length < 2 || !parts[1]) return null;
  try {
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = (4 - (b64.length % 4)) % 4;
    b64 += "=".repeat(pad);
    if (typeof atob !== "function") return null;
    const json = atob(b64);
    const payload = JSON.parse(json) as { ref?: string };
    return typeof payload.ref === "string" ? payload.ref : null;
  } catch {
    return null;
  }
}

/**
 * Trimmed Supabase URL + anon key, with a sanity check that the JWT `ref` matches
 * `*.supabase.co` host (avoids "Invalid API key" when keys are copied from another project).
 */
export function readPublicSupabaseEnv(): { url: string; anonKey: string } {
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  const url = rawUrl.replace(/\/+$/, "");

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (Supabase Dashboard → Settings → API). Restart the dev server after editing env files.",
    );
  }

  const hostMatch = url.match(SUPABASE_CLOUD_URL);
  if (hostMatch) {
    const hostRef = hostMatch[1].toLowerCase();
    const keyRef = parseJwtProjectRef(anonKey)?.toLowerCase();
    if (keyRef && keyRef !== hostRef) {
      throw new Error(
        `Supabase anon key belongs to project ref "${keyRef}" but NEXT_PUBLIC_SUPABASE_URL uses "${hostRef}". Copy both values from the same project.`,
      );
    }
  }

  return { url, anonKey };
}
