import { NextResponse } from "next/server";

import { limitChatSessionGet } from "@/lib/rate-limit/chat";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Latest chat session for the signed-in student (for widget restore). */
export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "student" || profile.is_active === false) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const getLimit = limitChatSessionGet(user.id);
  if (!getLimit.ok) {
    return NextResponse.json(
      { error: "Too many session requests. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(getLimit.retryAfterSec) },
      },
    );
  }

  const { data: session, error } = await supabase
    .from("chatbot_sessions")
    .select("id, messages")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    sessionId: session?.id ?? null,
    messages: Array.isArray(session?.messages) ? session.messages : [],
  });
}
