// Sensible default weekday spreads per training frequency (0 = Sunday .. 6 = Saturday),
// biased toward spacing rest days between sessions where a day count allows it.
const DEFAULT_TEMPLATES: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 6],
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

function evenlySpaceFrom(sorted: number[], count: number): number[] {
  if (count >= sorted.length) return sorted;
  const result = new Set<number>();
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i * (sorted.length - 1)) / Math.max(count - 1, 1));
    result.add(sorted[idx]!);
  }
  return Array.from(result).sort((a, b) => a - b);
}

/**
 * Resolves which calendar weekdays (0=Sun..6=Sat) training falls on, given
 * how many days/week the user wants and which days they said they prefer.
 * Every day not returned here becomes a rest day in the generated plan.
 */
export function resolveTrainingDays(daysPerWeek: number, preferredDays: number[]): number[] {
  const clamped = Math.max(1, Math.min(7, daysPerWeek));
  const clean = Array.from(new Set(preferredDays.filter((d) => d >= 0 && d <= 6))).sort((a, b) => a - b);

  if (clean.length === clamped) return clean;
  if (clean.length > clamped) return evenlySpaceFrom(clean, clamped);

  const template = DEFAULT_TEMPLATES[clamped] ?? evenlySpaceFrom([0, 1, 2, 3, 4, 5, 6], clamped);
  const result = new Set(clean);
  for (const day of template) {
    if (result.size >= clamped) break;
    result.add(day);
  }
  let d = 0;
  while (result.size < clamped && d < 7) {
    result.add(d);
    d++;
  }
  return Array.from(result).sort((a, b) => a - b);
}
