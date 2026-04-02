import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { readPublicSupabaseEnv } from "@/lib/supabase/public-env";
import { isAppRole, ROLE_HOME, type AppRole } from "@/lib/auth/routes";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type SignInResponse =
  | { ok: true; role: AppRole; destination: string }
  | { ok: false; reason: "deactivated" | "no_profile" | "invalid_credentials" };

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_credentials" } satisfies SignInResponse, {
      status: 400,
    });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid_credentials" } satisfies SignInResponse, {
      status: 400,
    });
  }

  const env = readPublicSupabaseEnv();
  const cookieStore = await cookies();

  const response = NextResponse.json({ ok: false, reason: "invalid_credentials" } satisfies SignInResponse, {
    status: 200,
  });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Ensure Supabase can read updated cookies in the rest of this request.
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInError || !signInData.user) {
    return NextResponse.json({ ok: false, reason: "invalid_credentials" } satisfies SignInResponse, {
      status: 401,
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", signInData.user.id)
    .maybeSingle();

  if (profileError || !profile?.role || !isAppRole(profile.role)) {
    return NextResponse.json({ ok: false, reason: "no_profile" } satisfies SignInResponse, { status: 400 });
  }

  if (profile.is_active === false) {
    return NextResponse.json({ ok: false, reason: "deactivated" } satisfies SignInResponse, { status: 403 });
  }

  const destination = ROLE_HOME[profile.role];
  return NextResponse.json({ ok: true, role: profile.role, destination } satisfies SignInResponse, {
    status: 200,
  });
}

