"use client";

import { useState } from "react";
import { ChevronDown, Moon, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SwapExerciseDialog } from "./swap-exercise-dialog";
import { cn } from "@/lib/utils";
import { DAYS_OF_WEEK } from "@/lib/types/enums";
import type { WorkoutDayWithExercises } from "@/lib/data/plan";

export function DayCard({ day, isToday }: { day: WorkoutDayWithExercises; isToday: boolean }) {
  const [expanded, setExpanded] = useState(isToday && !day.is_rest_day);
  const [swapTarget, setSwapTarget] = useState<WorkoutDayWithExercises["exercises"][number] | null>(null);

  return (
    <Card className={cn("overflow-hidden", isToday && "ring-1 ring-primary")}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-24 shrink-0">
            <p className="text-xs font-medium text-muted-foreground">{DAYS_OF_WEEK[day.day_of_week]}</p>
            {isToday && (
              <Badge variant="default" className="mt-0.5 px-1.5 py-0 text-[0.625rem]">
                Today
              </Badge>
            )}
          </div>
          <div>
            <p className="font-medium">{day.is_rest_day ? "Rest" : day.name}</p>
            {!day.is_rest_day && (
              <p className="text-xs text-muted-foreground">
                {day.exercises.length} exercises · {day.estimated_duration_minutes ?? "—"} min
              </p>
            )}
          </div>
        </div>
        {day.is_rest_day ? (
          <Moon className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        )}
      </button>

      {!day.is_rest_day && expanded && (
        <div className="divide-y divide-border border-t border-border">
          {day.exercises.map((ex, i) => (
            <div key={ex.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{ex.exercise.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ex.sets} × {ex.reps_min ? `${ex.reps_min}–${ex.reps_max}` : `${Math.round((ex.duration_seconds ?? 0) / 60)} min`}
                    {ex.rest_seconds > 0 && ` · ${ex.rest_seconds}s rest`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSwapTarget(ex)}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={`Swap ${ex.exercise.name}`}
              >
                <RefreshCw className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {swapTarget && (
        <SwapExerciseDialog
          key={swapTarget.id}
          open={!!swapTarget}
          onOpenChange={(o) => !o && setSwapTarget(null)}
          workoutExerciseId={swapTarget.id}
          currentExercise={swapTarget.exercise}
        />
      )}
    </Card>
  );
}
