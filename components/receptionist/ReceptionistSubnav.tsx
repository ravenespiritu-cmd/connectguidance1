"use client";

import { Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type ReceptionistSubnavProps = {
  userLabel?: string | null;
};

export function ReceptionistSubnav({ userLabel }: ReceptionistSubnavProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <nav className="border-b border-border/80 bg-background/90 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link
          href="/receptionist"
          className="group flex shrink-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2"
        >
          <span className="text-foreground text-sm font-semibold tracking-tight group-hover:text-violet-800 dark:group-hover:text-violet-200">
            GuidanceConnect
          </span>
          <span className="inline-flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-violet-700/95 dark:text-violet-300/95">
            <Building2 className="size-3 opacity-90" aria-hidden />
            Reception
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {userLabel ? (
            <span className="text-muted-foreground max-w-[14rem] truncate text-sm">{userLabel}</span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-violet-500/30 hover:bg-violet-500/10"
            disabled={pending}
            onClick={() => {
              void (async () => {
                try {
                  await fetch("/api/auth/signout", { method: "POST" });
                  toast.message("Signed out");
                  startTransition(() => {
                    router.replace("/");
                    router.refresh();
                  });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed to sign out.");
                  router.replace("/");
                }
              })();
            }}
          >
            Log out
          </Button>
        </div>
      </div>
    </nav>
  );
}
