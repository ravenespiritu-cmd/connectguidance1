import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/** True when `tz` is usable with `Intl` / `date-fns-tz` (IANA or offset). */
export function isValidTimeZone(tz: string): boolean {
  const t = tz.trim();
  if (!t || t.length > 120) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: t });
    return true;
  } catch {
    return false;
  }
}

/**
 * Start/end instants for a calendar day in a specific IANA timezone (`yyyy-MM-dd`).
 * Used with Supabase `timestamptz` queries.
 */
export function localDayBounds(
  dateYmd: string,
  timeZone: string,
): { start: Date; end: Date } | { error: string } {
  const parts = dateYmd.split("-").map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return { error: "Invalid date." };
  }
  const [yy, mm, dd] = parts;
  const start = fromZonedTime(new Date(yy, mm - 1, dd, 0, 0, 0, 0), timeZone);
  const end = fromZonedTime(new Date(yy, mm - 1, dd, 23, 59, 59, 999), timeZone);
  return { start, end };
}

/** Hourly slots 09:00–16:00 wall time in `timeZone` for `dateYmd`. */
export function hourlySlotDatesForDay(dateYmd: string, timeZone: string): Date[] {
  const parts = dateYmd.split("-").map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return [];
  }
  const [yy, mm, dd] = parts;
  const slots: Date[] = [];
  for (let h = 9; h < 17; h++) {
    slots.push(fromZonedTime(new Date(yy, mm - 1, dd, h, 0, 0, 0), timeZone));
  }
  return slots;
}

/** `HH:mm` in `timeZone` for an absolute instant (for receptionist slot labels). */
export function formatSlotHmInTimeZone(isoOrDate: Date | string, timeZone: string): string {
  return formatInTimeZone(isoOrDate, timeZone, "HH:mm");
}
