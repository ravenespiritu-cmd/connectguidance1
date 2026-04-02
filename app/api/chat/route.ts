import Groq, { APIError } from "groq-sdk";
import { NextResponse } from "next/server";
import { z } from "zod";

import { buildChatSystemPrompt, CHAT_MODEL } from "@/lib/chat/constants";
import { shouldSuggestAppointment } from "@/lib/chat/cta";
import { logAction } from "@/lib/audit";
import { limitChatPost } from "@/lib/rate-limit/chat";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(24_000),
});

const bodySchema = z.object({
  sessionId: z.string().uuid().optional().nullable(),
  messages: z.array(messageSchema).min(1).max(36),
});

function sse(data: Record<string, unknown>) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function groqErrorMessage(e: unknown): string {
  if (e instanceof APIError && e.error && typeof e.error === "object") {
    const body = e.error as { error?: { message?: string }; message?: string };
    const nested = body.error?.message;
    const top = body.message;
    const msg = typeof nested === "string" && nested.trim() ? nested : top;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return e instanceof Error ? e.message : "Chat request failed.";
}

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "Chat is not configured (missing GROQ_API_KEY)." }, { status: 503 });
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

  const { sessionId, messages } = parsed.data;
  const last = messages[messages.length - 1];
  if (last.role !== "user") {
    return NextResponse.json({ error: "Last message must be from the user." }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  let stream: Awaited<ReturnType<Groq["chat"]["completions"]["create"]>>;
  try {
    stream = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: buildChatSystemPrompt() },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      max_tokens: 4096,
      stream: true,
    });
  } catch (e) {
    return NextResponse.json({ error: groqErrorMessage(e) }, { status: 502 });
  }

  const lastUserContent = last.content;
  const encoder = new TextEncoder();
  let assistantText = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const piece = chunk.choices[0]?.delta?.content ?? "";
          if (piece) {
            assistantText += piece;
            controller.enqueue(encoder.encode(sse({ type: "text", text: piece })));
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
              sse({ type: "error", message: "Could not save chat session.", detail: persistError }),
            ),
          );
        } else if (finalSessionId) {
          try {
            await logAction({
              action: "chat_completion",
              table_name: "chatbot_sessions",
              record_id: finalSessionId,
              metadata: { turns: storedMessages.length },
            });
          } catch {
            /* non-fatal */
          }
        }

        const showBookCta =
          shouldSuggestAppointment(assistantText) || shouldSuggestAppointment(lastUserContent);

        controller.enqueue(
          encoder.encode(
            sse({
              type: "done",
              sessionId: finalSessionId,
              showBookCta,
            }),
          ),
        );
      } catch (e) {
        controller.enqueue(encoder.encode(sse({ type: "error", message: groqErrorMessage(e) })));
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
}
