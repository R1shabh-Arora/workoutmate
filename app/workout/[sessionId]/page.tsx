import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/data/profile";
import { getWorkoutDay } from "@/lib/data/plan";
import { getLastPerformanceMap } from "@/lib/data/sessions";
import { WorkoutExecutionScreen } from "@/components/workout/workout-execution-screen";

export default async function WorkoutSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const { supabase, user } = await requireUser();

  const [{ data: session }, { data: profile }] = await Promise.all([
    supabase.from("workout_sessions").select("*").eq("id", sessionId).eq("profile_id", user.id).maybeSingle(),
    supabase.from("profiles").select("units").eq("id", user.id).single(),
  ]);

  if (!session) notFound();

  if (session.status !== "in_progress") {
    redirect("/dashboard");
  }

  if (!session.workout_day_id) {
    redirect("/dashboard");
  }

  const day = await getWorkoutDay(session.workout_day_id);
  if (!day || day.exercises.length === 0) {
    redirect("/dashboard");
  }

  const lastPerformance = await getLastPerformanceMap(
    day.exercises.map((e) => e.exercise_id),
    sessionId
  );

  return (
    <WorkoutExecutionScreen
      session={session}
      day={day}
      lastPerformance={Object.fromEntries(lastPerformance)}
      units={profile?.units ?? "metric"}
    />
  );
}
