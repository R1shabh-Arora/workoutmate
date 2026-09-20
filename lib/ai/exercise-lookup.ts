import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type { Tables } from "@/lib/types/database.types";

type DbClient = SupabaseClient<Database>;

/** Fuzzy-matches a free-text exercise name (as an LLM would phrase it) against the library. */
export async function findExerciseByName(supabase: DbClient, name: string): Promise<Tables<"exercises"> | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: exact } = await supabase.from("exercises").select("*").ilike("name", trimmed).eq("is_active", true).maybeSingle();
  if (exact) return exact;

  const { data: partial } = await supabase
    .from("exercises")
    .select("*")
    .ilike("name", `%${trimmed}%`)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return partial ?? null;
}

/** Finds a workout_exercise row (a specific exercise placement in the active plan) by exercise name, optionally scoped to a named day. */
export async function findWorkoutExerciseByName(
  supabase: DbClient,
  profileId: string,
  exerciseName: string,
  dayName?: string
) {
  const exercise = await findExerciseByName(supabase, exerciseName);
  if (!exercise) return { exercise: null, workoutExercise: null, day: null };

  const { data: plan } = await supabase
    .from("workout_plans")
    .select("id")
    .eq("profile_id", profileId)
    .eq("status", "active")
    .maybeSingle();
  if (!plan) return { exercise, workoutExercise: null, day: null };

  let dayQuery = supabase.from("workout_days").select("*").eq("plan_id", plan.id).eq("is_rest_day", false);
  if (dayName) dayQuery = dayQuery.ilike("name", `%${dayName}%`);
  const { data: days } = await dayQuery;

  for (const day of days ?? []) {
    const { data: workoutExercise } = await supabase
      .from("workout_exercises")
      .select("*")
      .eq("workout_day_id", day.id)
      .eq("exercise_id", exercise.id)
      .maybeSingle();
    if (workoutExercise) return { exercise, workoutExercise, day };
  }

  return { exercise, workoutExercise: null, day: null };
}
