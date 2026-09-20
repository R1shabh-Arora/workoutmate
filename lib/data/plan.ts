import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "./profile";
import type { Database, Tables } from "@/lib/types/database.types";

type DbClient = SupabaseClient<Database>;

export type WorkoutExerciseWithDetails = Tables<"workout_exercises"> & { exercise: Tables<"exercises"> };
export type WorkoutDayWithExercises = Tables<"workout_days"> & { exercises: WorkoutExerciseWithDetails[] };
export type PlanWithDays = Tables<"workout_plans"> & { days: WorkoutDayWithExercises[] };

/** Loads the signed-in user's active plan with every day and exercise, fully joined and typed. */
export async function getActivePlan(): Promise<PlanWithDays | null> {
  const { supabase, user } = await requireUser();
  return getActivePlanForUser(supabase, user.id);
}

/**
 * Same as getActivePlan(), but takes an already-authenticated client instead
 * of calling requireUser() itself. Use this from a caller (like the AI coach
 * route) that has already authenticated once this request — requireUser()
 * builds a fresh Supabase client and makes its own network round-trip to
 * re-verify the session, which is wasted work if that's already been done,
 * and compounds fast across a multi-tool-call coach turn.
 */
export async function getActivePlanForUser(supabase: DbClient, userId: string): Promise<PlanWithDays | null> {
  const { data: plan } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("profile_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!plan) return null;

  const { data: days } = await supabase
    .from("workout_days")
    .select("*")
    .eq("plan_id", plan.id)
    .order("day_of_week");

  if (!days || days.length === 0) return { ...plan, days: [] };

  const dayIds = days.map((d) => d.id);
  const { data: workoutExercises } = await supabase
    .from("workout_exercises")
    .select("*")
    .in("workout_day_id", dayIds)
    .order("order_index");

  const exerciseIds = Array.from(new Set((workoutExercises ?? []).map((e) => e.exercise_id)));
  const { data: exerciseDetails } =
    exerciseIds.length > 0 ? await supabase.from("exercises").select("*").in("id", exerciseIds) : { data: [] };

  const exerciseById = new Map((exerciseDetails ?? []).map((e) => [e.id, e]));

  const days_: WorkoutDayWithExercises[] = days.map((day) => ({
    ...day,
    exercises: (workoutExercises ?? [])
      .filter((ex) => ex.workout_day_id === day.id)
      .map((ex) => {
        const exercise = exerciseById.get(ex.exercise_id);
        return exercise ? { ...ex, exercise } : null;
      })
      .filter((ex): ex is WorkoutExerciseWithDetails => ex !== null),
  }));

  return { ...plan, days: days_ };
}

export function getWorkoutDayByDow(plan: PlanWithDays, dayOfWeek: number): WorkoutDayWithExercises | null {
  return plan.days.find((d) => d.day_of_week === dayOfWeek) ?? null;
}

/** Loads a single workout day with its exercises joined — used by the workout execution screen. */
export async function getWorkoutDay(dayId: string): Promise<WorkoutDayWithExercises | null> {
  const { supabase, user } = await requireUser();

  const { data: day } = await supabase
    .from("workout_days")
    .select("*")
    .eq("id", dayId)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!day) return null;

  const { data: workoutExercises } = await supabase
    .from("workout_exercises")
    .select("*")
    .eq("workout_day_id", dayId)
    .order("order_index");

  const exerciseIds = Array.from(new Set((workoutExercises ?? []).map((e) => e.exercise_id)));
  const { data: exerciseDetails } =
    exerciseIds.length > 0 ? await supabase.from("exercises").select("*").in("id", exerciseIds) : { data: [] };
  const exerciseById = new Map((exerciseDetails ?? []).map((e) => [e.id, e]));

  const exercises: WorkoutExerciseWithDetails[] = (workoutExercises ?? [])
    .map((ex) => {
      const exercise = exerciseById.get(ex.exercise_id);
      return exercise ? { ...ex, exercise } : null;
    })
    .filter((ex): ex is WorkoutExerciseWithDetails => ex !== null);

  return { ...day, exercises };
}
