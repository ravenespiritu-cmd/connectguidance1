import { consumeRateLimit } from "@/lib/rate-limit/memory";

function num(env: string | undefined, fallback: number) {
  const n = env ? Number.parseInt(env, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const FIFTEEN_MIN = 15 * 60 * 1000;

/** Limits chat completions per student (per Node instance). Defaults: 24 / 15 min. */
export function limitChatPost(userId: string) {
  const max = num(process.env.CHAT_RATE_LIMIT_MAX, 24);
  const windowMs = num(process.env.CHAT_RATE_LIMIT_WINDOW_MS, FIFTEEN_MIN);
  return consumeRateLimit(`chat:post:${userId}`, max, windowMs);
}

/** Limits session hydration GETs per student. Defaults: 60 / 15 min. */
export function limitChatSessionGet(userId: string) {
  const max = num(process.env.CHAT_SESSION_GET_MAX, 60);
  const windowMs = num(process.env.CHAT_SESSION_GET_WINDOW_MS, FIFTEEN_MIN);
  return consumeRateLimit(`chat:session:get:${userId}`, max, windowMs);
}
