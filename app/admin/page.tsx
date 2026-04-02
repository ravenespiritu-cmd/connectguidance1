import { format, subWeeks } from "date-fns";

import { AdminCharts } from "@/components/admin/AdminCharts";
import { AdminKpiCards } from "@/components/admin/AdminKpiCards";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSubnav } from "@/components/admin/AdminSubnav";
import { Badge } from "@/components/ui/badge";
import { buildConcernBreakdown, buildWeeklyAppointmentSeries, monthRangeIso } from "@/lib/admin-metrics";
import { requireAdmin } from "@/lib/supabase/admin-guard";

export default async function AdminDashboardPage() {
  const { supabase, user, profile } = await requireAdmin();

  const { startIso, endIso } = monthRangeIso();

  const [
    { count: studentCount },
    { count: counselorCount },
    { count: apptMonthCount },
    { count: completedMonthCount },
    { data: apptsEightWeeks },
    { data: apptsConcerns },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "counselor"),
    supabase.from("appointments").select("*", { count: "exact", head: true }).gte("scheduled_at", startIso).lte("scheduled_at", endIso),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("scheduled_at", startIso)
      .lte("scheduled_at", endIso),
    supabase
      .from("appointments")
      .select("scheduled_at, concern_type")
      .gte("scheduled_at", subWeeks(new Date(), 8).toISOString()),
    supabase
      .from("appointments")
      .select("scheduled_at, concern_type")
      .gte("scheduled_at", subWeeks(new Date(), 16).toISOString()),
  ]);

  const weekly = buildWeeklyAppointmentSeries(apptsEightWeeks ?? []);
  const concerns = buildConcernBreakdown(apptsConcerns ?? []);

  const totalMonth = apptMonthCount ?? 0;
  const completed = completedMonthCount ?? 0;
  const completionRatePct = totalMonth > 0 ? Math.round((completed / totalMonth) * 100) : 0;

  const monthLabel = format(new Date(), "MMMM yyyy");

  return (
    <div className="from-background via-muted/15 to-background dark:via-muted/8 min-h-full flex-1 bg-gradient-to-b">
      <AdminSubnav userLabel={profile.full_name} />
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
        <AdminPageHeader
          title="Admin overview"
          description="Institution-wide guidance metrics and trends."
        >
          <Badge variant="secondary" className="font-normal">
            Reporting: {monthLabel}
          </Badge>
        </AdminPageHeader>

        <AdminKpiCards
          totalStudents={studentCount ?? 0}
          totalCounselors={counselorCount ?? 0}
          appointmentsThisMonth={totalMonth}
          completedThisMonth={completed}
          completionRatePct={completionRatePct}
        />

        <AdminCharts weekly={weekly} concerns={concerns} />
      </div>
    </div>
  );
}
