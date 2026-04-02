import { CalendarCheck, GraduationCap, TrendingUp } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  totalStudents: number;
  appointmentsThisMonth: number;
  completedThisMonth: number;
  completionRatePct: number;
};

const iconWrap =
  "flex size-9 items-center justify-center rounded-lg [&>svg]:size-[1.125rem] shrink-0";

export function AdminKpiCards({
  totalStudents,
  appointmentsThisMonth,
  completedThisMonth,
  completionRatePct,
}: Props) {
  const noAppts = appointmentsThisMonth === 0;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card
        className={cn(
          "border-t-4 border-t-blue-500/70 shadow-sm transition-shadow hover:shadow-md dark:border-t-blue-400/60",
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardDescription>Total students</CardDescription>
              <CardTitle className="text-3xl font-semibold tabular-nums text-blue-700 dark:text-blue-300 mt-1">
                {totalStudents}
              </CardTitle>
            </div>
            <div className={cn(iconWrap, "bg-blue-500/15 text-blue-600 dark:text-blue-300")}>
              <GraduationCap aria-hidden />
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-muted-foreground text-xs">
          {totalStudents === 0 ? (
            <span className="text-amber-600/90 dark:text-amber-400/90">No student profiles yet — registrations will appear here.</span>
          ) : (
            <>Profiles with role &quot;student&quot;.</>
          )}
        </CardContent>
      </Card>

      <Card className="border-t-4 border-t-violet-500/70 shadow-sm transition-shadow hover:shadow-md dark:border-t-violet-400/60">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardDescription>Appointments this month</CardDescription>
              <CardTitle className="mt-1 text-3xl font-semibold tabular-nums text-violet-700 dark:text-violet-300">
                {appointmentsThisMonth}
              </CardTitle>
            </div>
            <div className={cn(iconWrap, "bg-violet-500/15 text-violet-600 dark:text-violet-300")}>
              <CalendarCheck aria-hidden />
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-muted-foreground text-xs">
          {noAppts ? (
            <span className="text-muted-foreground">No bookings in the current calendar month.</span>
          ) : (
            "By scheduled date (calendar month)."
          )}
        </CardContent>
      </Card>

      <Card className="border-t-4 border-t-emerald-500/70 shadow-sm transition-shadow hover:shadow-md dark:border-t-emerald-400/60">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardDescription>Completion rate</CardDescription>
              <CardTitle className="mt-1 text-3xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                {noAppts ? "—" : `${completionRatePct}%`}
              </CardTitle>
            </div>
            <div className={cn(iconWrap, "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300")}>
              <TrendingUp aria-hidden />
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-muted-foreground text-xs">
          {noAppts ? (
            "Complete at least one appointment this month to see a rate."
          ) : (
            <>
              Completed ({completedThisMonth}) ÷ all statuses this month ({appointmentsThisMonth}).
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
