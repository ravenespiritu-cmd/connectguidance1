/** Half-hour start times from `startHour` through `endHour` (exclusive end boundary). */
export function generateDayTimeSlots(startHour = 9, endHour = 17, stepMinutes = 30): string[] {
  const slots: string[] = [];
  const start = startHour * 60;
  const end = endHour * 60;
  for (let t = start; t + stepMinutes <= end; t += stepMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return slots;
}
