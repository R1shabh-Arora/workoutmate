"use server";

import { requireUser } from "@/lib/data/profile";
import { onboardingSchema, type OnboardingData } from "@/lib/validations/onboarding";
import { generatePlan } from "@/lib/generation/engine";
import { persistPlan } from "@/lib/generation/persist";
import type { GenerationInput } from "@/lib/generation/types";

export async function completeOnboarding(rawData: OnboardingData) {
  const parsed = onboardingSchema.safeParse(rawData);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Please check your answers and try again.");
  }
  const data = parsed.data;

  const { supabase, user } = await requireUser();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      first_name: data.firstName,
      date_of_birth: data.dateOfBirth,
      sex: data.sex,
      units: data.units,
      height_cm: data.heightCm,
      weight_kg: data.weightKg,
      experience_level: data.experienceLevel,
      activity_level: data.activityLevel,
      sleep_hours: data.sleepHours,
      onboarding_step: 100,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) {
    console.error("[completeOnboarding] profile update failed:", profileError.message);
    throw new Error("We couldn't save your profile. Please try again.");
  }

  await supabase.from("fitness_goals").delete().eq("profile_id", user.id);
  const { error: goalsError } = await supabase.from("fitness_goals").insert(
    data.goals.map((goal) => ({ profile_id: user.id, goal, is_primary: goal === data.primaryGoal }))
  );
  if (goalsError) {
    console.error("[completeOnboarding] goals insert failed:", goalsError.message);
    throw new Error("We couldn't save your goals. Please try again.");
  }

  const { error: prefsError } = await supabase.from("training_preferences").upsert({
    profile_id: user.id,
    days_per_week: data.daysPerWeek,
    preferred_days: data.preferredDays,
    workout_duration: data.workoutDuration,
    preferred_time: data.preferredTime,
    split_type: data.splitType,
    location: data.location,
    equipment: data.equipment,
    preferred_exercises: data.preferredExercises,
    disliked_exercises: data.dislikedExercises,
    training_style: data.trainingStyle,
    cardio_preference: data.cardioPreference,
  });
  if (prefsError) {
    console.error("[completeOnboarding] preferences upsert failed:", prefsError.message);
    throw new Error("We couldn't save your training preferences. Please try again.");
  }

  const { error: limitationsError } = await supabase.from("physical_limitations").upsert({
    profile_id: user.id,
    injuries: data.injuries || null,
    limitations: data.limitations || null,
    avoid_exercises: data.avoidExercises,
  });
  if (limitationsError) {
    console.error("[completeOnboarding] limitations upsert failed:", limitationsError.message);
    throw new Error("We couldn't save your limitations. Please try again.");
  }

  const { data: exercisePool, error: exercisesError } = await supabase
    .from("exercises")
    .select("*")
    .eq("is_active", true);

  if (exercisesError || !exercisePool || exercisePool.length === 0) {
    console.error("[completeOnboarding] exercise pool fetch failed:", exercisesError?.message);
    throw new Error("We couldn't load the exercise library. Please try again shortly.");
  }

  const generationInput: GenerationInput = {
    experienceLevel: data.experienceLevel,
    primaryGoal: data.primaryGoal,
    goals: data.goals,
    daysPerWeek: data.daysPerWeek,
    preferredDays: data.preferredDays,
    workoutDuration: data.workoutDuration,
    splitType: data.splitType,
    trainingStyle: data.trainingStyle,
    cardioPreference: data.cardioPreference,
    equipment: data.equipment,
    preferredExercises: data.preferredExercises,
    dislikedExercises: data.dislikedExercises,
    avoidExercises: data.avoidExercises,
  };

  const plan = generatePlan(generationInput, exercisePool);
  await persistPlan(supabase, user.id, plan, "system");

  await supabase.from("analytics_events").insert({
    profile_id: user.id,
    event_name: "onboarding_completed",
    properties: { days_per_week: data.daysPerWeek, split_type: plan.splitType, primary_goal: data.primaryGoal },
  });
}
