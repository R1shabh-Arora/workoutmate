"use client";

import { Moon } from "lucide-react";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { StepHeader } from "../step-header";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export function LifestyleStep() {
  const { data, set } = useOnboardingStore();
  const sleep = data.sleepHours ?? 7;

  return (
    <div className="space-y-8">
      <StepHeader
        title="One last thing — sleep"
        description="Optional, but it helps your coach judge how hard to push recovery weeks."
      />

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Moon className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium">Average sleep per night</p>
            <p className="text-2xl font-semibold tabular-nums">{sleep.toFixed(1)} hrs</p>
          </div>
        </div>

        <div className="mt-6">
          <Slider
            value={[sleep]}
            min={3}
            max={10}
            step={0.5}
            onValueChange={([v]) => v !== undefined && set("sleepHours", v)}
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>3 hrs</span>
            <span>10 hrs</span>
          </div>
        </div>
      </div>

      {data.sleepHours !== null && (
        <Button variant="ghost" size="sm" onClick={() => set("sleepHours", null)} className="text-muted-foreground">
          Prefer not to say
        </Button>
      )}
    </div>
  );
}
