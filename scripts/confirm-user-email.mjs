#!/usr/bin/env node
/**
 * Mark an auth user's email as confirmed (Admin API). Use when sign-in fails with "Email not confirmed".
 *
 * Usage:
 *   node scripts/confirm-user-email.mjs --email admin@urios.edu.ph
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (.env.local is auto-loaded).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function parseArgs(argv) {
  const out = { email: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--email" && next) {
      out.email = next;
      i++;
    } else if (a === "--help" || a === "-h") {
      out.help = true;
    }
  }
  return out;
}

async function findUserIdByEmail(admin, email) {
  const perPage = 1000;
  const target = email.toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function main() {
  loadEnvLocal();
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.email) {
    console.log(`Usage: node scripts/confirm-user-email.mjs --email <email>`);
    process.exit(args.help ? 0 : 1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const userId = await findUserIdByEmail(admin, args.email);
  if (!userId) {
    console.error("No auth user found for:", args.email);
    process.exit(1);
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });
  if (error) {
    console.error("updateUser failed:", error.message);
    process.exit(1);
  }

  console.log("Email confirmed for:", args.email);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
