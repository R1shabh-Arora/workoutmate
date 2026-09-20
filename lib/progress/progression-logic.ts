// Pure decision logic, deliberately kept free of any DB/server dependency so
// it's directly unit-testable. lib/progress/progression.ts (server-only)
// fetches the data and delegates the actual decision here.

export interface ProgressionRecommendation {
  status: "increase_weight" | "increase_reps" | "maintain" | "deload" | "insufficient_data";
  detail: string;
  lastWeightKg?: number;
  suggestedWeightKg?: number;
}

export interface LoggedSet {
  weightKg: number;
  reps: number;
  rpe: number | null;
}

/**
 * Compares the most recent logged sets for an exercise against its current
 * prescription and suggests a safe, conservative next step. Never recommends
 * a jump bigger than ~2.5% — this is meant to nudge, not gamble.
 */
export function computeProgressionRecommendation(
  lastSets: LoggedSet[],
  prescribedRepsMin: number | null,
  prescribedRepsMax: number | null
): ProgressionRecommendation {
  if (lastSets.length === 0) {
    return { status: "insufficient_data", detail: "No logged sets yet for this exercise — log a session first." };
  }

  const lastWeightKg = Math.max(...lastSets.map((s) => s.weightKg));
  const ratedSets = lastSets.filter((s) => s.rpe != null);
  const avgRpe = ratedSets.length > 0 ? ratedSets.reduce((sum, s) => sum + s.rpe!, 0) / ratedSets.length : null;

  const hitTopOfRange = prescribedRepsMax != null && lastSets.every((s) => s.reps >= prescribedRepsMax);
  const missedBottomOfRange = prescribedRepsMin != null && lastSets.some((s) => s.reps < prescribedRepsMin);
  const feltEasy = avgRpe == null || avgRpe <= 7.5;

  if (missedBottomOfRange && avgRpe != null && avgRpe >= 9) {
    return {
      status: "deload",
      detail: `Last session missed the target rep range at a high RPE (${avgRpe.toFixed(1)}). Consider reducing weight ~10% or repeating this weight before adding more.`,
      lastWeightKg,
    };
  }

  if (hitTopOfRange && feltEasy) {
    const suggestedWeightKg = Math.round(lastWeightKg * 1.025 * 2) / 2; // ~2.5%, rounded to nearest 0.5kg
    return {
      status: "increase_weight",
      detail: `Hit the top of the rep range comfortably last time. Try ${suggestedWeightKg}kg next session.`,
      lastWeightKg,
      suggestedWeightKg,
    };
  }

  if (missedBottomOfRange) {
    return {
      status: "maintain",
      detail: `Slightly missed the rep range last time — repeat ${lastWeightKg}kg and aim to hit all reps before increasing.`,
      lastWeightKg,
    };
  }

  return {
    status: "maintain",
    detail: `On track — repeat ${lastWeightKg}kg and aim for the top of the rep range before increasing.`,
    lastWeightKg,
  };
}
