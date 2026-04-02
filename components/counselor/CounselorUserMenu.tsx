"use client";

import { LogOut } from "lucide-react";
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

export function CounselorUserMenu({ userLabel: serverLabel }: { userLabel?: string | null }) {
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
        /* misconfigured env */
      }
    })();
  }, [serverLabel]);

  const display = label || "…";
  const avatarInitials = display === "…" ? "?" : initialsFromLabel(display);

  function logout() {
    void (async () => {
      try {
        const res = await fetch("/api/auth/signout", { method: "POST" });
        if (!res.ok) throw new Error("Sign out failed");
        startTransition(() => {
          router.push("/");
          router.refresh();
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to sign out.");
      }
    })();
  }

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
      <div
        className={cn(
          "flex min-w-0 max-w-[12rem] items-center gap-2 rounded-lg px-2 py-1.5 sm:max-w-[14rem]",
          "text-foreground/90",
        )}
        title={display}
      >
        <span
          className={cn(
            "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            "bg-teal-500/15 text-teal-900 ring-1 ring-teal-500/25 dark:text-teal-100",
          )}
        >
          {avatarInitials}
        </span>
        <span className="max-w-[min(100%,9rem)] truncate text-sm font-medium sm:max-w-[10rem]">{display}</span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5 border-teal-500/35 hover:bg-teal-500/10"
        disabled={pending}
        onClick={logout}
      >
        <LogOut className="size-3.5 opacity-80" aria-hidden />
        Log out
      </Button>
    </div>
  );
}
