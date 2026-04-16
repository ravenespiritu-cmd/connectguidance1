import { CalendarClock, History } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BookAppointmentForm } from "@/components/BookAppointmentForm";
import { AppointmentStatusBadge } from "@/components/AppointmentStatusBadge";
import { LocalDateTimeText } from "@/components/LocalDateTimeText";
import { StudentAppointmentCancelButton } from "@/components/StudentAppointmentCancelButton";
import { StudentSubnav } from "@/components/StudentSubnav";
import { StudentAppBackground } from "@/components/student/StudentAppBackground";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function AppointmentsPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();

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

  const [{ data: appointmentRows }, { data: counselorRows }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, scheduled_at, status, concern_type, notes, counselor_id")
      .eq("student_id", user.id)
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, department, is_active")
      .eq("role", "counselor")
      .order("full_name", { ascending: true }),
  ]);

  const appointments = appointmentRows ?? [];
  const counselorsAll = counselorRows ?? [];
  const counselorMap = Object.fromEntries(counselorsAll.map((c) => [c.id, c]));
  const counselorsForBooking = counselorsAll
    .filter((c) => c.is_active !== false)
    .map(({ id, full_name, department }) => ({ id, full_name, department }));

  const now = new Date().toISOString();
  const upcoming = appointments.filter((a) => a.scheduled_at >= now && a.status !== "cancelled");
  const past = appointments.filter((a) => a.scheduled_at < now || a.status === "cancelled");

  return (
    <StudentAppBackground>
      <StudentSubnav userLabel={profile?.full_name ?? user.email ?? null} />
      <div className="relative z-0 mx-auto max-w-4xl space-y-10 px-4 py-8 sm:px-6">
        <div className="border-teal-500/15 from-teal-500/8 via-background rounded-2xl border bg-gradient-to-br to-transparent px-6 py-8 sm:px-8">
          <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">Scheduling</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Appointments</h1>
              <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
                Book time with a counselor, see what is coming up, and view past sessions—all in one calm place.
              </p>
            </div>
            <Link
              href="/student"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "self-start border-teal-700/25 dark:border-teal-500/30",
              )}
            >
              Back to dashboard
            </Link>
          </div>
        </div>

        <Card className="border-teal-200/50 shadow-sm dark:border-teal-500/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Book a new appointment</CardTitle>
            <CardDescription>Choose a counselor, date, and time. Requests stay pending until a counselor confirms.</CardDescription>
          </CardHeader>
          <CardContent>
            <BookAppointmentForm counselors={counselorsForBooking} />
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Upcoming</CardTitle>
            <CardDescription>Visits scheduled from today forward.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcoming.length === 0 ? (
              <div className="border-border from-muted/30 to-background rounded-xl border border-dashed bg-gradient-to-b py-10 text-center">
                <div className="bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300 mx-auto flex size-12 items-center justify-center rounded-full ring-1">
                  <CalendarClock className="size-6" aria-hidden />
                </div>
                <p className="text-muted-foreground mt-4 text-sm font-medium">No upcoming appointments</p>
                <p className="text-muted-foreground/80 mx-auto mt-1 max-w-sm text-xs">
                  When you book a session, it will appear here with the date, counselor, and status.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Counselor</TableHead>
                      <TableHead>Concern</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcoming.map((a) => {
                      const c = counselorMap[a.counselor_id];
                      const canCancel = a.status === "pending";
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="whitespace-nowrap font-medium">
                            <LocalDateTimeText iso={a.scheduled_at} pattern="MMM d, yyyy · h:mm a" />
                          </TableCell>
                          <TableCell>{c?.full_name ?? "—"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{a.concern_type}</TableCell>
                          <TableCell>
                            <AppointmentStatusBadge status={a.status} />
                          </TableCell>
                          <TableCell>
                            {canCancel ? <StudentAppointmentCancelButton appointmentId={a.id} disabled={false} /> : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Past & cancelled</CardTitle>
            <CardDescription>Earlier sessions and cancelled requests.</CardDescription>
          </CardHeader>
          <CardContent>
            {past.length === 0 ? (
              <div className="border-border from-muted/30 to-background rounded-xl border border-dashed bg-gradient-to-b py-10 text-center">
                <div className="bg-muted text-muted-foreground mx-auto flex size-12 items-center justify-center rounded-full ring-1 ring-border">
                  <History className="size-6" aria-hidden />
                </div>
                <p className="text-muted-foreground mt-4 text-sm font-medium">No history yet</p>
                <p className="text-muted-foreground/80 mx-auto mt-1 max-w-sm text-xs">
                  Completed and cancelled visits will show up here for your reference.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Counselor</TableHead>
                      <TableHead>Concern</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {past.map((a) => {
                      const c = counselorMap[a.counselor_id];
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="whitespace-nowrap">
                            <LocalDateTimeText iso={a.scheduled_at} pattern="MMM d, yyyy · h:mm a" />
                          </TableCell>
                          <TableCell>{c?.full_name ?? "—"}</TableCell>
                          <TableCell className="max-w-[240px] truncate">{a.concern_type}</TableCell>
                          <TableCell>
                            <AppointmentStatusBadge status={a.status} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentAppBackground>
  );
}
