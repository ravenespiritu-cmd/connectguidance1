"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function initialsFromLabel(label: string) {
  const t = label.trim();
  if (!t) return "?";
  if (t.includes("@")) {
    const local = t.split("@")[0] ?? "";
    return (local.slice(0, 2) || "?").toUpperCase();
  }
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

export function StudentUserMenu({ userLabel: serverLabel }: { userLabel?: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState(serverLabel?.trim() ?? "");

  useEffect(() => {
    if (serverLabel?.trim()) return;
    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setLabel(user?.email ?? "");
      } catch {
        /* misconfigured env: keep placeholder label */
      }
    })();
  }, [serverLabel]);

  const display = label || "…";
  const avatarInitials = display === "…" ? "?" : initialsFromLabel(display);

  function logout() {
    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
        startTransition(() => {
          router.push("/login");
          router.refresh();
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Supabase is not configured correctly.");
      }
    })();
  }

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
      <Link
        href="/student/profile"
        className={cn(
          "flex min-w-0 max-w-[12rem] items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors sm:max-w-[14rem]",
          "hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        title="View your profile"
      >
        <span
          className={cn(
            "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            "bg-amber-500/15 text-amber-900 ring-1 ring-amber-500/25 dark:text-amber-100",
          )}
        >
          {avatarInitials}
        </span>
        <span className="text-foreground/90 max-w-[min(100%,9rem)] truncate text-sm font-medium sm:max-w-[10rem]" title={display}>
          {display}
        </span>
      </Link>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5 border-amber-500/35 hover:bg-amber-500/10"
        disabled={pending}
        onClick={logout}
      >
        <LogOut className="size-3.5 opacity-80" aria-hidden />
        Log out
      </Button>
    </div>
  );
}
