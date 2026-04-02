/** Triggers the in-app "Book appointment" CTA in the chat widget. */
export function shouldSuggestAppointment(text: string): boolean {
  const t = text.toLowerCase();
  const patterns = [
    /\btalk to someone\b/,
    /\bspeak to (a )?counselor\b/,
    /\bhuman counselor\b/,
    /\bsee (a )?counselor\b/,
    /\bbook (an? )?appointment\b/,
    /\bmeet with (a )?counselor\b/,
    /\bone[- ]on[- ]one\b.*\bcounselor\b/,
    /\b(i'?m|i am) (really )?(struggling|not okay|not ok)\b/,
    /\bsuicid/,
    /\bhurt myself\b/,
    /\bself[- ]harm\b/,
    /\bcrisis\b/,
  ];
  return patterns.some((re) => re.test(t));
}
