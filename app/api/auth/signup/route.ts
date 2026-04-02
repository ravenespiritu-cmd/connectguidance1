import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { readPublicSupabaseEnv } from "@/lib/supabase/public-env";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1).max(200),
  student_id: z.string().min(1).max(100),
  department: z.string().min(1).max(200),
});

type SignUpResponse =
  | { ok: true; message: string; hasSession: boolean }
  | { ok: false; message: string };

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." } satisfies SignUpResponse, {
      status: 400,
    });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid form values." } satisfies SignUpResponse,
      { status: 400 },
    );
  }

  const env = readPublicSupabaseEnv();
  const cookieStore = await cookies();

  const response = NextResponse.json({ ok: false, message: "" } satisfies SignUpResponse, {
    status: 200,
  });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.full_name,
        student_id: parsed.data.student_id,
        department: parsed.data.department,
      },
    },
  });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message } satisfies SignUpResponse, {
      status: 400,
    });
  }

  const user = data.user;
  if (!user) {
    return NextResponse.json({ ok: false, message: "Check your email for confirmation." } satisfies SignUpResponse, {
      status: 200,
    });
  }

  const hasSession = Boolean(data.session);
  return NextResponse.json(
    {
      ok: true,
      message: hasSession ? "Welcome! Your student account is ready." : "Confirm your email, then sign in.",
      hasSession,
    } satisfies SignUpResponse,
    { status: 200 },
  );
}

