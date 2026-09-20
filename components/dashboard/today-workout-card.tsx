"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Clock, Dumbbell, ListChecks, Loader2, Moon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { startWorkoutSession } from "@/lib/actions/workout-session";
import { MUSCLE_GROUP_LABELS } from "@/lib/types/enums";
import type { WorkoutDayWithExercises } from "@/lib/data/plan";
import type { Tables } from "@/lib/types/database.types";

export function TodayWorkoutCard({
  today,
  inProgressSession,
}: {
  today: WorkoutDayWithExercises | null;
  inProgressSession: Tables<"workout_sessions"> | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!today || today.is_rest_day) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Moon className="size-5" />
        </div>
        <div>
          <h3 className="font-semibold">Rest day</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            No training scheduled today. Recovery is part of the plan — light movement or stretching is fine if you feel like it.
          </p>
        </div>
      </Card>
    );
  }

  function handleStart() {
    if (inProgressSession) {
      router.push(`/workout/${inProgressSession.id}`);
      return;
    }
    startTransition(() => {
      startWorkoutSession(today!.id);
    });
  }

  return (
    <Card className="relative overflow-hidden p-6 sm:p-7">
      <div className="bg-grid-fade pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative flex items-start justify-between">
        <Badge variant="secondary" className="font-medium">
          Today
        </Badge>
        {inProgressSession && (
          <Badge variant="warning" className="font-medium">
            In progress
          </Badge>
        )}
      </div>

      <h2 className="relative mt-3 text-2xl font-semibold tracking-tight">{today.name}</h2>

      <div className="relative mt-3 flex flex-wrap gap-1.5">
        {today.focus_muscle_groups.map((m) => (
          <span key={m} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            {MUSCLE_GROUP_LABELS[m]}
          </span>
        ))}
      </div>

      <div className="relative mt-5 flex flex-wrap gap-5 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock className="size-4" />
          {today.estimated_duration_minutes ?? "—"} min
        </span>
        <span className="flex items-center gap-1.5">
          <ListChecks className="size-4" />
          {today.exercises.length} exercises
        </span>
        <span className="flex items-center gap-1.5">
          <Dumbbell className="size-4" />
          {today.exercises.reduce((sum, e) => sum + e.sets, 0)} sets
        </span>
      </div>

      <Button size="lg" onClick={handleStart} disabled={isPending} className="relative mt-6 w-full sm:w-auto">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4 fill-current" />}
        {inProgressSession ? "Resume Workout" : "Start Workout"}
      </Button>
    </Card>
  );
}
