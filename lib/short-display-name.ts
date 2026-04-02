/**
 * First word for display names (e.g. given name), or the email local-part before `@`.
 * For compact UI: nav, greetings. Full legal name still belongs on profile / admin views.
 */
export function shortDisplayName(label: string | null | undefined): string {
  const t = label?.trim();
  if (!t) return "";
  if (t.includes("@")) {
    const local = t.split("@")[0]?.trim() ?? "";
    return local || t;
  }
  const parts = t.split(/\s+/).filter(Boolean);
  return parts[0] ?? t;
}
