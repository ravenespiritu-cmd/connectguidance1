import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subWeeks } from "date-fns";

export type WeeklyDatum = { week: string; count: number };
export type ConcernDatum = { name: string; count: number };

type ApptLite = { scheduled_at: string; concern_type: string };

export function buildWeeklyAppointmentSeries(appts: ApptLite[]): WeeklyDatum[] {
  const now = new Date();
  const weeks: { label: string; start: Date; end: Date }[] = [];
  for (let i = 7; i >= 0; i--) {
    const anchor = subWeeks(now, i);
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    const end = endOfWeek(anchor, { weekStartsOn: 1 });
    weeks.push({ label: format(start, "MMM d"), start, end });
  }
  return weeks.map(({ label, start, end }) => {
    const count = appts.filter((a) => {
      const d = new Date(a.scheduled_at);
      return d >= start && d <= end;
    }).length;
    return { week: label, count };
  });
}

export function buildConcernBreakdown(appts: ApptLite[], topN = 8): ConcernDatum[] {
  const m = new Map<string, number>();
  for (const a of appts) {
    const key = a.concern_type?.trim() || "Unknown";
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  const arr = [...m.entries()].sort((a, b) => b[1] - a[1]);
  const top = arr.slice(0, topN);
  const rest = arr.slice(topN).reduce((s, [, n]) => s + n, 0);
  const out: ConcernDatum[] = top.map(([name, count]) => ({
    name: name.length > 44 ? `${name.slice(0, 41)}…` : name,
    count,
  }));
  if (rest > 0) out.push({ name: "Other (combined)", count: rest });
  return out;
}

export function monthRangeIso() {
  const start = startOfMonth(new Date());
  const end = endOfMonth(new Date());
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}
