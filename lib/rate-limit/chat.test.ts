import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { limitChatPost, limitChatSessionGet } from "@/lib/rate-limit/chat";

describe("chat rate limits", () => {
  beforeEach(() => {
    vi.stubEnv("CHAT_RATE_LIMIT_MAX", "2");
    vi.stubEnv("CHAT_RATE_LIMIT_WINDOW_MS", "900000");
    vi.stubEnv("CHAT_SESSION_GET_MAX", "2");
    vi.stubEnv("CHAT_SESSION_GET_WINDOW_MS", "900000");
    delete process.env.RATE_LIMIT_DISABLED;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.RATE_LIMIT_DISABLED;
  });

  it("limitChatPost uses env-tuned max", () => {
    const uid = "student-chat-post-test";
    expect(limitChatPost(uid).ok).toBe(true);
    expect(limitChatPost(uid).ok).toBe(true);
    expect(limitChatPost(uid).ok).toBe(false);
  });

  it("limitChatSessionGet uses separate bucket from post", () => {
    const uid = "student-session-test";
    expect(limitChatPost(uid).ok).toBe(true);
    expect(limitChatPost(uid).ok).toBe(true);
    expect(limitChatPost(uid).ok).toBe(false);

    expect(limitChatSessionGet(uid).ok).toBe(true);
    expect(limitChatSessionGet(uid).ok).toBe(true);
    expect(limitChatSessionGet(uid).ok).toBe(false);
  });
});
