"use client";

import Link from "next/link";
import { MessageCircleIcon, PlusIcon, SendIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant";

type ChatMessage = { role: ChatRole; content: string };

/** Client-side CTA detection per product spec (message text after stream completes). */
const CHAT_CTA_KEYWORDS = ["counselor", "talk to someone", "help me", "appointment"] as const;

export function messageSuggestsBooking(text: string): boolean {
  const lower = text.toLowerCase();
  return CHAT_CTA_KEYWORDS.some((k) => lower.includes(k));
}

function normalizeChatMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (r.role !== "user" && r.role !== "assistant") continue;
    if (typeof r.content !== "string" || !r.content.trim()) continue;
    out.push({ role: r.role, content: r.content });
  }
  return out;
}

async function consumeChatStream(
  body: { sessionId: string | null; messages: ChatMessage[]; studentId: string },
  onText: (chunk: string) => void,
): Promise<{ sessionId: string | null }> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Request failed (${res.status})`);
  }

  if (!res.body) throw new Error("No response body.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sessionId: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const block of parts) {
      const line = block.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      let data: {
        type?: string;
        text?: string;
        sessionId?: string | null;
        message?: string;
      };
      try {
        data = JSON.parse(payload) as typeof data;
      } catch {
        continue;
      }

      if (data.type === "text" && data.text) {
        onText(data.text);
      }
      if (data.type === "done") {
        sessionId = data.sessionId ?? null;
      }
      if (data.type === "error") {
        throw new Error(data.message ?? "Chat error");
      }
    }
  }

  return { sessionId };
}

type ChatbotWidgetProps = {
  studentId: string;
};

export function ChatbotWidget({ studentId }: ChatbotWidgetProps) {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const [showBookCta, setShowBookCta] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;
  const hydrateNonceRef = useRef(0);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streaming, scrollToBottom]);

  useEffect(() => {
    if (!open) return;
    const nonce = hydrateNonceRef.current;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/chat/session", { credentials: "include" });
        if (!res.ok || cancelled || nonce !== hydrateNonceRef.current) return;
        const data = (await res.json()) as { sessionId: string | null; messages: unknown };
        if (cancelled || nonce !== hydrateNonceRef.current) return;
        if (messagesRef.current.length > 0) return;
        const norm = normalizeChatMessages(data.messages);
        if (norm.length === 0) return;
        if (nonce !== hydrateNonceRef.current) return;
        setSessionId(data.sessionId);
        setMessages(norm);
        const lastUser = [...norm].reverse().find((m) => m.role === "user");
        const lastAsst = [...norm].reverse().find((m) => m.role === "assistant");
        setShowBookCta(
          messageSuggestsBooking(lastAsst?.content ?? "") || messageSuggestsBooking(lastUser?.content ?? ""),
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  function startNewConversation() {
    if (busy) return;
    hydrateNonceRef.current += 1;
    setSessionId(null);
    setMessages([]);
    setDraft("");
    setStreaming("");
    setShowBookCta(false);
    toast.message("New conversation — your next message starts a fresh saved chat.");
  }

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;

    const prevSnapshot = messages;
    const nextMessages: ChatMessage[] = [...prevSnapshot, { role: "user", content: text }];
    setMessages(nextMessages);
    setDraft("");
    setStreaming("");
    setBusy(true);
    setShowBookCta(false);

    let accumulated = "";
    try {
      const { sessionId: sid } = await consumeChatStream(
        { sessionId, messages: nextMessages, studentId },
        (chunk) => {
          accumulated += chunk;
          setStreaming(accumulated);
        },
      );

      setMessages([...nextMessages, { role: "assistant", content: accumulated }]);
      setStreaming("");
      if (sid) setSessionId(sid);
      setShowBookCta(messageSuggestsBooking(accumulated));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      toast.error(msg);
      setMessages(prevSnapshot);
      setStreaming("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        aria-expanded={open}
        aria-controls="guidance-chat-panel"
        className={cn(
          "fixed right-4 bottom-4 z-40 h-12 rounded-full bg-amber-600 px-4 text-white shadow-lg hover:bg-amber-700",
          open && "ring-2 ring-amber-300",
        )}
        onClick={() => setOpen((o) => !o)}
      >
        <MessageCircleIcon className="mr-2 size-5" />
        Guidance assistant
      </Button>

      {open ? (
        <div
          id="guidance-chat-panel"
          role="dialog"
          aria-modal={false}
          aria-label="Guidance assistant chat"
          className="bg-card border-border fixed right-4 bottom-20 z-50 flex max-h-[min(85vh,640px)] w-[calc(100%-2rem)] max-w-lg flex-col overflow-hidden rounded-xl border shadow-2xl"
        >
          <div className="border-border flex shrink-0 items-start justify-between gap-2 border-b px-4 py-3">
            <div>
              <h2 className="text-base font-semibold">Guidance assistant</h2>
              <p className="text-muted-foreground text-xs">
                Supportive tips — not a substitute for a licensed counselor. In an emergency, call your local emergency
                number.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                disabled={busy}
                onClick={startNewConversation}
              >
                <PlusIcon className="size-3.5" />
                New
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-[220px] flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.length === 0 && !streaming ? (
                <p className="text-muted-foreground text-sm">
                  Ask about study habits, stress, or campus resources. I can also help you decide when to book time with a
                  human counselor.
                </p>
              ) : null}
              {messages.map((m, i) => (
                <div
                  key={`${i}-${m.role}-${m.content.slice(0, 12)}`}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm",
                    m.role === "user" ? "bg-amber-500/15 ml-6" : "bg-muted mr-6",
                  )}
                >
                  <p className="text-muted-foreground mb-1 text-[10px] font-medium uppercase">
                    {m.role === "user" ? "You" : "Assistant"}
                  </p>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
              {streaming ? (
                <div className="bg-muted mr-6 rounded-lg px-3 py-2 text-sm">
                  <p className="text-muted-foreground mb-1 text-[10px] font-medium uppercase">Assistant</p>
                  <p className="whitespace-pre-wrap">{streaming}</p>
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>

            {showBookCta ? (
              <div className="border-border bg-amber-500/10 shrink-0 border-t px-4 py-2">
                <p className="text-muted-foreground mb-2 text-xs">Want to speak with someone in person?</p>
                <Link
                  href="/appointments"
                  className={cn(buttonVariants({ size: "sm" }), "bg-amber-600 text-white hover:bg-amber-700")}
                >
                  Book an appointment
                </Link>
              </div>
            ) : null}

            <div className="border-border flex shrink-0 gap-2 border-t p-3">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                disabled={busy}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                size="icon"
                className="shrink-0 bg-amber-600 text-white hover:bg-amber-700"
                disabled={busy || !draft.trim()}
                onClick={() => void send()}
                aria-label="Send"
              >
                <SendIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default ChatbotWidget;
