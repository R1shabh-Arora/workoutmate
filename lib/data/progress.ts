import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { startOfWeek, subDays, subWeeks, format } from "date-fns";
import { requireUser } from "./profile";
import type { Database, Tables } from "@/lib/types/database.types";

type DbClient = SupabaseClient<Database>;

export async function getWeightHistory(days = 90): Promise<Tables<"body_measurements">[]> {
  const { supabase, user } = await requireUser();
  return getWeightHistoryForUser(supabase, user.id, days);
}

/** Same as getWeightHistory(), but takes an already-authenticated client — see getActivePlanForUser() for why. */
export async function getWeightHistoryForUser(supabase: DbClient, userId: string, days = 90): Promise<Tables<"body_measurements">[]> {
  const since = subDays(new Date(), days).toISOString().split("T")[0];
  const { data } = await supabase
    .from("body_measurements")
    .select("*")
    .eq("profile_id", userId)
    .gte("measured_at", since)
    .order("measured_at", { ascending: true });
  return data ?? [];
}

export interface WeekPoint {
  weekStart: string; // yyyy-MM-dd
  label: string; // e.g. "Mar 3"
  value: number;
}

export async function getVolumeByWeek(weeks = 10): Promise<WeekPoint[]> {
  const { supabase, user } = await requireUser();
  return getVolumeByWeekForUser(supabase, user.id, weeks);
}

/** Same as getVolumeByWeek(), but takes an already-authenticated client — see getActivePlanForUser() for why. */
export async function getVolumeByWeekForUser(supabase: DbClient, userId: string, weeks = 10): Promise<WeekPoint[]> {
  const since = subWeeks(new Date(), weeks).toISOString();

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("started_at, total_volume_kg")
    .eq("profile_id", userId)
    .eq("status", "completed")
    .gte("started_at", since);

  return bucketByWeek(sessions ?? [], weeks, (s) => new Date(s.started_at), (s) => s.total_volume_kg ?? 0);
}

export async function getFrequencyByWeek(weeks = 10): Promise<WeekPoint[]> {
  const { supabase, user } = await requireUser();
  const since = subWeeks(new Date(), weeks).toISOString();

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("started_at")
    .eq("profile_id", user.id)
    .eq("status", "completed")
    .gte("started_at", since);

  return bucketByWeek(sessions ?? [], weeks, (s) => new Date(s.started_at), () => 1);
}

function bucketByWeek<T>(rows: T[], weeks: number, getDate: (row: T) => Date, getValue: (row: T) => number): WeekPoint[] {
  const buckets = new Map<string, number>();
  const now = new Date();

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i));
    buckets.set(format(weekStart, "yyyy-MM-dd"), 0);
  }

  for (const row of rows) {
    const weekStart = format(startOfWeek(getDate(row)), "yyyy-MM-dd");
    if (buckets.has(weekStart)) {
      buckets.set(weekStart, (buckets.get(weekStart) ?? 0) + getValue(row));
    }
  }

  return Array.from(buckets.entries()).map(([weekStart, value]) => ({
    weekStart,
    label: format(new Date(weekStart), "MMM d"),
    value: Math.round(value * 10) / 10,
  }));
}

export async function getAllPRs(): Promise<(Tables<"personal_records"> & { exercise: Tables<"exercises"> | null })[]> {
  const { supabase, user } = await requireUser();
  return getAllPRsForUser(supabase, user.id);
}

/** Same as getAllPRs(), but takes an already-authenticated client — see getActivePlanForUser() for why. */
export async function getAllPRsForUser(
  supabase: DbClient,
  userId: string
): Promise<(Tables<"personal_records"> & { exercise: Tables<"exercises"> | null })[]> {
  const { data: prs } = await supabase
    .from("personal_records")
    .select("*")
    .eq("profile_id", userId)
    .order("achieved_at", { ascending: false })
    .limit(50);

  const exerciseIds = Array.from(new Set((prs ?? []).map((p) => p.exercise_id).filter((id): id is string => !!id)));
  const { data: exercises } =
    exerciseIds.length > 0 ? await supabase.from("exercises").select("*").in("id", exerciseIds) : { data: [] };
  const exerciseById = new Map((exercises ?? []).map((e) => [e.id, e]));

  return (prs ?? []).map((pr) => ({ ...pr, exercise: pr.exercise_id ? (exerciseById.get(pr.exercise_id) ?? null) : null }));
}

/** A real, calculated insight (never fabricated) comparing the last 4 weeks of volume to the 4 before that. */
export async function getVolumeInsight(): Promise<string | null> {
  const { supabase, user } = await requireUser();
  return getVolumeInsightForUser(supabase, user.id);
}

/** Same as getVolumeInsight(), but takes an already-authenticated client — see getActivePlanForUser() for why. */
export async function getVolumeInsightForUser(supabase: DbClient, userId: string): Promise<string | null> {
  const weeks = await getVolumeByWeekForUser(supabase, userId, 8);
  if (weeks.length < 8) return null;

  const recent = weeks.slice(4, 8).reduce((s, w) => s + w.value, 0);
  const prior = weeks.slice(0, 4).reduce((s, w) => s + w.value, 0);
  if (prior === 0 || recent === 0) return null;

  const pctChange = Math.round(((recent - prior) / prior) * 100);
  if (Math.abs(pctChange) < 3) return "Your training volume has been steady over the last 4 weeks.";

  const direction = pctChange > 0 ? "increased" : "decreased";
  return `Your total training volume has ${direction} ${Math.abs(pctChange)}% over the last 4 weeks.`;
}
