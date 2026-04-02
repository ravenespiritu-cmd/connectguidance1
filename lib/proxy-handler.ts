import type { User } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import {
  isAppRole,
  pathRequiresAdminRole,
  pathRequiresCounselorRole,
  pathRequiresReceptionistRole,
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

/**
 * Loads role from `profiles`, falling back to `user.user_metadata.role` when the profile row is missing or invalid.
 */
async function resolveRole(
  supabase: Awaited<ReturnType<typeof updateSession>>["supabase"],
  user: User,
): Promise<ProfileGate> {
  let metaRole: string | null = null;
  const meta = user.user_metadata;
  if (meta && typeof meta === "object" && "role" in meta) {
    const r = (meta as Record<string, unknown>).role;
    if (typeof r === "string") metaRole = r;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return {
      role: metaRole && isAppRole(metaRole) ? metaRole : null,
      isActive: true,
    };
  }

  const profileRole = data.role && isAppRole(data.role) ? data.role : null;
  const role = profileRole ?? (metaRole && isAppRole(metaRole) ? metaRole : null);

  return { role, isActive: data.is_active !== false };
}

/**
 * Edge guard: Supabase session + role-based redirects.
 * Skips auth redirects for `/login`, `/register`, and `/api/chat` (API routes only refresh cookies here).
 */
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
  const needsReceptionist = pathRequiresReceptionistRole(pathname);
  const needsAuth = needsStudent || needsAdmin || needsCounselor || needsReceptionist;
  const publicEntry = pathname === "/" || isAuthPagePath(pathname);
  const hasSessionCookie = hasLikelySupabaseSessionCookie(request);

  if (pathname.startsWith("/api")) {
    const { response } = await updateSession(request);
    return response;
  }

  if (!needsAuth && !publicEntry) {
    return NextResponse.next();
  }

  if (publicEntry && !hasSessionCookie) {
    return NextResponse.next();
  }

  if (needsAuth && !hasSessionCookie) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  const { response, supabase, user } = await updateSession(request);

  if (publicEntry) {
    if (user) {
      const { role, isActive } = await resolveRole(supabase, user);
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

  const { role, isActive } = await resolveRole(supabase, user);

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

  if (needsReceptionist && role !== "receptionist") {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }

  if (needsStudent && role !== "student") {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }

  return response;
}
