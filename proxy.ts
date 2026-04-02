import type { NextRequest } from "next/server";

import { runAppProxy } from "@/lib/proxy-handler";

/**
 * Root proxy (Next.js 16+ convention). Session refresh + role redirects via Supabase cookies.
 */
export async function proxy(request: NextRequest) {
  return runAppProxy(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
