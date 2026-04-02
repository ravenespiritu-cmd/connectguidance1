"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CounselorUserMenu } from "@/components/counselor/CounselorUserMenu";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

const links = [{ href: "/counselor", label: "Dashboard" }] as const;

type CounselorSubnavProps = {
  userLabel?: string | null;
};

export function CounselorSubnav({ userLabel }: CounselorSubnavProps) {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-background/95 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] backdrop-blur supports-[backdrop-filter]:bg-background/80 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Link
            href="/counselor"
            className="hover:text-foreground text-muted-foreground group flex shrink-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2"
          >
            <span className="text-foreground text-sm font-semibold tracking-tight group-hover:text-teal-700 dark:group-hover:text-teal-300">
              GuidanceConnect
            </span>
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-teal-700/90 dark:text-teal-400/90">
              Counselor
            </span>
          </Link>
          <div className="bg-border hidden h-6 w-px sm:block" aria-hidden />
          <div className="flex flex-wrap gap-1">
            {links.map(({ href, label }) => {
              const active = pathname === href || (href === "/counselor" && pathname.startsWith("/counselor"));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    buttonVariants({ variant: active ? "secondary" : "ghost", size: "sm" }),
                    active && "font-medium text-teal-900 dark:text-teal-100",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
        <CounselorUserMenu userLabel={userLabel} />
      </div>
    </nav>
  );
}
