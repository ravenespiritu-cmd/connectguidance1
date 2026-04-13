import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, MessageCircle, Sparkles } from "lucide-react";

import ChatbotWidget from "@/components/ChatbotWidget";
import { AppointmentStatusBadge } from "@/components/AppointmentStatusBadge";
import { LocalDateTimeText } from "@/components/LocalDateTimeText";
import { StudentSubnav } from "@/components/StudentSubnav";
import { StudentAppBackground } from "@/components/student/StudentAppBackground";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentCaseHistory } from "@/components/student/StudentCaseHistory";
import { StudentMoodCheckIn } from "@/components/student/StudentMoodCheckIn";
import { Skeleton } from "@/components/ui/skeleton";
import { shortDisplayName } from "@/lib/short-display-name";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { Suspense } from "react";

async function UpcomingAppointments() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: rows } = await supabase
    .from("appointments")
    .select("id, scheduled_at, status, concern_type, counselor_id")
    .eq("student_id", user.id)
    .gte("scheduled_at", new Date().toISOString())
    .neq("status", "cancelled")
    .order("scheduled_at", { ascending: true })
    .limit(5);

  if (!rows?.length) {
    return (
      <div className="border-border from-muted/30 to-background rounded-xl border border-dashed bg-gradient-to-b py-12 text-center">
        <div className="bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300 mx-auto flex size-12 items-center justify-center rounded-full ring-1">
          <CalendarDays className="size-6" aria-hidden />
        </div>
        <p className="text-muted-foreground mt-4 text-sm font-medium">No upcoming appointments</p>
        <p className="text-muted-foreground/80 mx-auto mt-1 max-w-sm text-xs">
          When you book a session, it will show up here with the date and counselor.
        </p>
        <Link href="/appointments" className={cn(buttonVariants({ variant: "link" }), "mt-3 inline-flex text-amber-700 dark:text-amber-400")}>
          Book your first session
        </Link>
      </div>
    );
  }

  const counselorIds = [...new Set(rows.map((r) => r.counselor_id))];
  const { data: counselors } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", counselorIds);

  const counselorMap = Object.fromEntries((counselors ?? []).map((c) => [c.id, c.full_name]));

  return (
    <ul className="space-y-3">
      {rows.map((a) => (
        <li
          key={a.id}
          className="border-border flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-medium">
              <LocalDateTimeText iso={a.scheduled_at} pattern="EEEE, MMM d · h:mm a" />
            </p>
            <p className="text-muted-foreground text-sm">with {counselorMap[a.counselor_id] ?? "counselor"}</p>
            <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">{a.concern_type}</p>
          </div>
          <AppointmentStatusBadge status={a.status} />
        </li>
      ))}
    </ul>
  );
}

function UpcomingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

function CaseHistorySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  );
}

export default async function StudentDashboardPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();

  if (profile?.role !== "student") {
    redirect(
      profile?.role === "admin"
        ? "/admin"
        : profile?.role === "counselor"
          ? "/counselor"
          : profile?.role === "receptionist"
            ? "/receptionist"
            : "/login",
    );
  }

  const greetName = shortDisplayName(profile?.full_name ?? user.email ?? "there");

  const { data: lastAppt } = await supabase
    .from("appointments")
    .select("counselor_id")
    .eq("student_id", user.id)
    .neq("status", "cancelled")
    .order("scheduled_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let recentCounselorName: string | null = null;
  if (lastAppt?.counselor_id) {
    const { data: c } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", lastAppt.counselor_id)
      .eq("role", "counselor")
      .maybeSingle();
    recentCounselorName = c?.full_name ?? null;
  }

  return (
    <StudentAppBackground>
      <StudentSubnav userLabel={profile?.full_name ?? user.email ?? null} />
      <div className="relative z-0 mx-auto max-w-4xl space-y-10 px-4 py-8 sm:px-6">
        <div className="border-amber-500/15 from-amber-500/8 via-background relative overflow-hidden rounded-2xl border bg-gradient-to-br to-transparent px-6 py-8 sm:px-8">
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-amber-400/10 blur-3xl dark:bg-amber-500/15" aria-hidden />
          <div className="relative">
            <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">Dashboard</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome, <span className="text-amber-900 dark:text-amber-200">{greetName}</span>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
              Your space for appointments, shared session notes, and the guidance assistant when you need quick answers.
            </p>
          </div>

          <div className="relative mt-6 flex flex-wrap gap-3">
            <Link
              href="/appointments"
              className={cn(
                buttonVariants({ variant: "default", size: "default" }),
                "bg-amber-600 text-white shadow-sm hover:bg-amber-700 gap-2",
              )}
            >
              <CalendarDays className="size-4 opacity-90" aria-hidden />
              Book appointment
            </Link>
            <Link href="/chatbot" className={cn(buttonVariants({ variant: "outline" }), "gap-2 border-amber-500/25 bg-background/60")}>
              <MessageCircle className="size-4 opacity-80" aria-hidden />
              Open chat assistant
            </Link>
          </div>
          <p className="text-muted-foreground mt-4 flex items-center gap-1.5 text-xs">
            <Sparkles className="size-3.5 shrink-0 text-amber-600/80 dark:text-amber-400/80" aria-hidden />
            Tip: use the floating button anytime for the full chat experience.
          </p>
        </div>

        <StudentMoodCheckIn recentCounselorName={recentCounselorName} />

        <Card className="border-amber-500/20 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg">Upcoming appointments</CardTitle>
              <CardDescription>Your next scheduled sessions.</CardDescription>
            </div>
            <Link href="/appointments" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<UpcomingSkeleton />}>
              <UpcomingAppointments />
            </Suspense>
          </CardContent>
        </Card>

        <Suspense fallback={<CaseHistorySkeleton />}>
          <StudentCaseHistory />
        </Suspense>
      </div>
      <ChatbotWidget studentId={user.id} />
    </StudentAppBackground>
  );
}
