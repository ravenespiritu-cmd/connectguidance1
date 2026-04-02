#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createServerClient } from "@supabase/ssr";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(p, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    val = val.replace(/^['"]|['"]$/g, "");
    env[key] = val;
  }
  return env;
}

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = env.SEED_ADMIN_EMAIL;
  const password = env.SEED_ADMIN_PASSWORD;

  if (!url || !anonKey || !email || !password) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY or seed admin creds in .env.local");
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // no-op for this smoke test
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  console.log("error:", error ? error.message : null);
  console.log("user:", data.user?.id ?? null);
  console.log("session:", data.session ? "present" : "null");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

