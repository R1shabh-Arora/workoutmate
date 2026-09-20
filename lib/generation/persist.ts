import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type { GeneratedPlan } from "./types";

type DbClient = SupabaseClient<Database>;

/**
 * Archives the profile's current active plan (if any) and writes the newly
 * generated one in its place. If anything fails partway through writing days
 * or exercises, the partially-created plan is rolled back (deleted, which
 * cascades) rather than left active and half-empty.
 */
export async function persistPlan(
  supabase: DbClient,
  profileId: string,
  plan: GeneratedPlan,
  source: "system" | "ai" | "user" = "system"
) {
  const { data: insertedPlan, error: planError } = await supabase
    .from("workout_plans")
    .insert({
      profile_id: profileId,
      name: plan.name,
      status: "draft",
      split_type: plan.splitType,
      days_per_week: plan.daysPerWeek,
      primary_goal: plan.primaryGoal,
      source,
    })
    .select()
    .single();

  if (planError || !insertedPlan) {
    throw new Error(`Failed to create workout plan: ${planError?.message}`);
  }

  try {
    for (const day of plan.days) {
      const { data: insertedDay, error: dayError } = await supabase
        .from("workout_days")
        .insert({
          plan_id: insertedPlan.id,
          day_of_week: day.dayOfWeek,
          name: day.name,
          is_rest_day: day.isRestDay,
          focus_muscle_groups: day.focusMuscleGroups,
          estimated_duration_minutes: day.isRestDay ? null : day.estimatedDurationMinutes,
        })
        .select()
        .single();

      if (dayError || !insertedDay) {
        throw new Error(dayError?.message ?? "unknown error creating workout day");
      }

      if (day.exercises.length === 0) continue;

      const rows = day.exercises.map((ex) => ({
        workout_day_id: insertedDay.id,
        exercise_id: ex.exercise.id,
        order_index: ex.orderIndex,
        is_warmup: ex.isWarmup,
        sets: ex.sets,
        reps_min: ex.repsMin,
        reps_max: ex.repsMax,
        duration_seconds: ex.durationSeconds,
        rest_seconds: ex.restSeconds,
        tempo: ex.tempo,
        intensity_guidance: ex.intensityGuidance,
        notes: ex.notes,
      }));

      const { error: exercisesError } = await supabase.from("workout_exercises").insert(rows);
      if (exercisesError) {
        throw new Error(exercisesError.message);
      }
    }
  } catch (err) {
    await supabase.from("workout_plans").delete().eq("id", insertedPlan.id);
    throw new Error(`Failed to build workout plan, rolled back: ${err instanceof Error ? err.message : err}`);
  }

  // Only swap the active plan once the new one is fully, successfully built.
  await supabase.from("workout_plans").update({ status: "archived" }).eq("profile_id", profileId).eq("status", "active");
  const { data: activated, error: activateError } = await supabase
    .from("workout_plans")
    .update({ status: "active" })
    .eq("id", insertedPlan.id)
    .select()
    .single();

  if (activateError || !activated) {
    throw new Error(`Failed to activate new plan: ${activateError?.message}`);
  }

  return activated;
}
