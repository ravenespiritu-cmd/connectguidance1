#!/usr/bin/env node
/**
 * Bootstrap admin or counselor accounts (local or hosted Supabase).
 * Uses the service role key — run only on a trusted machine; never commit keys or log passwords.
 *
 * Usage:
 *   node scripts/seed-staff.mjs --email admin@school.edu --password '...' --role admin --name "Ada Admin"
 *   node scripts/seed-staff.mjs --email c1@school.edu --password '...' --role counselor
 *   node scripts/seed-staff.mjs --email you@school.edu --password '...' --role admin --confirm-email
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (.env.local is auto-loaded from cwd).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const STAFF_ROLES = ["admin", "counselor"];

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
  const out = {
    email: null,
    password: null,
    role: "admin",
    name: null,
    emailConfirm: true,
    confirmEmail: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--email" && next) {
      out.email = next;
      i++;
    } else if (a === "--password" && next) {
      out.password = next;
      i++;
    } else if (a === "--role" && next) {
      out.role = next;
      i++;
    } else if (a === "--name" && next) {
      out.name = next;
      i++;
    } else if (a === "--no-email-confirm") {
      out.emailConfirm = false;
    } else if (a === "--confirm-email") {
      out.confirmEmail = true;
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

function printHelp() {
  console.log(`GuidanceConnect — seed staff (admin / counselor)

Usage:
  node scripts/seed-staff.mjs --email <email> --password <password> [--role admin|counselor] [--name "Full name"] [--no-email-confirm] [--confirm-email]

Environment:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Optional: .env.local in project root is read if present.
`);
}

function normalizeProjectUrl(raw) {
  return raw.replace(/\/+$/, "");
}

/** Hosted projects use https://<ref>.supabase.co; local CLI often uses http://127.0.0.1:54321 */
function looksLikeSupabaseApiUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "127.0.0.1" || u.hostname === "localhost") return true;
    if (u.hostname.endsWith(".supabase.co")) return true;
    return false;
  } catch {
    return false;
  }
}

function explainBadAuthUrl(url) {
  console.error(`
NEXT_PUBLIC_SUPABASE_URL must point at your Supabase API host, not a web app or the Supabase dashboard.

  Good:  https://abcdefghijkl.supabase.co   (Dashboard → Project Settings → API → Project URL)
  Good:  http://127.0.0.1:54321             (local \`supabase start\`)
  Bad:   https://app.supabase.com/...
  Bad:   http://localhost:3000

Current value (after trim): ${url || "(empty)"}
`);
}

async function assertAuthHealthReturnsJson(baseUrl) {
  const healthUrl = `${normalizeProjectUrl(baseUrl)}/auth/v1/health`;
  let res;
  try {
    res = await fetch(healthUrl);
  } catch (e) {
    console.error(`Could not reach ${healthUrl}`);
    console.error(e.message || e);
    explainBadAuthUrl(baseUrl);
    process.exit(1);
  }
  const text = await res.text();
  const looksHtml = text.trimStart().toLowerCase().startsWith("<!doctype") || text.trimStart().startsWith("<html");
  if (looksHtml || !text.trim().startsWith("{")) {
    console.error(`Expected JSON from ${healthUrl} but got HTML or non-JSON (status ${res.status}).`);
    explainBadAuthUrl(baseUrl);
    process.exit(1);
  }
}

async function main() {
  loadEnvLocal();
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  let url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  if (!args.email || !args.password) {
    console.error("Provide --email and --password.");
    printHelp();
    process.exit(1);
  }

  if (!STAFF_ROLES.includes(args.role)) {
    console.error(`--role must be one of: ${STAFF_ROLES.join(", ")}`);
    process.exit(1);
  }

  url = normalizeProjectUrl(url);

  if (/app\.supabase\.com/i.test(url)) {
    console.error("NEXT_PUBLIC_SUPABASE_URL looks like the Supabase dashboard, not your project API URL.");
    explainBadAuthUrl(url);
    process.exit(1);
  }

  if (!looksLikeSupabaseApiUrl(url)) {
    console.warn(
      "Warning: URL does not look like *.supabase.co or localhost — if the next step fails, fix NEXT_PUBLIC_SUPABASE_URL.\n",
    );
  }

  await assertAuthHealthReturnsJson(url);

  const fullName =
    args.name?.trim() ||
    args.email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const admin = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let userId = await findUserIdByEmail(admin, args.email);

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: args.email,
      password: args.password,
      email_confirm: args.emailConfirm || args.confirmEmail,
      user_metadata: { full_name: fullName },
    });
    if (error) {
      console.error("createUser failed:", error.message);
      process.exit(1);
    }
    userId = data.user.id;
    console.log("Created auth user:", args.email);
  } else {
    const updatePayload = {
      password: args.password,
      user_metadata: { full_name: fullName },
    };
    if (args.confirmEmail) updatePayload.email_confirm = true;
    const { error } = await admin.auth.admin.updateUserById(userId, updatePayload);
    if (error) {
      console.error("updateUser (password/metadata) failed:", error.message);
      process.exit(1);
    }
    console.log("Updated existing auth user:", args.email);
  }

  const { data: existingProfile, error: profSelErr } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (profSelErr) {
    console.error("profiles select failed:", profSelErr.message);
    process.exit(1);
  }

  if (!existingProfile) {
    const { error: insErr } = await admin.from("profiles").insert({
      id: userId,
      role: args.role,
      full_name: fullName,
      is_active: true,
    });
    if (insErr) {
      console.error("profiles insert failed:", insErr.message);
      process.exit(1);
    }
    console.log("Inserted profile with role:", args.role);
  } else {
    const { error: upErr } = await admin
      .from("profiles")
      .update({ role: args.role, full_name: fullName, is_active: true })
      .eq("id", userId);
    if (upErr) {
      console.error("profiles update failed:", upErr.message);
      process.exit(1);
    }
    console.log("Updated profile role to:", args.role);
  }

  console.log("\nDone. Sign in at /login with this email.");
  if (!args.emailConfirm) {
    console.log("(Email confirmation is off for this user — OK for local dev.)");
  }
}

main().catch((e) => {
  const msg = `${e?.message ?? ""}${e?.originalError?.message ?? ""}`;
  if (/DOCTYPE|not valid JSON/i.test(msg)) {
    explainBadAuthUrl(normalizeProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ""));
  }
  console.error(e);
  process.exit(1);
});
