#!/usr/bin/env node
/**
 * Seed (or update) the primary admin account from environment variables.
 * Uses seed-staff.mjs with --confirm-email so the address is marked confirmed in Auth
 * (avoids "Email not confirmed" when that setting is enabled in Supabase).
 *
 * Set in .env.local (gitignored):
 *   SEED_ADMIN_EMAIL=admin@your-school.edu
 *   SEED_ADMIN_PASSWORD=...
 * Optional:
 *   SEED_ADMIN_NAME=Site Administrator
 *
 * Run: npm run seed:admin
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import { spawnSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

function main() {
  loadEnvLocal();

  const email = process.env.SEED_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim();

  if (!email || !password) {
    console.error(
      "Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD. Add them to .env.local (see .env.example), then run: npm run seed:admin",
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("SEED_ADMIN_PASSWORD must be at least 8 characters (same rule as /login).");
    process.exit(1);
  }

  const seedStaff = join(__dirname, "seed-staff.mjs");
  const args = [
    seedStaff,
    "--email",
    email,
    "--password",
    password,
    "--role",
    "admin",
    "--confirm-email",
  ];
  if (name) {
    args.push("--name", name);
  }

  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
  });

  process.exit(result.status ?? 1);
}

main();
