import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarHeart,
  HeartHandshake,
  Leaf,
  Lock,
  MessageCircleHeart,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const roles = [
  {
    title: "Students",
    description: "A calm place to reach out, book time with someone who listens, and get gentle guidance when you need it.",
    detail: "Schedule visits, see your appointment history, and use the assistant for campus questions—always optional, never a replacement for your counselor.",
    icon: CalendarHeart,
    accent:
      "border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-card dark:border-amber-500/25 dark:from-amber-950/40 dark:to-card",
    titleClass: "text-amber-900 dark:text-amber-200",
    iconWrap: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100",
  },
  {
    title: "Counselors",
    description: "Focus on students, not spreadsheets—clear schedules, structured notes, and tools that respect confidentiality.",
    detail: "Session context, case notes with appropriate controls, and fewer administrative distractions during busy terms.",
    icon: HeartHandshake,
    accent:
      "border-emerald-200/80 bg-gradient-to-b from-emerald-50/90 to-card dark:border-emerald-500/25 dark:from-emerald-950/35 dark:to-card",
    titleClass: "text-emerald-900 dark:text-emerald-200",
    iconWrap: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100",
  },
  {
    title: "Program leads",
    description: "Understand how your office is supporting learners—without compromising what happens in the counseling room.",
    detail: "High-level reporting, responsible user administration, and audit visibility where your institution needs accountability.",
    icon: Leaf,
    accent:
      "border-sky-200/80 bg-gradient-to-b from-sky-50/90 to-card dark:border-sky-500/25 dark:from-sky-950/40 dark:to-card",
    titleClass: "text-sky-900 dark:text-sky-200",
    iconWrap: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-100",
  },
] as const;

const values = [
  {
    icon: Lock,
    title: "Privacy by design",
    text: "Role-aware access so the right people see the right information—when it is appropriate.",
  },
  {
    icon: Users,
    title: "People first",
    text: "Built for real counseling workflows: appointments, collaboration, and continuity of care.",
  },
  {
    icon: Shield,
    title: "Trust & accountability",
    text: "Modern security practices and audit-friendly logs your institution can stand behind.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-teal-50/80 via-background to-violet-50/40 dark:from-teal-950/30 dark:via-background dark:to-violet-950/20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-24 -z-10 size-[28rem] rounded-full bg-teal-200/30 blur-3xl dark:bg-teal-600/15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 top-40 -z-10 size-[22rem] rounded-full bg-rose-200/25 blur-3xl dark:bg-rose-600/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 -z-10 size-[36rem] -translate-x-1/2 rounded-full bg-amber-100/40 blur-3xl dark:bg-amber-900/15"
        aria-hidden
      />

      <header className="border-border/60 border-b bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-lg font-semibold tracking-tight text-foreground">GuidanceConnect</span>
            <span className="text-muted-foreground hidden text-xs font-medium sm:block">
              Counseling &amp; wellness coordination for higher education
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}>
              Sign in
            </Link>
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: "sm" }),
                "shadow-sm bg-teal-700 text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500",
              )}
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-5 py-14 sm:px-6 sm:py-20">
        <section className="relative">
          <div className="border-border/50 relative overflow-hidden rounded-3xl border bg-card/80 p-8 shadow-sm backdrop-blur-sm sm:p-10 md:p-12">
            <div
              className="absolute right-0 top-0 size-64 translate-x-1/4 -translate-y-1/4 rounded-full bg-gradient-to-br from-teal-200/50 to-transparent dark:from-teal-700/20"
              aria-hidden
            />
            <div className="relative max-w-2xl space-y-5">
              <p className="inline-flex items-center gap-2 rounded-full border border-teal-200/70 bg-teal-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-teal-900 dark:border-teal-500/30 dark:bg-teal-950/50 dark:text-teal-100">
                <Sparkles className="size-3.5" aria-hidden />
                Higher education guidance
              </p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl md:text-[2.65rem] md:leading-[1.15]">
                A gentler way to connect students with the support they deserve.
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed text-pretty">
                GuidanceConnect helps your office coordinate appointments, protect sensitive conversations, and stay organized—so
                counselors can be present with students, not buried in admin.
              </p>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "gap-2 bg-teal-700 text-white shadow-md hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500",
                  )}
                >
                  Start as a student
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-teal-700/25")}>
                  I already have an account
                </Link>
              </div>
              <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircleHeart className="size-4 text-teal-600 dark:text-teal-400" aria-hidden />
                  Human-centered workflows
                </span>
                <span className="text-border hidden sm:inline" aria-hidden>
                  ·
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="size-4 text-teal-600 dark:text-teal-400" aria-hidden />
                  Built for busy counseling offices
                </span>
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {values.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="border-border/60 rounded-2xl border bg-card/60 p-5 shadow-sm backdrop-blur-sm"
            >
              <div className="bg-muted/80 text-muted-foreground mb-3 flex size-10 items-center justify-center rounded-xl">
                <Icon className="size-5" aria-hidden />
              </div>
              <h2 className="font-medium tracking-tight">{title}</h2>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </section>

        <section className="space-y-6">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Who it is for</h2>
            <p className="text-muted-foreground leading-relaxed">
              Whether you are scheduling your first visit or overseeing a whole guidance program, the experience stays respectful,
              clear, and grounded in how real support happens on campus.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {roles.map(({ title, description, detail, icon: Icon, accent, titleClass, iconWrap }) => (
              <Card key={title} className={cn("flex flex-col overflow-hidden border shadow-sm transition-shadow hover:shadow-md", accent)}>
                <CardHeader className="space-y-4 pb-4">
                  <div className={cn("flex size-11 items-center justify-center rounded-xl", iconWrap)}>
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <div>
                    <CardTitle className={cn("text-lg font-semibold", titleClass)}>{title}</CardTitle>
                    <CardDescription className="mt-2 text-foreground/85 leading-relaxed">{description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="text-muted-foreground mt-auto border-border/40 border-t pt-4 text-sm leading-relaxed">
                  {detail}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-border/50 relative overflow-hidden rounded-3xl border bg-gradient-to-br from-teal-700 to-teal-900 px-8 py-12 text-center text-white shadow-lg sm:px-10 dark:from-teal-900 dark:to-teal-950">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.12),transparent_55%)]" aria-hidden />
          <div className="relative mx-auto max-w-xl space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">Ready when you are</h2>
            <p className="text-teal-50/90 text-sm leading-relaxed sm:text-base">
              Taking the step to ask for guidance is already brave. If your campus uses GuidanceConnect, signing up is simple—and you
              are always welcome to talk to a counselor directly about what you need.
            </p>
            <div className="flex flex-col items-stretch justify-center gap-3 pt-2 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "border-0 bg-white text-teal-900 shadow-md hover:bg-teal-50",
                )}
              >
                Create a student account
              </Link>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-white/40 text-white hover:bg-white/10")}
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <footer className="text-muted-foreground border-border/40 border-t pt-8 text-center text-xs sm:text-sm">
          <p className="font-medium text-foreground/80">GuidanceConnect</p>
          <p className="mt-1 max-w-md mx-auto leading-relaxed">
            Supportive tooling for guidance and wellness teams. Not an emergency service—if you are in crisis, please contact your campus
            crisis line or local emergency services.
          </p>
        </footer>
      </main>
    </div>
  );
}
