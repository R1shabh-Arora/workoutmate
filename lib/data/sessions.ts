import "server-only";
import { requireUser } from "./profile";
import { getDateStringInTimezone, getDayOfWeekInTimezone, getStartOfWeekIso } from "@/lib/date-tz";
import type { PlanWithDays } from "./plan";
import type { Tables } from "@/lib/types/database.types";

export interface WeeklyStats {
  completed: number;
  planned: number;
  completionPct: number;
  totalVolumeKg: number;
}

export async function getWeeklyStats(daysPerWeek: number, timezone: string): Promise<WeeklyStats> {
  const { supabase, user } = await requireUser();
  const weekStartIso = getStartOfWeekIso(timezone);

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("total_volume_kg")
    .eq("profile_id", user.id)
    .eq("status", "completed")
    .gte("started_at", weekStartIso);

  const completed = sessions?.length ?? 0;
  const totalVolumeKg = (sessions ?? []).reduce((sum, s) => sum + (s.total_volume_kg ?? 0), 0);

  return {
    completed,
    planned: daysPerWeek,
    completionPct: daysPerWeek > 0 ? Math.min(100, Math.round((completed / daysPerWeek) * 100)) : 0,
    totalVolumeKg,
  };
}

/**
 * Consecutive-day streak, counting backward from today. Rest days in the
 * plan don't break the streak; a missed *training* day does. If today is a
 * training day that hasn't been logged yet, we still count from yesterday —
 * there's time left in the day.
 */
export async function getCurrentStreak(plan: PlanWithDays | null, timezone: string): Promise<number> {
  const { supabase, user } = await requireUser();
  if (!plan) return 0;

  const trainingDows = new Set(plan.days.filter((d) => !d.is_rest_day).map((d) => d.day_of_week));
  if (trainingDows.size === 0) return 0;

  const since = new Date();
  since.setDate(since.getDate() - 60);

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("started_at")
    .eq("profile_id", user.id)
    .eq("status", "completed")
    .gte("started_at", since.toISOString());

  const completedDates = new Set((sessions ?? []).map((s) => getDateStringInTimezone(timezone, new Date(s.started_at))));

  const cursor = new Date();
  const todayDow = getDayOfWeekInTimezone(timezone, cursor);
  const todayStr = getDateStringInTimezone(timezone, cursor);

  if (trainingDows.has(todayDow) && !completedDates.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const dow = getDayOfWeekInTimezone(timezone, cursor);
    const dateStr = getDateStringInTimezone(timezone, cursor);

    if (trainingDows.has(dow)) {
      if (completedDates.has(dateStr)) {
        streak++;
      } else {
        break;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export async function getRecentSessions(limit = 10): Promise<Tables<"workout_sessions">[]> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("profile_id", user.id)
    .order("started_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export type SetLogWithExercise = Tables<"set_logs"> & { exercise: Tables<"exercises"> };

export async function getSessionWithLogs(sessionId: string) {
  const { supabase, user } = await requireUser();

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!session) return null;

  const { data: logs } = await supabase
    .from("set_logs")
    .select("*")
    .eq("session_id", sessionId)
    .order("completed_at");

  const exerciseIds = Array.from(new Set((logs ?? []).map((l) => l.exercise_id)));
  const { data: exercises } =
    exerciseIds.length > 0 ? await supabase.from("exercises").select("*").in("id", exerciseIds) : { data: [] };
  const exerciseById = new Map((exercises ?? []).map((e) => [e.id, e]));

  const logsWithExercise: SetLogWithExercise[] = (logs ?? [])
    .map((log) => {
      const exercise = exerciseById.get(log.exercise_id);
      return exercise ? { ...log, exercise } : null;
    })
    .filter((l): l is SetLogWithExercise => l !== null);

  return { session, logs: logsWithExercise };
}

/** All logged sets for one exercise, most recent first — used for exercise history and progression. */
export async function getExerciseHistory(exerciseId: string, limit = 50): Promise<Tables<"set_logs">[]> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("set_logs")
    .select("*")
    .eq("profile_id", user.id)
    .eq("exercise_id", exerciseId)
    .eq("is_completed", true)
    .order("completed_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

/** Most recent logged set per exercise (from any prior session) — powers the "Last: 60kg x 8" hint while logging. */
export async function getLastPerformanceMap(
  exerciseIds: string[],
  excludeSessionId?: string
): Promise<Map<string, Tables<"set_logs">>> {
  const { supabase, user } = await requireUser();
  const map = new Map<string, Tables<"set_logs">>();
  if (exerciseIds.length === 0) return map;

  let query = supabase
    .from("set_logs")
    .select("*")
    .eq("profile_id", user.id)
    .in("exercise_id", exerciseIds)
    .eq("is_completed", true)
    .order("completed_at", { ascending: false })
    .limit(300);

  if (excludeSessionId) query = query.neq("session_id", excludeSessionId);

  const { data } = await query;
  for (const log of data ?? []) {
    if (!map.has(log.exercise_id)) map.set(log.exercise_id, log);
  }
  return map;
}
