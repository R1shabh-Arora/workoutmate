"use client";

import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { StepHeader } from "../step-header";
import { SelectableCard } from "../selectable-card";
import { DAYS_OF_WEEK_SHORT, DURATION_LABELS, WORKOUT_DURATIONS, PREFERRED_TIMES } from "@/lib/types/enums";
import { cn } from "@/lib/utils";
import { Sunrise, Sun, Sunset, Shuffle } from "lucide-react";

const TIME_ICONS = { morning: Sunrise, afternoon: Sun, evening: Sunset, flexible: Shuffle } as const;
const TIME_LABELS = { morning: "Morning", afternoon: "Afternoon", evening: "Evening", flexible: "Flexible" } as const;

export function ScheduleStep() {
  const { data, set } = useOnboardingStore();

  function toggleDay(day: number) {
    const next = data.preferredDays.includes(day)
      ? data.preferredDays.filter((d) => d !== day)
      : [...data.preferredDays, day].sort((a, b) => a - b);
    set("preferredDays", next);
  }

  return (
    <div className="space-y-8">
      <StepHeader title="Your training schedule" description="We'll fit your programme into the days that actually work for you." />

      <div className="space-y-2.5">
        <p className="text-sm font-medium">Days per week</p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => set("daysPerWeek", n)}
              className={cn(
                "flex size-12 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                data.daysPerWeek === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-foreground/30"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="text-sm font-medium">Which days work best?</p>
        <p className="text-xs text-muted-foreground">Optional — we can also just space your {data.daysPerWeek} days out evenly.</p>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK_SHORT.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => toggleDay(index)}
              className={cn(
                "flex h-11 w-14 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                data.preferredDays.includes(index)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/30"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="text-sm font-medium">Preferred workout duration</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {WORKOUT_DURATIONS.map((d) => (
            <SelectableCard
              key={d}
              compact
              selected={data.workoutDuration === d}
              onClick={() => set("workoutDuration", d)}
              title={DURATION_LABELS[d]}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="text-sm font-medium">Preferred time of day</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {PREFERRED_TIMES.map((t) => {
            const Icon = TIME_ICONS[t];
            return (
              <SelectableCard
                key={t}
                compact
                selected={data.preferredTime === t}
                onClick={() => set("preferredTime", t)}
                title={TIME_LABELS[t]}
                icon={<Icon className="size-4" />}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
