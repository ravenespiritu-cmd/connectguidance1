/** Preset concern types for booking & reporting consistency. */
export const CONCERN_TYPES = [
  { value: "academic", label: "Academic planning / performance" },
  { value: "mental_health", label: "Stress, anxiety, or mental wellness" },
  { value: "career", label: "Career or post-graduation planning" },
  { value: "personal", label: "Personal or family difficulties" },
  { value: "other", label: "Other" },
] as const;

export type ConcernValue = (typeof CONCERN_TYPES)[number]["value"];
