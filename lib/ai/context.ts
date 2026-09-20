import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { getActivePlan, getWorkoutDayByDow } from "@/lib/data/plan";
import { getCurrentStreak, getWeeklyStats } from "@/lib/data/sessions";
import { getDayOfWeekInTimezone } from "@/lib/date-tz";
import { calculateAge } from "@/lib/utils";
import { GOAL_LABELS, type FitnessGoal } from "@/lib/types/enums";

type DbClient = SupabaseClient<Database>;

/**
 * Builds a *condensed* context block for the system prompt — never the whole
 * database. Full history is reachable through tools on demand, keeping every
 * request's token cost small and predictable.
 */
export async function buildCoachContext(supabase: DbClient, userId: string): Promise<string> {
  const [{ data: profile }, { data: goals }, { data: limitations }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("fitness_goals").select("goal, is_primary").eq("profile_id", userId),
    supabase.from("physical_limitations").select("*").eq("profile_id", userId).maybeSingle(),
  ]);

  if (!profile) return "No profile found for this user.";

  const plan = await getActivePlan();
  const todayDow = getDayOfWeekInTimezone(profile.timezone);
  const today = plan ? getWorkoutDayByDow(plan, todayDow) : null;
  const [weeklyStats, streak] = await Promise.all([
    getWeeklyStats(plan?.days_per_week ?? 0, profile.timezone),
    getCurrentStreak(plan, profile.timezone),
  ]);

  const primaryGoal = goals?.find((g) => g.is_primary)?.goal as FitnessGoal | undefined;
  const otherGoals = (goals ?? []).filter((g) => !g.is_primary).map((g) => GOAL_LABELS[g.goal as FitnessGoal]);

  const TONE_INSTRUCTIONS: Record<string, string> = {
    encouraging: "The user asked for a more encouraging, upbeat tone — lean into positive reinforcement while staying honest.",
    direct: "The user asked for a more direct, no-fluff tone — be brief and skip the encouragement framing.",
    balanced: "",
  };

  const lines: string[] = [];
  lines.push(`## User context (${new Date().toISOString().split("T")[0]})`);
  lines.push(`Name: ${profile.first_name || "the user"}`);
  if (TONE_INSTRUCTIONS[profile.ai_coach_tone]) lines.push(TONE_INSTRUCTIONS[profile.ai_coach_tone]!);
  if (profile.date_of_birth) lines.push(`Age: ${calculateAge(profile.date_of_birth)}`);
  if (profile.experience_level) lines.push(`Experience: ${profile.experience_level}`);
  if (primaryGoal) lines.push(`Primary goal: ${GOAL_LABELS[primaryGoal]}`);
  if (otherGoals.length > 0) lines.push(`Other goals: ${otherGoals.join(", ")}`);
  lines.push(`Units preference: ${profile.units}`);

  if (limitations && (limitations.injuries || limitations.limitations || limitations.avoid_exercises.length > 0)) {
    lines.push(`\n## Physical limitations (never ignore these)`);
    if (limitations.injuries) lines.push(`Injuries: ${limitations.injuries}`);
    if (limitations.limitations) lines.push(`Other limitations: ${limitations.limitations}`);
    if (limitations.avoid_exercises.length > 0) lines.push(`Exercises to avoid: ${limitations.avoid_exercises.join(", ")}`);
  }

  if (plan) {
    lines.push(`\n## Current plan`);
    lines.push(`"${plan.name}" — ${plan.split_type}, ${plan.days_per_week} days/week`);
    lines.push(
      `Week structure: ${plan.days
        .map((d) => `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.day_of_week]}=${d.is_rest_day ? "Rest" : d.name}`)
        .join(", ")}`
    );
  } else {
    lines.push(`\n## Current plan\nNo active plan yet.`);
  }

  if (today && !today.is_rest_day) {
    lines.push(`\n## Today's workout (${today.name})`);
    lines.push(`${today.estimated_duration_minutes ?? "?"} min, ${today.exercises.length} exercises:`);
    for (const ex of today.exercises) {
      lines.push(
        `- ${ex.exercise.name}: ${ex.sets}x${ex.reps_min ?? "?"}-${ex.reps_max ?? "?"}, ${ex.rest_seconds}s rest${ex.notes ? ` (${ex.notes})` : ""}`
      );
    }
  } else if (today?.is_rest_day) {
    lines.push(`\n## Today\nScheduled rest day.`);
  }

  lines.push(`\n## Recent consistency`);
  lines.push(`This week: ${weeklyStats.completed}/${weeklyStats.planned} workouts completed. Current streak: ${streak} days.`);

  return lines.join("\n");
}
