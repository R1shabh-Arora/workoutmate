"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ChevronDown, X, Clock } from "lucide-react";
import { useWorkoutSessionStore } from "@/lib/stores/workout-session-store";
import { logSet, completeWorkoutSession } from "@/lib/actions/logging";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExerciseIllustration } from "./exercise-illustration";
import { SetRow } from "./set-row";
import { RestTimer } from "./rest-timer";
import { CompleteWorkoutDialog } from "./complete-workout-dialog";
import { cn, formatWeight, kgToLb } from "@/lib/utils";
import { MUSCLE_GROUP_LABELS } from "@/lib/types/enums";
import type { WorkoutDayWithExercises } from "@/lib/data/plan";
import type { Tables } from "@/lib/types/database.types";

export function WorkoutExecutionScreen({
  session,
  day,
  lastPerformance,
  units = "metric",
}: {
  session: Tables<"workout_sessions">;
  day: WorkoutDayWithExercises;
  lastPerformance: Record<string, Tables<"set_logs">>;
  units?: "metric" | "imperial";
}) {
  const router = useRouter();
  const store = useWorkoutSessionStore();
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [finishing, setFinishing] = useState(false);
  const [complete, setComplete] = useState<{ durationSeconds: number; totalVolumeKg: number; newPRCount: number } | null>(null);

  useEffect(() => {
    store.initSession(
      session.id,
      day.exercises.map((e) => ({ workoutExerciseId: e.id, sets: e.sets }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedSeconds = Math.max(0, Math.round((now - new Date(session.started_at).getTime()) / 1000));
  const elapsedLabel = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, "0")}`;

  const exercise = day.exercises[store.currentExerciseIndex];
  const isLast = store.currentExerciseIndex === day.exercises.length - 1;
  const entries = exercise ? store.setEntries[exercise.id] ?? [] : [];
  const completedCount = entries.filter((e) => e.completed).length;

  const weightUnit = units === "imperial" ? "lb" : "kg";

  if (!exercise) return null;

  function handleSetComplete(setIndex: number) {
    const entry = entries[setIndex];
    if (!entry || !exercise) return;

    const nowCompleted = !entry.completed;
    store.updateSetEntry(exercise.id, setIndex, { completed: nowCompleted });

    if (nowCompleted) {
      // entry.weightKg is always canonical kg — SetRow converts at the input boundary.
      logSet({
        sessionId: session.id,
        workoutExerciseId: exercise.id,
        exerciseId: exercise.exercise_id,
        setNumber: setIndex + 1,
        reps: entry.reps,
        weightKg: entry.weightKg,
        durationSeconds: entry.durationSeconds,
        rpe: entry.rpe,
        notes: null,
      }).catch(() => toast.error("Couldn't save that set — check your connection."));

      if (exercise.rest_seconds > 0 && setIndex < entries.length - 1) {
        store.startRest(exercise.rest_seconds);
      }
    }
  }

  async function handleNext() {
    if (!isLast) {
      store.setCurrentExercise(store.currentExerciseIndex + 1);
      store.clearRest();
      setInstructionsOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setFinishing(true);
    try {
      const totalVolumeKg = Object.values(store.setEntries)
        .flat()
        .reduce((sum, e) => sum + (e.completed && e.weightKg && e.reps ? e.weightKg * e.reps : 0), 0);

      const result = await completeWorkoutSession(session.id, elapsedSeconds);
      store.endSession();
      setComplete({ durationSeconds: elapsedSeconds, totalVolumeKg, newPRCount: result.newPRCount });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't finish your workout.");
      setFinishing(false);
    }
  }

  const last = lastPerformance[exercise.exercise_id];
  const lastLabel = last
    ? `Last: ${formatWeight(units === "imperial" ? kgToLb(last.weight_kg ?? 0) : last.weight_kg ?? 0, weightUnit)} × ${last.reps ?? "—"}`
    : null;

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col px-4 pb-32 pt-4">
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Exit workout"
        >
          <X className="size-5" />
        </button>
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Clock className="size-3.5" />
          {elapsedLabel}
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {store.currentExerciseIndex + 1} / {day.exercises.length}
        </span>
      </div>

      <div className="mt-1 flex gap-1">
        {day.exercises.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < store.currentExerciseIndex ? "bg-primary" : i === store.currentExerciseIndex ? "bg-primary/50" : "bg-muted"
            )}
          />
        ))}
      </div>

      <div className="mt-5">
        <ExerciseIllustration name={exercise.exercise.name} />

        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{MUSCLE_GROUP_LABELS[exercise.exercise.primary_muscle]}</Badge>
              {exercise.is_warmup && <Badge variant="outline">Warm-up</Badge>}
            </div>
            <h1 className="mt-1.5 text-xl font-semibold tracking-tight">{exercise.exercise.name}</h1>
            <p className="text-sm text-muted-foreground">
              {exercise.sets} sets · {exercise.intensity_guidance}
              {exercise.tempo && ` · Tempo ${exercise.tempo}`}
            </p>
            {lastLabel && <p className="mt-0.5 text-xs text-muted-foreground">{lastLabel}</p>}
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              disabled={store.currentExerciseIndex === 0}
              onClick={() => store.setCurrentExercise(store.currentExerciseIndex - 1)}
              className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground disabled:opacity-30"
              aria-label="Previous exercise"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              disabled={isLast}
              onClick={() => store.setCurrentExercise(store.currentExerciseIndex + 1)}
              className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground disabled:opacity-30"
              aria-label="Next exercise"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {exercise.exercise.instructions.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setInstructionsOpen((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-primary"
            >
              How to perform this
              <ChevronDown className={cn("size-3.5 transition-transform", instructionsOpen && "rotate-180")} />
            </button>
            {instructionsOpen && (
              <ol className="mt-2 space-y-1.5 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                {exercise.exercise.instructions.map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-medium text-foreground">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        <div className="mt-5">
          <RestTimer />
        </div>

        <div className="mt-5 space-y-2.5">
          {entries.map((entry, i) => (
            <SetRow
              key={i}
              setNumber={i + 1}
              entry={entry}
              isTimed={exercise.duration_seconds != null}
              weightUnit={weightUnit}
              placeholderWeight={last?.weight_kg}
              placeholderReps={exercise.reps_max ?? last?.reps}
              onChange={(patch) => store.updateSetEntry(exercise.id, i, patch)}
              onComplete={() => handleSetComplete(i)}
            />
          ))}
        </div>

        {exercise.notes && <p className="mt-4 rounded-lg bg-muted px-3.5 py-2.5 text-xs text-muted-foreground">{exercise.notes}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {completedCount} / {entries.length} sets logged
            </span>
          </div>
          <Button size="lg" className="w-full" onClick={handleNext} disabled={finishing}>
            {finishing ? "Finishing…" : isLast ? "Finish Workout" : "Next Exercise"}
          </Button>
        </div>
      </div>

      {complete && (
        <CompleteWorkoutDialog
          open
          durationSeconds={complete.durationSeconds}
          totalVolumeKg={complete.totalVolumeKg}
          newPRCount={complete.newPRCount}
        />
      )}
    </div>
  );
}
