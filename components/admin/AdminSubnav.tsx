"use client";

import { BarChart3, ClipboardList, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AdminUserMenu } from "@/components/admin/AdminUserMenu";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/audit-logs", label: "Audit logs", icon: ClipboardList },
] as const;

type AdminSubnavProps = {
  userLabel?: string | null;
};

export function AdminSubnav({ userLabel }: AdminSubnavProps = {}) {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-30 border-b border-border/80 bg-background/75 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 supports-[backdrop-filter]:backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 sm:gap-2">
          <span className="text-muted-foreground flex items-center gap-2 px-2 text-xs font-semibold tracking-wider uppercase sm:text-[0.8125rem]">
            <span className="bg-primary/15 text-primary inline-flex size-6 items-center justify-center rounded-md text-[0.65rem] font-bold">
              A
            </span>
            Admin
          </span>
          <div className="bg-border mx-1 hidden h-6 w-px sm:block" aria-hidden />
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  buttonVariants({ variant: active ? "secondary" : "ghost", size: "sm" }),
                  "gap-2 rounded-full",
                  active
                    ? "bg-primary/12 text-foreground ring-1 shadow-sm ring-blue-500/25 dark:bg-primary/18 dark:ring-blue-400/30"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
                {label}
              </Link>
            );
          })}
        </div>
        <AdminUserMenu userLabel={userLabel} />
      </div>
    </nav>
  );
}
