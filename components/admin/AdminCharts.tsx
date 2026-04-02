"use client";

import { BarChart3, PieChart } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConcernDatum, WeeklyDatum } from "@/lib/admin-metrics";
import { cn } from "@/lib/utils";

const SERIES_BLUE = "oklch(0.55 0.14 260)";
const SERIES_TEAL = "oklch(0.55 0.1 180)";

type TooltipInnerProps = {
  active?: boolean;
  label?: string;
  payload?: ReadonlyArray<{ name?: string; value?: number }>;
};

function ChartTooltip({ active, label, payload }: TooltipInnerProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  return (
    <div className="border-border bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground mb-1 font-medium">{label}</p>
      <p className="tabular-nums">
        <span className="text-foreground font-semibold">{row.value}</span>
        {row.name ? <span className="text-muted-foreground"> · {row.name}</span> : null}
      </p>
    </div>
  );
}

function ChartEmpty({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof BarChart3;
  title: string;
  hint: string;
}) {
  return (
    <div
      className={cn(
        "border-border/60 from-muted/20 to-background/30 text-muted-foreground flex h-[280px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-gradient-to-b px-6 text-center",
      )}
    >
      <div className="bg-muted/50 text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <Icon className="size-6 opacity-70" aria-hidden />
      </div>
      <div>
        <p className="text-foreground text-sm font-medium">{title}</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed">{hint}</p>
      </div>
    </div>
  );
}

export function AdminCharts({ weekly, concerns }: { weekly: WeeklyDatum[]; concerns: ConcernDatum[] }) {
  const weeklyTotal = weekly.reduce((s, w) => s + w.count, 0);
  const concernsTotal = concerns.reduce((s, c) => s + c.count, 0);
  const weeklyEmpty = weeklyTotal === 0;
  const concernsEmpty = concerns.length === 0 || concernsTotal === 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Appointments per week</CardTitle>
          <CardDescription>Last eight weeks, by week start date.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {weeklyEmpty ? (
            <ChartEmpty
              icon={BarChart3}
              title="No appointments in this window"
              hint="When students book sessions, weekly volume will appear here."
            />
          ) : (
            <div className="h-[280px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} width={32} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Appointments" fill={SERIES_BLUE} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Concern type breakdown</CardTitle>
          <CardDescription>Top concern labels from the last sixteen weeks.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {concernsEmpty ? (
            <ChartEmpty
              icon={PieChart}
              title="No concern labels yet"
              hint="Bookings with a concern type will populate this trend view."
            />
          ) : (
            <div className="h-[280px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={concerns} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} width={32} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="count" stroke={SERIES_TEAL} strokeWidth={2} dot={{ r: 3 }} name="Count" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
