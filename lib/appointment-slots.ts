/** Local calendar day bounds from `yyyy-MM-dd` (browser/server local timezone). */
export function localDayBounds(dateYmd: string): { start: Date; end: Date } | { error: string } {
  const parts = dateYmd.split("-").map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return { error: "Invalid date." };
  }
  const [yy, mm, dd] = parts;
  const start = new Date(yy, mm - 1, dd, 0, 0, 0, 0);
  const end = new Date(yy, mm - 1, dd, 23, 59, 59, 999);
  return { start, end };
}

/** Hourly slots 09:00–16:00 local (9 AM through 4 PM) for the given calendar day. */
export function hourlySlotDates(localDay: Date): Date[] {
  const y = localDay.getFullYear();
  const m = localDay.getMonth();
  const d = localDay.getDate();
  const slots: Date[] = [];
  for (let h = 9; h < 17; h++) {
    slots.push(new Date(y, m, d, h, 0, 0, 0));
  }
  return slots;
}
