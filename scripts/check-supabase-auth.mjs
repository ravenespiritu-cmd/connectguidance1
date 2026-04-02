#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

function timeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
  });
}

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
    process.exit(1);
  }

  const base = url.replace(/\/+$/, "");
  const healthUrl = `${base}/auth/v1/health`;
  console.log("Health URL:", healthUrl);

  const res = await Promise.race([
    fetch(healthUrl, {
      method: "GET",
      headers: anonKey ? { apikey: anonKey } : undefined,
    }),
    timeout(15_000),
  ]);

  console.log("Status:", res.status, res.statusText);
  const text = await res.text();
  console.log("Body preview:", text.slice(0, 400));
}

main().catch((e) => {
  console.error("Health check failed:", e?.message ?? e);
  process.exit(1);
});

