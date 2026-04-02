import { format, isSameDay, startOfDay } from "date-fns";
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

export default async function CounselorDashboardPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role !== "counselor") {
    redirect(profile?.role === "admin" ? "/admin" : profile?.role === "student" ? "/student" : "/login");
  }

  const { data: rows } = await supabase
    .from("appointments")
    .select("id, scheduled_at, status, concern_type, notes, student_id")
    .eq("counselor_id", user.id)
    .order("scheduled_at", { ascending: true });

  const appointments = (rows ?? []) as AppointmentRow[];
  const studentIds = [...new Set(appointments.map((r) => r.student_id))];

  const { data: students } =
    studentIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, student_id, department").in("id", studentIds)
      : { data: [] as StudentRow[] };

  const studentMap = Object.fromEntries((students ?? []).map((s) => [s.id, s as StudentRow]));

  const dayStart = startOfDay(new Date());
  const active = appointments.filter((a) => new Date(a.scheduled_at) >= dayStart);
  const past = appointments.filter((a) => new Date(a.scheduled_at) < dayStart);

  const today = active.filter((a) => isSameDay(new Date(a.scheduled_at), new Date()));
  const later = active.filter((a) => !isSameDay(new Date(a.scheduled_at), new Date()));

  return (
    <div className="bg-muted/20 min-h-full flex-1">
      <CounselorSubnav />
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Counselor workspace</h1>
          <p className="text-muted-foreground mt-1 text-sm">Today’s visits, confirmations, and case notes.</p>
        </div>

        <Card className="border-teal-600/20">
          <CardHeader>
            <CardTitle className="text-teal-800 dark:text-teal-200">Today</CardTitle>
            <CardDescription>Appointments scheduled for today (local time).</CardDescription>
          </CardHeader>
          <CardContent>
            {today.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">No sessions scheduled for today.</p>
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

        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
            <CardDescription>Later bookings (from tomorrow onward).</CardDescription>
          </CardHeader>
          <CardContent>
            {later.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">No upcoming appointments.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Concern</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="min-w-[200px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {later.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="whitespace-nowrap font-medium">
                          {format(new Date(a.scheduled_at), "EEE, MMM d · h:mm a")}
                        </TableCell>
                        <TableCell>
                          <StudentCell s={studentMap[a.student_id]} />
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{a.concern_type}</TableCell>
                        <TableCell>
                          <AppointmentStatusBadge status={a.status} />
                        </TableCell>
                        <TableCell>
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

        <Card>
          <CardHeader>
            <CardTitle>Past</CardTitle>
            <CardDescription>Earlier sessions for reference and notes.</CardDescription>
          </CardHeader>
          <CardContent>
            {past.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">No past appointments yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Concern</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...past].reverse().map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(a.scheduled_at), "MMM d, yyyy · h:mm a")}
                        </TableCell>
                        <TableCell>
                          <StudentCell s={studentMap[a.student_id]} />
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{a.concern_type}</TableCell>
                        <TableCell>
                          <AppointmentStatusBadge status={a.status} />
                        </TableCell>
                        <TableCell>
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
