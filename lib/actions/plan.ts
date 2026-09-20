"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/data/profile";

/** Swaps one exercise in the plan for another — used by "My Plan"'s swap dialog and the AI coach tool. */
export async function swapExercise(workoutExerciseId: string, newExerciseId: string) {
  const { supabase, user } = await requireUser();

  const { data: workoutExercise } = await supabase
    .from("workout_exercises")
    .select("*")
    .eq("id", workoutExerciseId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!workoutExercise) {
    throw new Error("That exercise could not be found in your plan.");
  }

  const { error } = await supabase
    .from("workout_exercises")
    .update({ exercise_id: newExerciseId })
    .eq("id", workoutExerciseId)
    .eq("profile_id", user.id);

  if (error) {
    console.error("[swapExercise] failed:", error.message);
    throw new Error("We couldn't swap that exercise. Please try again.");
  }

  await supabase.from("analytics_events").insert({
    profile_id: user.id,
    event_name: "exercise_swapped",
    properties: { from_workout_exercise_id: workoutExerciseId },
  });

  revalidatePath("/plan");
  revalidatePath("/dashboard");
}

/** Swaps the calendar day two workout_days occupy (e.g. move "Push" from Monday to Tuesday). Atomic — see the swap_workout_days() Postgres function. */
export async function swapWorkoutDays(dayIdA: string, dayIdB: string) {
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("swap_workout_days", { day_id_a: dayIdA, day_id_b: dayIdB });

  if (error) {
    console.error("[swapWorkoutDays] failed:", error.message);
    throw new Error("We couldn't move that workout. Please try again.");
  }

  revalidatePath("/plan");
  revalidatePath("/dashboard");
}

export async function updateExercisePrescription(
  workoutExerciseId: string,
  patch: { sets?: number; repsMin?: number | null; repsMax?: number | null; restSeconds?: number; notes?: string | null }
) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("workout_exercises")
    .update({
      ...(patch.sets !== undefined && { sets: patch.sets }),
      ...(patch.repsMin !== undefined && { reps_min: patch.repsMin }),
      ...(patch.repsMax !== undefined && { reps_max: patch.repsMax }),
      ...(patch.restSeconds !== undefined && { rest_seconds: patch.restSeconds }),
      ...(patch.notes !== undefined && { notes: patch.notes }),
    })
    .eq("id", workoutExerciseId)
    .eq("profile_id", user.id);

  if (error) {
    console.error("[updateExercisePrescription] failed:", error.message);
    throw new Error("We couldn't update that exercise. Please try again.");
  }

  revalidatePath("/plan");
}
