"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

const links = [{ href: "/counselor", label: "Dashboard" }] as const;

export function CounselorSubnav() {
  const pathname = usePathname();

  return (
    <nav className="bg-background/95 supports-[backdrop-filter]:bg-background/80 border-b backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 px-4 py-3 sm:gap-2 sm:px-6">
        <span className="text-muted-foreground px-2 text-xs font-medium tracking-wide uppercase sm:text-sm">
          Counselor
        </span>
        {links.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                buttonVariants({ variant: active ? "secondary" : "ghost", size: "sm" }),
                active && "text-teal-900 dark:text-teal-100",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
