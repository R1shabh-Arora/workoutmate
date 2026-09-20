"use client";

import { ShieldAlert } from "lucide-react";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { StepHeader } from "../step-header";
import { TagInput } from "../tag-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function LimitationsStep() {
  const { data, set } = useOnboardingStore();

  return (
    <div className="space-y-6">
      <StepHeader
        title="Any injuries or limitations?"
        description="This helps your coach steer around exercises that could aggravate something."
      />

      <div className="flex gap-3 rounded-xl border border-warning/30 bg-warning/[0.07] px-4 py-3.5">
        <ShieldAlert className="mt-0.5 size-4.5 shrink-0 text-warning" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          WorkoutMate is not a medical professional and can&apos;t diagnose or treat injuries. This is used only to
          avoid aggravating movements — for pain, injury or a medical condition, please consult a qualified
          healthcare professional before training.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="injuries">Current or past injuries</Label>
        <Textarea
          id="injuries"
          value={data.injuries}
          onChange={(e) => set("injuries", e.target.value)}
          placeholder="e.g. Lower back strain in 2023, mostly resolved"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="limitations">Other physical limitations</Label>
        <Textarea
          id="limitations"
          value={data.limitations}
          onChange={(e) => set("limitations", e.target.value)}
          placeholder="e.g. Limited shoulder mobility, knee sensitivity"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Exercises to avoid entirely (optional)</Label>
        <TagInput values={data.avoidExercises} onChange={(v) => set("avoidExercises", v)} placeholder="e.g. Overhead press" />
      </div>
    </div>
  );
}
