"use client";

import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { shortDisplayName } from "@/lib/short-display-name";
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

type Props = {
  /** Profile full name from server (preferred). Email is not shown in the nav. */
  userLabel?: string | null;
};

export function AdminUserMenu({ userLabel: serverLabel }: Props) {
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
        if (!user) return;
        const { data: row } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
        setLabel(row?.full_name?.trim() ?? "");
      } catch {
        /* keep placeholder */
      }
    })();
  }, [serverLabel]);

  const raw = label.trim();
  const compactNav = raw ? shortDisplayName(raw) : "…";
  const avatarInitials = raw ? initialsFromLabel(raw) : "?";

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
        toast.error(e instanceof Error ? e.message : "Could not sign out.");
      }
    })();
  }

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
      <Link
        href="/admin/profile"
        className={cn(
          "flex min-w-0 max-w-[11rem] items-center gap-2 rounded-lg px-2 py-1.5 outline-none sm:max-w-[14rem]",
          "text-muted-foreground transition-colors",
          "hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        title={raw ? `Profile — ${raw}` : "Your profile"}
      >
        <span
          className={cn(
            "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            "bg-blue-500/15 text-blue-900 ring-1 ring-blue-500/25 dark:text-blue-100",
          )}
        >
          {avatarInitials === "?" ? <User className="size-4 opacity-80" aria-hidden /> : avatarInitials}
        </span>
        <span className="truncate text-sm font-medium text-foreground/90">{compactNav}</span>
      </Link>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5 border-blue-500/35 hover:bg-blue-500/10"
        disabled={pending}
        onClick={logout}
      >
        <LogOut className="size-3.5 opacity-80" aria-hidden />
        Log out
      </Button>
    </div>
  );
}
