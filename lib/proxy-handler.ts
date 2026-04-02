import { type NextRequest, NextResponse } from "next/server";

import {
  isAppRole,
  pathRequiresAdminRole,
  pathRequiresCounselorRole,
  pathRequiresStudentRole,
  ROLE_HOME,
  isAuthPagePath,
  type AppRole,
} from "@/lib/auth/routes";
import { updateSession } from "@/lib/supabase/middleware";

type ProfileGate = { role: AppRole | null; isActive: boolean };

/** True when @supabase/ssr likely stored a session (default `sb-*-auth-token*` cookies). */
function hasLikelySupabaseSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.includes("auth"),
  );
}

async function profileGate(
  supabase: Awaited<ReturnType<typeof updateSession>>["supabase"],
  userId: string,
): Promise<ProfileGate> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data?.role || !isAppRole(data.role)) {
    return { role: null, isActive: true };
  }

  return { role: data.role, isActive: data.is_active !== false };
}

/** Edge request guard (auth session + role redirects). Used from root `proxy.ts`. */
export async function runAppProxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const needsStudent = pathRequiresStudentRole(pathname);
  const needsAdmin = pathRequiresAdminRole(pathname);
  const needsCounselor = pathRequiresCounselorRole(pathname);
  const needsAuth = needsStudent || needsAdmin || needsCounselor;
  const publicEntry = pathname === "/" || isAuthPagePath(pathname);
  const hasSessionCookie = hasLikelySupabaseSessionCookie(request);

  if (pathname.startsWith("/api")) {
    const { response } = await updateSession(request);
    return response;
  }

  // No role-gated content: skip Supabase network (marketing pages, etc.)
  if (!needsAuth && !publicEntry) {
    return NextResponse.next();
  }

  // Signed-out visitors to /, /login, /register: no session refresh needed
  if (publicEntry && !hasSessionCookie) {
    return NextResponse.next();
  }

  // Protected routes without auth cookies: redirect immediately (no getUser round-trip)
  if (needsAuth && !hasSessionCookie) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  const { response, supabase, user } = await updateSession(request);

  if (publicEntry) {
    if (user) {
      const { role, isActive } = await profileGate(supabase, user.id);
      if (!isActive) {
        const onLoginDeactivated =
          pathname === "/login" && request.nextUrl.searchParams.get("error") === "deactivated";
        if (onLoginDeactivated) {
          return response;
        }
        return NextResponse.redirect(new URL("/login?error=deactivated", request.url));
      }
      if (!role) {
        const onLoginNoProfile =
          pathname === "/login" && request.nextUrl.searchParams.get("error") === "no_profile";
        if (onLoginNoProfile) {
          return response;
        }
        return NextResponse.redirect(new URL("/login?error=no_profile", request.url));
      }
      const home = ROLE_HOME[role];
      if (pathname !== home) {
        return NextResponse.redirect(new URL(home, request.url));
      }
    }
    return response;
  }

  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  const { role, isActive } = await profileGate(supabase, user.id);

  if (!isActive) {
    return NextResponse.redirect(new URL("/login?error=deactivated", request.url));
  }

  if (!role) {
    const login = new URL("/login", request.url);
    login.searchParams.set("error", "no_profile");
    return NextResponse.redirect(login);
  }

  if (needsAdmin && role !== "admin") {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }

  if (needsCounselor && role !== "counselor") {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }

  if (needsStudent && role !== "student") {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }

  return response;
}
