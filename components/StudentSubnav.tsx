"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { StudentUserMenu } from "@/components/student/StudentUserMenu";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

const links = [
  { href: "/student", label: "Dashboard" },
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
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Link
            href="/student"
            className="hover:text-foreground text-muted-foreground group flex shrink-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2"
          >
            <span className="text-foreground text-sm font-semibold tracking-tight group-hover:text-amber-700 dark:group-hover:text-amber-300">
              GuidanceConnect
            </span>
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-amber-700/90 dark:text-amber-400/90">
              Student
            </span>
          </Link>
          <div className="bg-border hidden h-6 w-px sm:block" aria-hidden />
          <div className="flex flex-wrap gap-1">
            {links.map(({ href, label }) => {
              const active =
                pathname === href || (href !== "/student" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    buttonVariants({ variant: active ? "secondary" : "ghost", size: "sm" }),
                    active && "font-medium text-amber-900 dark:text-amber-100",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
        <StudentUserMenu userLabel={userLabel} />
      </div>
    </nav>
  );
}
