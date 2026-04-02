"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { shortDisplayName } from "@/lib/short-display-name";
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
  const compactLabel = display === "…" ? "…" : shortDisplayName(display);
  const avatarInitials = display === "…" ? "?" : initialsFromLabel(display);

  function logout() {
    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
        startTransition(() => {
          router.push("/");
          router.refresh();
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Supabase is not configured correctly.");
      }
    })();
  }

  return (
    <div className="flex max-w-[min(100%,20rem)] shrink-0 items-center justify-end gap-1.5 sm:max-w-none sm:gap-3">
      <Link
        href="/student/profile"
        className={cn(
          "flex min-w-0 max-w-[calc(100%-5.5rem)] items-center gap-2 rounded-lg py-1.5 pl-1 pr-1.5 outline-none transition-colors sm:max-w-[13rem] sm:px-2",
          "hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        title={display === "…" ? "View your profile" : `Profile — ${display}`}
      >
        <span
          className={cn(
            "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            "bg-amber-500/15 text-amber-900 ring-1 ring-amber-500/25 dark:text-amber-100",
          )}
        >
          {avatarInitials}
        </span>
        <span
          className="text-foreground/90 min-w-0 flex-1 truncate text-left text-sm font-medium"
          title={display === "…" ? undefined : display}
        >
          {compactLabel}
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
