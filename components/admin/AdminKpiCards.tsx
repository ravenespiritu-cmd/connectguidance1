import { CalendarCheck, GraduationCap, HeartHandshake, TrendingUp } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  totalStudents: number;
  totalCounselors: number;
  appointmentsThisMonth: number;
  completedThisMonth: number;
  completionRatePct: number;
};

const iconWrap =
  "flex size-9 items-center justify-center rounded-lg [&>svg]:size-[1.125rem] shrink-0";

export function AdminKpiCards({
  totalStudents,
  totalCounselors,
  appointmentsThisMonth,
  completedThisMonth,
  completionRatePct,
}: Props) {
  const noAppts = appointmentsThisMonth === 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <Card
        className={cn(
          "border-t-4 border-t-teal-500/70 shadow-sm transition-shadow hover:shadow-md dark:border-t-teal-400/60",
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardDescription>Total counselors</CardDescription>
              <CardTitle className="text-3xl font-semibold tabular-nums text-teal-700 dark:text-teal-300 mt-1">
                {totalCounselors}
              </CardTitle>
            </div>
            <div className={cn(iconWrap, "bg-teal-500/15 text-teal-600 dark:text-teal-300")}>
              <HeartHandshake aria-hidden />
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-muted-foreground text-xs">
          {totalCounselors === 0 ? (
            <span className="text-amber-600/90 dark:text-amber-400/90">No counselor profiles yet — assign the role in Users.</span>
          ) : (
            <>Profiles with role &quot;counselor&quot;.</>
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
              Completed <span className="font-medium text-foreground">{completedThisMonth}</span> of{" "}
              <span className="font-medium text-foreground">{appointmentsThisMonth}</span> booked sessions.
            </>
          )}

          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60" aria-hidden>
              <div
                className="h-full rounded-full bg-emerald-500/85 transition-[width]"
                style={{ width: noAppts ? "0%" : `${completionRatePct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
