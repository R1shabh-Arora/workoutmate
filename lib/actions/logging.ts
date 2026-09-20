"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/data/profile";
import { detectAndRecordPRs } from "@/lib/progress/pr-detection";
import { z } from "zod";

const logSetSchema = z.object({
  sessionId: z.string().uuid(),
  workoutExerciseId: z.string().uuid().nullable(),
  exerciseId: z.string().uuid(),
  setNumber: z.number().int().min(1),
  reps: z.number().int().min(0).max(200).nullable(),
  weightKg: z.number().min(0).max(500).nullable(),
  durationSeconds: z.number().int().min(0).max(7200).nullable(),
  rpe: z.number().min(1).max(10).nullable(),
  notes: z.string().max(500).nullable(),
});

export type LogSetInput = z.infer<typeof logSetSchema>;

/** Logs (or updates) one set. Idempotent per (session, exercise, set number) so re-submitting the same set edits it instead of duplicating. */
export async function logSet(input: LogSetInput) {
  const parsed = logSetSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid set data.");
  }
  const data = parsed.data;
  const { supabase, user } = await requireUser();

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("id", data.sessionId)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!session) {
    throw new Error("Workout session not found.");
  }

  let existingQuery = supabase
    .from("set_logs")
    .select("id")
    .eq("session_id", data.sessionId)
    .eq("set_number", data.setNumber);
  existingQuery =
    data.workoutExerciseId === null
      ? existingQuery.is("workout_exercise_id", null)
      : existingQuery.eq("workout_exercise_id", data.workoutExerciseId);
  const { data: existing } = await existingQuery.maybeSingle();

  const payload = {
    session_id: data.sessionId,
    workout_exercise_id: data.workoutExerciseId,
    exercise_id: data.exerciseId,
    set_number: data.setNumber,
    reps: data.reps,
    weight_kg: data.weightKg,
    duration_seconds: data.durationSeconds,
    rpe: data.rpe,
    notes: data.notes,
    is_completed: true,
    completed_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase.from("set_logs").update(payload).eq("id", existing.id);
    if (error) throw new Error("We couldn't save that set. Please try again.");
    return existing.id;
  }

  const { data: inserted, error } = await supabase.from("set_logs").insert(payload).select("id").single();
  if (error || !inserted) throw new Error("We couldn't save that set. Please try again.");
  return inserted.id;
}

/** Marks a session complete, computes total volume, and checks for new PRs. */
export async function completeWorkoutSession(sessionId: string, durationSeconds: number, notes?: string) {
  const { supabase, user } = await requireUser();

  const { data: setLogs } = await supabase
    .from("set_logs")
    .select("weight_kg, reps")
    .eq("session_id", sessionId)
    .eq("profile_id", user.id)
    .eq("is_completed", true);

  const totalVolumeKg = (setLogs ?? []).reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0);

  const { error } = await supabase
    .from("workout_sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      total_volume_kg: Math.round(totalVolumeKg * 10) / 10,
      notes: notes || null,
    })
    .eq("id", sessionId)
    .eq("profile_id", user.id);

  if (error) {
    console.error("[completeWorkoutSession] failed:", error.message);
    throw new Error("We couldn't save your workout. Please try again.");
  }

  const newPRs = await detectAndRecordPRs(supabase, user.id, sessionId);

  await supabase.from("analytics_events").insert({
    profile_id: user.id,
    event_name: "workout_completed",
    properties: { session_id: sessionId, duration_seconds: durationSeconds, pr_count: newPRs.length },
  });

  revalidatePath("/dashboard");
  revalidatePath("/progress");
  revalidatePath("/plan");

  return { newPRCount: newPRs.length };
}
