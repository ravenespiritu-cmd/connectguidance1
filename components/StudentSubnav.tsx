"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { StudentUserMenu } from "@/components/student/StudentUserMenu";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

const links = [
  { href: "/student", label: "Dashboard" },
  { href: "/student/front-desk", label: "Front desk" },
  { href: "/appointments", label: "Appointments" },
  { href: "/chatbot", label: "Chat" },
] as const;

type StudentSubnavProps = {
  /** Shown next to log out; falls back to email on the client if omitted */
  userLabel?: string | null;
};

export function StudentSubnav({ userLabel }: StudentSubnavProps) {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-background/95 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] backdrop-blur supports-[backdrop-filter]:bg-background/80 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)]">
      <div className="mx-auto max-w-4xl space-y-3 px-4 py-3 sm:space-y-3.5 sm:px-6 sm:py-4">
        {/* Brand + account: one row so long names never squeeze the nav pills */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/student"
            className="hover:text-foreground text-muted-foreground group flex min-w-0 shrink items-baseline gap-2"
          >
            <span className="text-foreground truncate text-sm font-semibold tracking-tight group-hover:text-amber-700 dark:group-hover:text-amber-300">
              GuidanceConnect
            </span>
            <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-amber-700/90 dark:text-amber-400/90">
              Student
            </span>
          </Link>
          <StudentUserMenu userLabel={userLabel} />
        </div>

        {/* Full-width nav: nowrap + optional horizontal scroll on very narrow viewports */}
        <div
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:px-0"
          role="navigation"
          aria-label="Student sections"
        >
          {links.map(({ href, label }) => {
            const active =
              pathname === href || (href !== "/student" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  buttonVariants({ variant: active ? "secondary" : "ghost", size: "sm" }),
                  "shrink-0 whitespace-nowrap",
                  active && "font-medium text-amber-900 dark:text-amber-100",
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
