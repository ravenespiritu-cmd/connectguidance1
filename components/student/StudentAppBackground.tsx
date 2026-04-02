import type { ReactNode } from "react";

export function StudentAppBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-full flex-1 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-teal-50/50 via-background to-amber-50/35 dark:from-teal-950/30 dark:via-background dark:to-amber-950/20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-28 top-0 -z-10 size-[22rem] rounded-full bg-teal-200/30 blur-3xl dark:bg-teal-600/15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 top-20 -z-10 size-[18rem] rounded-full bg-amber-200/30 blur-3xl dark:bg-amber-600/12"
        aria-hidden
      />
      {children}
    </div>
  );
}
