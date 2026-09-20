import "server-only";
import { requireUser } from "./profile";
import { getActivePlan, getWorkoutDayByDow, type PlanWithDays, type WorkoutDayWithExercises } from "./plan";
import { getCurrentStreak, getWeeklyStats, type WeeklyStats } from "./sessions";
import { getDayOfWeekInTimezone } from "@/lib/date-tz";
import type { Tables } from "@/lib/types/database.types";

export interface DashboardData {
  plan: PlanWithDays | null;
  today: WorkoutDayWithExercises | null;
  todayInProgressSession: Tables<"workout_sessions"> | null;
  weeklyStats: WeeklyStats;
  streak: number;
  recentPRs: Tables<"personal_records">[];
  latestWeight: Tables<"body_measurements"> | null;
}

export async function getDashboardData(timezone: string): Promise<DashboardData> {
  const { supabase, user } = await requireUser();
  const plan = await getActivePlan();
  const todayDow = getDayOfWeekInTimezone(timezone);
  const today = plan ? getWorkoutDayByDow(plan, todayDow) : null;

  const [{ data: inProgress }, weeklyStats, streak, { data: recentPRs }, { data: latestWeight }] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("*")
      .eq("profile_id", user.id)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getWeeklyStats(plan?.days_per_week ?? 0, timezone),
    getCurrentStreak(plan, timezone),
    supabase
      .from("personal_records")
      .select("*")
      .eq("profile_id", user.id)
      .order("achieved_at", { ascending: false })
      .limit(3),
    supabase
      .from("body_measurements")
      .select("*")
      .eq("profile_id", user.id)
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    plan,
    today,
    todayInProgressSession: inProgress ?? null,
    weeklyStats,
    streak,
    recentPRs: recentPRs ?? [],
    latestWeight: latestWeight ?? null,
  };
}
