// Pure PR-comparison logic, free of any DB dependency so it's directly
// unit-testable. lib/progress/pr-detection.ts (server-only) fetches the
// session's and the user's historical logs, then delegates here.
import { estimateOneRepMax } from "@/lib/utils";

export interface SetResult {
  weightKg: number | null;
  reps: number | null;
}

export interface ExercisePR {
  recordType: "max_weight" | "est_1rm";
  value: number;
  unit: "kg";
  repsAtWeight?: number | null;
}

/** Compares this session's sets for one exercise against that exercise's prior history. Returns only the records actually broken. */
export function computeExercisePRs(sessionSets: SetResult[], historicalSets: SetResult[]): ExercisePR[] {
  const valid = sessionSets.filter((s): s is { weightKg: number; reps: number } => s.weightKg != null && s.reps != null);
  if (valid.length === 0) return [];

  const sessionMaxWeight = Math.max(...valid.map((s) => s.weightKg));
  const sessionBest1RM = Math.max(...valid.map((s) => estimateOneRepMax(s.weightKg, s.reps)));

  const validHistory = historicalSets.filter((s): s is { weightKg: number; reps: number } => s.weightKg != null && s.reps != null);
  const historicalMaxWeight = Math.max(0, ...validHistory.map((s) => s.weightKg));
  const historicalBest1RM = Math.max(0, ...validHistory.map((s) => estimateOneRepMax(s.weightKg, s.reps)));

  const prs: ExercisePR[] = [];

  if (sessionMaxWeight > historicalMaxWeight) {
    const bestSet = valid.find((s) => s.weightKg === sessionMaxWeight);
    prs.push({ recordType: "max_weight", value: sessionMaxWeight, unit: "kg", repsAtWeight: bestSet?.reps ?? null });
  }

  if (sessionBest1RM > historicalBest1RM) {
    prs.push({ recordType: "est_1rm", value: Math.round(sessionBest1RM * 10) / 10, unit: "kg" });
  }

  return prs;
}

export interface SessionResult {
  durationSeconds: number | null;
  totalVolumeKg: number | null;
}

export interface SessionPR {
  recordType: "longest_workout" | "max_volume_single_session";
  value: number;
  unit: "minutes" | "kg";
}

/** Compares this session's duration/volume against the user's prior sessions. */
export function computeSessionPRs(session: SessionResult, pastSessions: SessionResult[]): SessionPR[] {
  const maxDuration = Math.max(0, ...pastSessions.map((s) => s.durationSeconds ?? 0));
  const maxVolume = Math.max(0, ...pastSessions.map((s) => s.totalVolumeKg ?? 0));
  const prs: SessionPR[] = [];

  if (session.durationSeconds && session.durationSeconds > maxDuration) {
    prs.push({ recordType: "longest_workout", value: Math.round(session.durationSeconds / 60), unit: "minutes" });
  }
  if (session.totalVolumeKg && session.totalVolumeKg > maxVolume) {
    prs.push({ recordType: "max_volume_single_session", value: session.totalVolumeKg, unit: "kg" });
  }

  return prs;
}
