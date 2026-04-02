import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { consumeRateLimit } from "@/lib/rate-limit/memory";

describe("consumeRateLimit", () => {
  const WINDOW_MS = 60_000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T12:00:00.000Z"));
    delete process.env.RATE_LIMIT_DISABLED;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.RATE_LIMIT_DISABLED;
  });

  it("allows requests up to max, then rejects until window rolls", () => {
    const key = "test-window-1";
    expect(consumeRateLimit(key, 3, WINDOW_MS)).toMatchObject({ ok: true, remaining: 2 });
    expect(consumeRateLimit(key, 3, WINDOW_MS)).toMatchObject({ ok: true, remaining: 1 });
    expect(consumeRateLimit(key, 3, WINDOW_MS)).toMatchObject({ ok: true, remaining: 0 });

    const blocked = consumeRateLimit(key, 3, WINDOW_MS);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1);

    vi.advanceTimersByTime(WINDOW_MS);
    expect(consumeRateLimit(key, 3, WINDOW_MS)).toMatchObject({ ok: true, remaining: 2 });
  });

  it("isolates keys", () => {
    expect(consumeRateLimit("a", 1, WINDOW_MS).ok).toBe(true);
    expect(consumeRateLimit("a", 1, WINDOW_MS).ok).toBe(false);
    expect(consumeRateLimit("b", 1, WINDOW_MS).ok).toBe(true);
  });

  it("when RATE_LIMIT_DISABLED=true, always allows", () => {
    process.env.RATE_LIMIT_DISABLED = "true";
    const key = "disabled-key";
    for (let i = 0; i < 50; i++) {
      expect(consumeRateLimit(key, 1, WINDOW_MS)).toMatchObject({
        ok: true,
        remaining: 1,
        retryAfterSec: 0,
      });
    }
  });
});
