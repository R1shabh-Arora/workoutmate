"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/data/profile";
import { generatePlan } from "@/lib/generation/engine";
import { persistPlan } from "@/lib/generation/persist";
import type { GenerationInput } from "@/lib/generation/types";
import {
  ACTIVITY_LEVELS,
  CARDIO_PREFERENCES,
  EXPERIENCE_LEVELS,
  LOCATIONS,
  SPLIT_TYPES,
  TRAINING_STYLES,
  UNITS_OPTIONS,
  WORKOUT_DURATIONS,
} from "@/lib/types/enums";

const personalSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  units: z.enum(UNITS_OPTIONS),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(30).max(300),
  experienceLevel: z.enum(EXPERIENCE_LEVELS),
  activityLevel: z.enum(ACTIVITY_LEVELS),
});

export async function updatePersonalDetails(input: z.infer<typeof personalSchema>) {
  const data = personalSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: data.firstName,
      units: data.units,
      height_cm: data.heightCm,
      weight_kg: data.weightKg,
      experience_level: data.experienceLevel,
      activity_level: data.activityLevel,
    })
    .eq("id", user.id);
  if (error) throw new Error("Couldn't save your details.");
  revalidatePath("/settings");
  revalidatePath("/profile");
}

const preferencesSchema = z.object({
  daysPerWeek: z.number().int().min(1).max(7),
  workoutDuration: z.enum(WORKOUT_DURATIONS),
  splitType: z.enum(SPLIT_TYPES),
  location: z.enum(LOCATIONS),
  trainingStyle: z.enum(TRAINING_STYLES),
  cardioPreference: z.enum(CARDIO_PREFERENCES),
  equipment: z.array(z.string()),
});

/** Saves training preferences, then always regenerates the plan — these fields directly shape the generation engine's output. */
export async function updateTrainingPreferences(input: z.infer<typeof preferencesSchema>) {
  const data = preferencesSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("training_preferences")
    .update({
      days_per_week: data.daysPerWeek,
      workout_duration: data.workoutDuration,
      split_type: data.splitType,
      location: data.location,
      training_style: data.trainingStyle,
      cardio_preference: data.cardioPreference,
      equipment: data.equipment,
    })
    .eq("profile_id", user.id);
  if (error) throw new Error("Couldn't save your preferences.");

  await regeneratePlan();
  revalidatePath("/settings");
}

/** Rebuilds the active plan from the profile's current goals/preferences — used after settings changes and available as a manual "Regenerate" action. */
export async function regeneratePlan() {
  const { supabase, user } = await requireUser();

  const [{ data: profile }, { data: prefs }, { data: goals }, { data: limitations }, { data: exercisePool }] = await Promise.all([
    supabase.from("profiles").select("experience_level").eq("id", user.id).single(),
    supabase.from("training_preferences").select("*").eq("profile_id", user.id).maybeSingle(),
    supabase.from("fitness_goals").select("goal, is_primary").eq("profile_id", user.id),
    supabase.from("physical_limitations").select("avoid_exercises").eq("profile_id", user.id).maybeSingle(),
    supabase.from("exercises").select("*").eq("is_active", true),
  ]);

  if (!profile?.experience_level || !prefs || !prefs.days_per_week || !prefs.workout_duration || !prefs.split_type || !prefs.training_style || !prefs.cardio_preference) {
    throw new Error("Your profile is missing information needed to build a plan.");
  }

  const primaryGoal = goals?.find((g) => g.is_primary)?.goal ?? "improve_general_fitness";

  const input: GenerationInput = {
    experienceLevel: profile.experience_level,
    primaryGoal,
    goals: (goals ?? []).map((g) => g.goal),
    daysPerWeek: prefs.days_per_week,
    preferredDays: prefs.preferred_days,
    workoutDuration: prefs.workout_duration,
    splitType: prefs.split_type,
    trainingStyle: prefs.training_style,
    cardioPreference: prefs.cardio_preference,
    equipment: prefs.equipment as string[],
    preferredExercises: prefs.preferred_exercises,
    dislikedExercises: prefs.disliked_exercises,
    avoidExercises: limitations?.avoid_exercises ?? [],
  };

  const plan = generatePlan(input, exercisePool ?? []);
  await persistPlan(supabase, user.id, plan, "user");

  revalidatePath("/plan");
  revalidatePath("/dashboard");
}

export async function updateNotificationPreferences(patch: {
  workoutReminders?: boolean;
  restDayReminders?: boolean;
  weeklyReview?: boolean;
  streakReminders?: boolean;
  goalReminders?: boolean;
}) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("notification_preferences")
    .update({
      ...(patch.workoutReminders !== undefined && { workout_reminders: patch.workoutReminders }),
      ...(patch.restDayReminders !== undefined && { rest_day_reminders: patch.restDayReminders }),
      ...(patch.weeklyReview !== undefined && { weekly_review: patch.weeklyReview }),
      ...(patch.streakReminders !== undefined && { streak_reminders: patch.streakReminders }),
      ...(patch.goalReminders !== undefined && { goal_reminders: patch.goalReminders }),
    })
    .eq("profile_id", user.id);
  if (error) throw new Error("Couldn't save notification settings.");
  revalidatePath("/settings");
}

export async function updateAiCoachTone(tone: "balanced" | "encouraging" | "direct") {
  const { supabase, user } = await requireUser();
  await supabase.from("profiles").update({ ai_coach_tone: tone }).eq("id", user.id);
  revalidatePath("/settings");
}
