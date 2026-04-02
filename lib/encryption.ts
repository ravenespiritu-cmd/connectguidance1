/**
 * Server-only encryption for case notes. Do not import from client components.
 * New format: AES-256-CBC, 16-byte IV prepended as hex, ciphertext as hex (`ivHex + cipherHex`).
 * Legacy format: prefix `gc:v1:` + AES-256-GCM (base64url) for existing rows.
 */
import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const LEGACY_PREFIX = "gc:v1:";
/** 16-byte IV encoded as 32 hex characters. */
const CBC_IV_HEX_CHARS = 32;
const ALG_CBC = "aes-256-cbc";
const ALG_GCM = "aes-256-gcm";
const GCM_IV_LENGTH = 12;
const GCM_TAG_LENGTH = 16;

function loadKeyHexOrThrow(): Buffer {
  const raw = (process.env.ENCRYPTION_KEY ?? process.env.CASE_NOTES_ENCRYPTION_KEY ?? "").trim();
  if (!raw) {
    throw new Error("ENCRYPTION_KEY is not set (64 hex characters = 32 bytes)");
  }
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error("ENCRYPTION_KEY must be exactly 64 hexadecimal characters");
  }
  return Buffer.from(raw, "hex");
}

function getLegacyKeyBuffer(): Buffer {
  const raw = (process.env.ENCRYPTION_KEY ?? process.env.CASE_NOTES_ENCRYPTION_KEY ?? "").trim();
  if (!raw) {
    throw new Error("ENCRYPTION_KEY is not set");
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("Legacy key (base64) must decode to exactly 32 bytes");
  }
  return buf;
}

/** AES-256-CBC; output is IV (hex) immediately followed by ciphertext (hex). */
export function encrypt(text: string): string {
  const key = loadKeyHexOrThrow();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALG_CBC, key, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return iv.toString("hex") + enc.toString("hex");
}

function decryptCbcHex(payload: string): string {
  const trimmed = payload.trim();
  if (trimmed.length <= CBC_IV_HEX_CHARS || trimmed.length % 2 !== 0) {
    throw new Error("Invalid ciphertext (hex length)");
  }
  const iv = Buffer.from(trimmed.slice(0, CBC_IV_HEX_CHARS), "hex");
  const enc = Buffer.from(trimmed.slice(CBC_IV_HEX_CHARS), "hex");
  const key = loadKeyHexOrThrow();
  const decipher = createDecipheriv(ALG_CBC, key, iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

function decryptLegacyGcm(cipherText: string): string {
  const b64 = cipherText.slice(LEGACY_PREFIX.length);
  let combined: Buffer;
  try {
    combined = Buffer.from(b64, "base64url");
  } catch {
    throw new Error("Invalid encrypted case note payload");
  }
  if (combined.length < GCM_IV_LENGTH + GCM_TAG_LENGTH) {
    throw new Error("Encrypted case note payload too short");
  }
  const iv = combined.subarray(0, GCM_IV_LENGTH);
  const tag = combined.subarray(combined.length - GCM_TAG_LENGTH);
  const enc = combined.subarray(GCM_IV_LENGTH, combined.length - GCM_TAG_LENGTH);
  const key = getLegacyKeyBuffer();
  const decipher = createDecipheriv(ALG_GCM, key, iv, { authTagLength: GCM_TAG_LENGTH });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

/** Decrypts CBC hex payloads or legacy `gc:v1:` GCM payloads. */
export function decrypt(data: string): string {
  const trimmed = data.trim();
  if (trimmed.startsWith(LEGACY_PREFIX)) {
    return decryptLegacyGcm(trimmed);
  }
  return decryptCbcHex(trimmed);
}
