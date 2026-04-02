import { format, isSameDay, startOfDay } from "date-fns";
import type { LucideIcon } from "lucide-react";
import { CalendarClock, CalendarDays, HeartHandshake, History } from "lucide-react";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { CounselorAppointmentActions } from "@/components/CounselorAppointmentActions";
import { CounselorSubnav } from "@/components/CounselorSubnav";
import { AppointmentStatusBadge } from "@/components/AppointmentStatusBadge";
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
import { shortDisplayName } from "@/lib/short-display-name";

type AppointmentRow = {
  id: string;
  scheduled_at: string;
  status: string;
  concern_type: string;
  notes: string | null;
  student_id: string;
};

type StudentRow = {
  id: string;
  full_name: string;
  student_id: string | null;
  department: string | null;
};

type MoodAlertRow = {
  id: string;
  student_id: string;
  note: string | null;
  created_at: string;
};

export default async function CounselorDashboardPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();

  if (profile?.role !== "counselor") {
    redirect(
      profile?.role === "admin"
        ? "/admin"
        : profile?.role === "student"
          ? "/student"
          : profile?.role === "receptionist"
            ? "/receptionist"
            : "/login",
    );
  }

  const { data: rows } = await supabase
    .from("appointments")
    .select("id, scheduled_at, status, concern_type, notes, student_id")
    .eq("counselor_id", user.id)
    .order("scheduled_at", { ascending: true });

  const appointments = (rows ?? []) as AppointmentRow[];
  const studentIds = [...new Set(appointments.map((r) => r.student_id))];

  const { data: moodRows } = await supabase
    .from("student_mood_alerts")
    .select("id, student_id, note, created_at")
    .eq("counselor_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const moodAlerts = (moodRows ?? []) as MoodAlertRow[];
  const moodStudentIds = [...new Set(moodAlerts.map((m) => m.student_id))];
  const profileIds = [...new Set([...studentIds, ...moodStudentIds])];

  const { data: students } =
    profileIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, student_id, department").in("id", profileIds)
      : { data: [] as StudentRow[] };

  const studentMap = Object.fromEntries((students ?? []).map((s) => [s.id, s as StudentRow]));

  const dayStart = startOfDay(new Date());
  const active = appointments.filter((a) => new Date(a.scheduled_at) >= dayStart);
  const past = appointments.filter((a) => new Date(a.scheduled_at) < dayStart);

  const today = active.filter((a) => isSameDay(new Date(a.scheduled_at), new Date()));
  const later = active.filter((a) => !isSameDay(new Date(a.scheduled_at), new Date()));

  const greetName = profile?.full_name ?? user.email?.split("@")[0] ?? "there";
  const userLabel = profile?.full_name ?? user.email ?? null;

  return (
    <div className="bg-muted/20 relative min-h-full flex-1">
      <CounselorSubnav userLabel={userLabel} />
      <div className="relative z-0 mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6">
        <div className="border-teal-500/15 from-teal-500/8 via-background relative overflow-hidden rounded-2xl border bg-gradient-to-br to-transparent px-6 py-8 sm:px-8">
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-teal-400/10 blur-3xl dark:bg-teal-500/15" aria-hidden />
          <div className="relative space-y-6">
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">Workspace</p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Hello, <span className="text-teal-900 dark:text-teal-200">{greetName}</span>
              </h1>
              <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base">
                Today’s visits, confirmations, and case notes—organized in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <StatChip icon={CalendarDays} label="Today" value={today.length} accent />
              <StatChip icon={CalendarClock} label="Upcoming" value={later.length} />
              <StatChip icon={History} label="Past" value={past.length} />
            </div>
          </div>
        </div>

        <Card className="border-teal-500/20 shadow-sm">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <div
              className="bg-teal-500/10 text-teal-800 ring-teal-500/15 dark:text-teal-200 flex size-10 shrink-0 items-center justify-center rounded-xl ring-1"
              aria-hidden
            >
              <HeartHandshake className="size-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg">Student mood alerts</CardTitle>
              <CardDescription>
                When students choose Not great on their dashboard, you will see it here (most recent first).
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {moodAlerts.length === 0 ? (
              <EmptyPanel icon={HeartHandshake}>No mood alerts yet.</EmptyPanel>
            ) : (
              <ul className="space-y-3">
                {moodAlerts.map((a) => {
                  const s = studentMap[a.student_id];
                  const label = s ? shortDisplayName(s.full_name) : "Student";
                  return (
                    <li
                      key={a.id}
                      className="border-border flex flex-col gap-1 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{label}</p>
                        <p className="text-muted-foreground text-xs">
                          {format(new Date(a.created_at), "MMM d, yyyy · h:mm a")}
                        </p>
                        {a.note ? (
                          <p className="text-muted-foreground mt-2 text-sm">&ldquo;{a.note}&rdquo;</p>
                        ) : (
                          <p className="text-muted-foreground mt-2 text-sm italic">No note — check-in only.</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-teal-600/20 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-teal-800 dark:text-teal-200">Today</CardTitle>
            <CardDescription>Appointments scheduled for today (local time).</CardDescription>
          </CardHeader>
          <CardContent>
            {today.length === 0 ? (
              <EmptyPanel icon={CalendarDays}>No sessions scheduled for today.</EmptyPanel>
            ) : (
              <ul className="space-y-4">
                {today.map((a) => (
                  <li key={a.id} className="border-border rounded-lg border p-4">
                    <CounselorAppointmentRow appointment={a} student={studentMap[a.student_id]} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
            <CardDescription>Later bookings (from tomorrow onward).</CardDescription>
          </CardHeader>
          <CardContent>
            {later.length === 0 ? (
              <EmptyPanel icon={CalendarClock}>No upcoming appointments.</EmptyPanel>
            ) : (
              <div className="rounded-md border">
                <Table className="w-full table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[22%]">When</TableHead>
                      <TableHead className="w-[28%]">Student</TableHead>
                      <TableHead className="w-[22%]">Concern</TableHead>
                      <TableHead className="w-[12%]">Status</TableHead>
                      <TableHead className="w-[16%]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {later.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="align-top whitespace-normal font-medium">
                          {format(new Date(a.scheduled_at), "EEE, MMM d · h:mm a")}
                        </TableCell>
                        <TableCell className="align-top">
                          <StudentCell s={studentMap[a.student_id]} />
                        </TableCell>
                        <TableCell className="align-top break-words">
                          <span className="line-clamp-3">{a.concern_type}</span>
                        </TableCell>
                        <TableCell className="align-top">
                          <AppointmentStatusBadge status={a.status} />
                        </TableCell>
                        <TableCell className="align-top">
                          <CounselorAppointmentActions appointmentId={a.id} status={a.status as "pending" | "confirmed" | "cancelled" | "completed"} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle>Past</CardTitle>
            <CardDescription>Earlier sessions for reference and notes.</CardDescription>
          </CardHeader>
          <CardContent>
            {past.length === 0 ? (
              <EmptyPanel icon={History}>No past appointments yet.</EmptyPanel>
            ) : (
              <div className="rounded-md border">
                <Table className="w-full table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[22%]">When</TableHead>
                      <TableHead className="w-[28%]">Student</TableHead>
                      <TableHead className="w-[22%]">Concern</TableHead>
                      <TableHead className="w-[12%]">Status</TableHead>
                      <TableHead className="w-[16%]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...past].reverse().map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="align-top whitespace-normal">
                          {format(new Date(a.scheduled_at), "MMM d, yyyy · h:mm a")}
                        </TableCell>
                        <TableCell className="align-top">
                          <StudentCell s={studentMap[a.student_id]} />
                        </TableCell>
                        <TableCell className="align-top break-words">
                          <span className="line-clamp-3">{a.concern_type}</span>
                        </TableCell>
                        <TableCell className="align-top">
                          <AppointmentStatusBadge status={a.status} />
                        </TableCell>
                        <TableCell className="align-top">
                          <CounselorAppointmentActions appointmentId={a.id} status={a.status as "pending" | "confirmed" | "cancelled" | "completed"} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-[7rem] items-center gap-3 rounded-xl border px-4 py-3",
        accent
          ? "border-teal-500/25 bg-teal-500/10 dark:bg-teal-500/15"
          : "border-border/80 bg-background/60",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          accent ? "bg-teal-500/20 text-teal-800 dark:text-teal-200" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </div>
      <div>
        <p
          className={cn(
            "text-2xl font-semibold tabular-nums leading-none",
            accent && "text-teal-900 dark:text-teal-100",
          )}
        >
          {value}
        </p>
        <p className="text-muted-foreground mt-1 text-xs font-medium">{label}</p>
      </div>
    </div>
  );
}

function EmptyPanel({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-3 py-10 text-center text-sm">
      <div className="bg-muted/40 flex size-12 items-center justify-center rounded-2xl border border-dashed border-teal-500/20">
        <Icon className="text-muted-foreground/70 size-5" aria-hidden />
      </div>
      <p>{children}</p>
    </div>
  );
}

function StudentCell({ s }: { s?: StudentRow }) {
  if (!s) return <span className="text-muted-foreground">—</span>;
  return (
    <div>
      <p className="font-medium">{s.full_name}</p>
      <p className="text-muted-foreground text-xs">
        {[s.student_id, s.department].filter(Boolean).join(" · ") || "—"}
      </p>
    </div>
  );
}

function CounselorAppointmentRow({
  appointment: a,
  student,
}: {
  appointment: AppointmentRow;
  student?: StudentRow;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-1">
        <p className="text-lg font-semibold">{format(new Date(a.scheduled_at), "h:mm a")}</p>
        <StudentCell s={student} />
        <p className="text-muted-foreground mt-2 text-sm">{a.concern_type}</p>
        {a.notes ? (
          <p className="text-muted-foreground border-border mt-2 border-l-2 pl-3 text-sm italic">Student note: {a.notes}</p>
        ) : null}
        <div className="pt-2">
          <AppointmentStatusBadge status={a.status} />
        </div>
      </div>
      <CounselorAppointmentActions appointmentId={a.id} status={a.status as "pending" | "confirmed" | "cancelled" | "completed"} />
    </div>
  );
}
