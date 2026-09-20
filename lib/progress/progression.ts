import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { computeProgressionRecommendation, type ProgressionRecommendation } from "./progression-logic";

export type { ProgressionRecommendation };

type DbClient = SupabaseClient<Database>;

/** Fetches the exercise's most recent logged session, then delegates the actual recommendation to the pure, unit-tested logic. */
export async function recommendProgression(
  supabase: DbClient,
  profileId: string,
  exerciseId: string,
  prescribedRepsMin: number | null,
  prescribedRepsMax: number | null
): Promise<ProgressionRecommendation> {
  const { data: logs } = await supabase
    .from("set_logs")
    .select("*")
    .eq("profile_id", profileId)
    .eq("exercise_id", exerciseId)
    .eq("is_completed", true)
    .order("completed_at", { ascending: false })
    .limit(20);

  if (!logs || logs.length === 0) {
    return { status: "insufficient_data", detail: "No logged sets yet for this exercise — log a session first." };
  }

  const mostRecentSessionId = logs[0]!.session_id;
  const lastSets = logs
    .filter((l) => l.session_id === mostRecentSessionId && l.weight_kg != null && l.reps != null)
    .map((l) => ({ weightKg: l.weight_kg!, reps: l.reps!, rpe: l.rpe }));

  if (lastSets.length === 0) {
    return { status: "insufficient_data", detail: "The most recent log for this exercise is missing weight or reps." };
  }

  return computeProgressionRecommendation(lastSets, prescribedRepsMin, prescribedRepsMax);
}
