import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type AuthPageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthPageShell({ title, description, children }: AuthPageShellProps) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-teal-50/80 via-background to-violet-50/40 dark:from-teal-950/30 dark:via-background dark:to-violet-950/20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-20 -z-10 size-[24rem] rounded-full bg-teal-200/30 blur-3xl dark:bg-teal-600/12"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 top-32 -z-10 size-[18rem] rounded-full bg-rose-200/25 blur-3xl dark:bg-rose-600/10"
        aria-hidden
      />

      <header className="border-border/60 relative z-10 border-b bg-background/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4 sm:max-w-xl sm:px-6">
          <Link
            href="/"
            className="group flex min-w-0 flex-col gap-0.5"
          >
            <span className="truncate text-sm font-semibold tracking-tight text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400">
              GuidanceConnect
            </span>
            <span className="text-muted-foreground hidden text-xs sm:block">Counseling &amp; wellness</span>
          </Link>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground gap-1.5",
            )}
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Home
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center px-5 py-10 sm:justify-center sm:py-12">
        <div className="w-full max-w-md space-y-8 sm:max-w-lg">
          <div className="space-y-4 text-center sm:text-left">
            <p className="inline-flex items-center justify-center gap-2 rounded-full border border-teal-200/70 bg-teal-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-teal-900 sm:justify-start dark:border-teal-500/30 dark:bg-teal-950/50 dark:text-teal-100">
              <Sparkles className="size-3.5 shrink-0" aria-hidden />
              Welcome
            </p>
            <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            <p className="text-muted-foreground text-pretty text-sm leading-relaxed sm:text-base">{description}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
