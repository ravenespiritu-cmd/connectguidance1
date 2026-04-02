import { NextResponse } from "next/server";
import { z } from "zod";

import { buildChatSystemPrompt } from "@/lib/chat/constants";
import { logAction } from "@/lib/audit";
import { limitChatPost } from "@/lib/rate-limit/chat";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(24_000),
});

const bodySchema = z.object({
  sessionId: z.string().uuid().optional().nullable(),
  messages: z.array(messageSchema).min(1).max(36),
  studentId: z.string().uuid(),
});

function sse(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function buildSystemPrompt(): string {
  return `${buildChatSystemPrompt()}

You are not a licensed clinician. Escalate to a human counselor when topics involve crisis, abuse, severe distress, or anything that needs individualized professional judgment. When escalation applies, clearly invite the student to book an appointment with campus counseling.`;
}

type AnthropicDeltaPayload = {
  type?: string;
  delta?: { type?: string; text?: string };
};

function extractAnthropicTextDelta(dataStr: string): string | null {
  if (!dataStr.startsWith("{")) return null;
  try {
    const j = JSON.parse(dataStr) as AnthropicDeltaPayload;
    if (j.type === "content_block_delta" && j.delta?.type === "text_delta" && typeof j.delta.text === "string") {
      return j.delta.text;
    }
  } catch {
    return null;
  }
  return null;
}

function extractOpenAIChatDelta(dataStr: string): string | null {
  if (dataStr === "[DONE]") return null;
  try {
    const j = JSON.parse(dataStr) as {
      choices?: Array<{ delta?: { content?: string } }>;
    };
    const piece = j.choices?.[0]?.delta?.content;
    if (typeof piece === "string" && piece.length > 0) return piece;
  } catch {
    return null;
  }
  return null;
}

function upstreamErrorMessage(kind: "groq" | "anthropic", status: number, bodyText: string): string {
  try {
    const j = JSON.parse(bodyText) as { error?: { message?: string } | string; message?: string };
    const inner = j.error;
    const m =
      typeof inner === "object" && inner && "message" in inner
        ? inner.message
        : typeof inner === "string"
          ? inner
          : j.message;
    if (typeof m === "string" && m.trim()) return m;
  } catch {
    /* ignore */
  }
  return `${kind === "groq" ? "Groq" : "Anthropic"} request failed (${status}).`;
}

export async function POST(req: Request) {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const useGroq = Boolean(groqKey);

  if (!groqKey && !anthropicKey) {
    return NextResponse.json(
      {
        error:
          "Chat is not configured. Set GROQ_API_KEY (Groq) or ANTHROPIC_API_KEY in your environment.",
      },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { sessionId, messages, studentId } = parsed.data;
  const last = messages[messages.length - 1];
  if (last.role !== "user") {
    return NextResponse.json({ error: "Last message must be from the user." }, { status: 400 });
  }

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (user.id !== studentId) {
      return NextResponse.json({ error: "studentId does not match the signed-in user." }, { status: 403 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || profile?.role !== "student" || profile.is_active === false) {
      return NextResponse.json({ error: "Only active students may use the assistant." }, { status: 403 });
    }

    if (sessionId) {
      const { data: owned } = await supabase
        .from("chatbot_sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("student_id", user.id)
        .maybeSingle();

      if (!owned) {
        return NextResponse.json({ error: "Invalid session." }, { status: 400 });
      }
    }

    const postLimit = limitChatPost(user.id);
    if (!postLimit.ok) {
      return NextResponse.json(
        { error: "Too many chat requests. Please wait a moment and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(postLimit.retryAfterSec) },
        },
      );
    }

    const system = buildSystemPrompt();
    let upstream: Response;

    if (useGroq) {
      upstream = await fetch(GROQ_API, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL,
          max_tokens: 4096,
          stream: true,
          messages: [
            { role: "system", content: system },
            ...messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          ],
        }),
      });
    } else {
      upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": anthropicKey!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 4096,
          stream: true,
          system,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
    }

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => "");
      const kind = useGroq ? "groq" : "anthropic";
      return NextResponse.json(
        { error: upstreamErrorMessage(kind, upstream.status, errText) },
        { status: upstream.status === 401 || upstream.status === 403 ? upstream.status : 502 },
      );
    }

    const encoder = new TextEncoder();
    let assistantText = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const reader = upstream.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            while (true) {
              const sep = buffer.indexOf("\n\n");
              if (sep === -1) break;
              const block = buffer.slice(0, sep);
              buffer = buffer.slice(sep + 2);

              for (const line of block.split("\n")) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data:")) continue;
                const dataStr = trimmed.slice(5).trim();
                if (!dataStr) continue;

                const piece = useGroq ? extractOpenAIChatDelta(dataStr) : extractAnthropicTextDelta(dataStr);
                if (piece) {
                  assistantText += piece;
                  controller.enqueue(encoder.encode(sse({ type: "text", text: piece })));
                }
              }
            }
          }

          const storedMessages = [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "assistant" as const, content: assistantText },
          ];

          let finalSessionId = sessionId ?? null;
          let persistError: string | null = null;

          if (finalSessionId) {
            const { error: upErr } = await supabase
              .from("chatbot_sessions")
              .update({ messages: storedMessages })
              .eq("id", finalSessionId)
              .eq("student_id", user.id);

            if (upErr) persistError = upErr.message;
          } else {
            const { data: inserted, error: insErr } = await supabase
              .from("chatbot_sessions")
              .insert({ student_id: user.id, messages: storedMessages })
              .select("id")
              .single();

            if (insErr || !inserted) persistError = insErr?.message ?? "Could not create session.";
            else finalSessionId = inserted.id;
          }

          if (persistError) {
            controller.enqueue(
              encoder.encode(
                sse({
                  type: "error",
                  message: "Could not save chat session.",
                  detail: persistError,
                }),
              ),
            );
          } else if (finalSessionId) {
            void logAction("CHAT_SESSION_UPSERT", {
              table_name: "chatbot_sessions",
              record_id: finalSessionId,
              turns: storedMessages.length,
            });
          }

          controller.enqueue(
            encoder.encode(
              sse({
                type: "done",
                sessionId: finalSessionId,
                showBookCta: false,
              }),
            ),
          );
        } catch (e) {
          const message = e instanceof Error ? e.message : "Chat stream failed.";
          controller.enqueue(encoder.encode(sse({ type: "error", message })));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
