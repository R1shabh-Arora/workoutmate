"use client";

import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { StepHeader } from "../step-header";
import { SelectableCard } from "../selectable-card";
import { FITNESS_GOALS, GOAL_LABELS, GOAL_DESCRIPTIONS } from "@/lib/types/enums";
import { cn } from "@/lib/utils";

export function GoalsStep() {
  const { data, set } = useOnboardingStore();

  function toggleGoal(goal: (typeof FITNESS_GOALS)[number]) {
    const isSelected = data.goals.includes(goal);
    const nextGoals = isSelected ? data.goals.filter((g) => g !== goal) : [...data.goals, goal];
    let primaryGoal = data.primaryGoal;
    if (isSelected && data.primaryGoal === goal) {
      primaryGoal = nextGoals[0] ?? data.primaryGoal;
    } else if (!isSelected && data.goals.length === 0) {
      primaryGoal = goal;
    }
    set("goals", nextGoals);
    set("primaryGoal", primaryGoal);
  }

  return (
    <div className="space-y-8">
      <StepHeader title="What are you training for?" description="Pick as many as apply — you can change these anytime." />

      <div className="grid grid-cols-2 gap-2.5">
        {FITNESS_GOALS.map((goal) => (
          <SelectableCard
            key={goal}
            compact
            selected={data.goals.includes(goal)}
            onClick={() => toggleGoal(goal)}
            title={GOAL_LABELS[goal]}
          />
        ))}
      </div>

      {data.goals.length > 1 && (
        <div className="space-y-2.5">
          <p className="text-sm font-medium">Which matters most right now?</p>
          <p className="text-xs text-muted-foreground">We&apos;ll bias your programme toward this goal.</p>
          <div className="flex flex-wrap gap-2">
            {data.goals.map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => set("primaryGoal", goal)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  data.primaryGoal === goal
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {GOAL_LABELS[goal]}
              </button>
            ))}
          </div>
        </div>
      )}

      {data.primaryGoal && data.goals.includes(data.primaryGoal) && (
        <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          {GOAL_DESCRIPTIONS[data.primaryGoal]}
        </p>
      )}
    </div>
  );
}
