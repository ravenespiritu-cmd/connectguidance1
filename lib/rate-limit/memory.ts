type Bucket = {
  count: number;
  windowStart: number;
};

const buckets = new Map<string, Bucket>();

/** Periodic cleanup to avoid unbounded growth (serverless instances still benefit). */
let ops = 0;
const PRUNE_INTERVAL = 500;
const STALE_MULTIPLIER = 3;

function prune(now: number, typicalWindowMs: number) {
  const cutoff = now - typicalWindowMs * STALE_MULTIPLIER;
  for (const [key, b] of buckets) {
    if (b.windowStart < cutoff) buckets.delete(key);
  }
}

/**
 * Fixed-window limiter. On success, increments the counter for this window.
 * Set `RATE_LIMIT_DISABLED=true` in env to bypass (local dev only).
 */
export function consumeRateLimit(
  key: string,
  max: number,
  windowMs: number,
):
  | { ok: true; remaining: number; retryAfterSec: number }
  | { ok: false; remaining: 0; retryAfterSec: number } {
  if (process.env.RATE_LIMIT_DISABLED === "true") {
    return { ok: true, remaining: max, retryAfterSec: 0 };
  }

  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now - b.windowStart >= windowMs) {
    b = { count: 0, windowStart: now };
    buckets.set(key, b);
  }

  const windowEnd = b.windowStart + windowMs;
  const retryAfterSec = Math.max(1, Math.ceil((windowEnd - now) / 1000));

  if (b.count >= max) {
    ops += 1;
    if (ops % PRUNE_INTERVAL === 0) prune(now, windowMs);
    return { ok: false, remaining: 0, retryAfterSec };
  }

  b.count += 1;
  ops += 1;
  if (ops % PRUNE_INTERVAL === 0) prune(now, windowMs);

  return { ok: true, remaining: max - b.count, retryAfterSec: Math.max(0, Math.ceil((windowEnd - now) / 1000)) };
}
