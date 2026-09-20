"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/data/profile";
import { getActivePlan, getWorkoutDayByDow } from "@/lib/data/plan";

/**
 * Starts today's workout, or resumes an existing in-progress session for the
 * same day rather than creating a duplicate.
 */
export async function startWorkoutSession(workoutDayId: string) {
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("profile_id", user.id)
    .eq("workout_day_id", workoutDayId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    redirect(`/workout/${existing.id}`);
  }

  const { data: day } = await supabase.from("workout_days").select("*").eq("id", workoutDayId).single();
  if (!day) {
    throw new Error("That workout could not be found.");
  }

  const { data: session, error } = await supabase
    .from("workout_sessions")
    .insert({
      profile_id: user.id,
      plan_id: day.plan_id,
      workout_day_id: workoutDayId,
      name: day.name,
      status: "in_progress",
    })
    .select()
    .single();

  if (error || !session) {
    console.error("[startWorkoutSession] failed:", error?.message);
    throw new Error("We couldn't start your workout. Please try again.");
  }

  await supabase.from("analytics_events").insert({
    profile_id: user.id,
    event_name: "workout_started",
    properties: { workout_day_id: workoutDayId },
  });

  redirect(`/workout/${session.id}`);
}

export async function abandonWorkoutSession(sessionId: string) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("workout_sessions")
    .update({ status: "skipped", completed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("profile_id", user.id)
    .eq("status", "in_progress");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
