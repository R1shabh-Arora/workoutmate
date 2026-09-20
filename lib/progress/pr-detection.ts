import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { computeExercisePRs, computeSessionPRs } from "./pr-logic";

type DbClient = SupabaseClient<Database>;

/**
 * Compares this session's logged sets against the user's own history and
 * records any personal records broken. Every value here is derived from
 * real logged data — nothing is estimated beyond the standard Epley 1RM
 * formula, and nothing is fabricated. The actual comparison math lives in
 * pr-logic.ts (pure, unit-tested); this file is just the DB plumbing.
 */
export async function detectAndRecordPRs(supabase: DbClient, profileId: string, sessionId: string) {
  const { data: sessionLogs } = await supabase
    .from("set_logs")
    .select("*")
    .eq("session_id", sessionId)
    .eq("is_completed", true);

  if (!sessionLogs || sessionLogs.length === 0) return [];

  type NewPR = Database["public"]["Tables"]["personal_records"]["Insert"];
  const newPRs: NewPR[] = [];

  const exerciseIds = Array.from(new Set(sessionLogs.map((l) => l.exercise_id)));

  for (const exerciseId of exerciseIds) {
    const sessionSets = sessionLogs.filter((l) => l.exercise_id === exerciseId).map((l) => ({ weightKg: l.weight_kg, reps: l.reps }));

    const { data: historical } = await supabase
      .from("set_logs")
      .select("weight_kg, reps")
      .eq("profile_id", profileId)
      .eq("exercise_id", exerciseId)
      .eq("is_completed", true)
      .neq("session_id", sessionId)
      .not("weight_kg", "is", null)
      .not("reps", "is", null);

    const historicalSets = (historical ?? []).map((l) => ({ weightKg: l.weight_kg, reps: l.reps }));
    const exercisePRs = computeExercisePRs(sessionSets, historicalSets);

    for (const pr of exercisePRs) {
      newPRs.push({
        profile_id: profileId,
        exercise_id: exerciseId,
        record_type: pr.recordType,
        value: pr.value,
        unit: pr.unit,
        reps_at_weight: pr.repsAtWeight ?? null,
        session_id: sessionId,
      });
    }
  }

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("duration_seconds, total_volume_kg")
    .eq("id", sessionId)
    .single();

  if (session) {
    const { data: pastSessions } = await supabase
      .from("workout_sessions")
      .select("duration_seconds, total_volume_kg")
      .eq("profile_id", profileId)
      .eq("status", "completed")
      .neq("id", sessionId);

    const sessionPRs = computeSessionPRs(
      { durationSeconds: session.duration_seconds, totalVolumeKg: session.total_volume_kg },
      (pastSessions ?? []).map((s) => ({ durationSeconds: s.duration_seconds, totalVolumeKg: s.total_volume_kg }))
    );

    for (const pr of sessionPRs) {
      newPRs.push({ profile_id: profileId, record_type: pr.recordType, value: pr.value, unit: pr.unit, session_id: sessionId });
    }
  }

  if (newPRs.length > 0) {
    await supabase.from("personal_records").insert(newPRs);
  }

  return newPRs;
}
