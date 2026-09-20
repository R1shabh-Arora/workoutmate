import "server-only";
import { startOfWeek, subDays, subWeeks, format } from "date-fns";
import { requireUser } from "./profile";
import type { Tables } from "@/lib/types/database.types";

export async function getWeightHistory(days = 90): Promise<Tables<"body_measurements">[]> {
  const { supabase, user } = await requireUser();
  const since = subDays(new Date(), days).toISOString().split("T")[0];
  const { data } = await supabase
    .from("body_measurements")
    .select("*")
    .eq("profile_id", user.id)
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
  const since = subWeeks(new Date(), weeks).toISOString();

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("started_at, total_volume_kg")
    .eq("profile_id", user.id)
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
  const { data: prs } = await supabase
    .from("personal_records")
    .select("*")
    .eq("profile_id", user.id)
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
  const weeks = await getVolumeByWeek(8);
  if (weeks.length < 8) return null;

  const recent = weeks.slice(4, 8).reduce((s, w) => s + w.value, 0);
  const prior = weeks.slice(0, 4).reduce((s, w) => s + w.value, 0);
  if (prior === 0 || recent === 0) return null;

  const pctChange = Math.round(((recent - prior) / prior) * 100);
  if (Math.abs(pctChange) < 3) return "Your training volume has been steady over the last 4 weeks.";

  const direction = pctChange > 0 ? "increased" : "decreased";
  return `Your total training volume has ${direction} ${Math.abs(pctChange)}% over the last 4 weeks.`;
}
