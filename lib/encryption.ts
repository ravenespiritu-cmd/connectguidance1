import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PREFIX = "gc:v1:";
const ALG = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKeyBuffer(): Buffer {
  const raw = process.env.CASE_NOTES_ENCRYPTION_KEY;
  if (!raw?.trim()) {
    throw new Error("CASE_NOTES_ENCRYPTION_KEY is not set (32-byte key as 64 hex chars or base64)");
  }

  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  const buf = Buffer.from(trimmed, "base64");
  if (buf.length !== 32) {
    throw new Error("CASE_NOTES_ENCRYPTION_KEY (base64) must decode to exactly 32 bytes");
  }
  return buf;
}

/** AES-256-GCM; stored as `gc:v1:` + base64url(iv || ciphertext || auth_tag). */
export async function encryptCaseNoteContent(plainText: string): Promise<string> {
  const iv = randomBytes(IV_LENGTH);
  const key = getKeyBuffer();
  const cipher = createCipheriv(ALG, key, iv, { authTagLength: TAG_LENGTH });
  const enc = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, enc, tag]);
  return PREFIX + combined.toString("base64url");
}

export async function decryptCaseNoteContent(cipherText: string): Promise<string> {
  const trimmed = cipherText.trim();
  if (!trimmed.startsWith(PREFIX)) {
    return trimmed;
  }

  const b64 = trimmed.slice(PREFIX.length);
  let combined: Buffer;
  try {
    combined = Buffer.from(b64, "base64url");
  } catch {
    throw new Error("Invalid encrypted case note payload");
  }

  if (combined.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Encrypted case note payload too short");
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(combined.length - TAG_LENGTH);
  const enc = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);
  const key = getKeyBuffer();

  const decipher = createDecipheriv(ALG, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
  return plain.toString("utf8");
}
