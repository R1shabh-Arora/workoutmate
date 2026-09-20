"use client";

import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { StepHeader } from "../step-header";
import { SelectableCard } from "../selectable-card";
import { TagInput } from "../tag-input";
import { Label } from "@/components/ui/label";
import { LOCATIONS, SPLIT_TYPES, SPLIT_LABELS, TRAINING_STYLES, CARDIO_PREFERENCES } from "@/lib/types/enums";
import { Home, Building2, Repeat } from "lucide-react";

const LOCATION_LABELS = { home: "Home", gym: "Gym", both: "Both" } as const;
const LOCATION_ICONS = { home: Home, gym: Building2, both: Repeat } as const;

const STYLE_LABELS: Record<(typeof TRAINING_STYLES)[number], string> = {
  strength: "Strength-focused",
  hypertrophy: "Hypertrophy (muscle growth)",
  circuit: "Circuit-style",
  hiit: "HIIT",
  endurance: "Endurance",
  mixed: "Mixed / no strong preference",
};

const CARDIO_LABELS: Record<(typeof CARDIO_PREFERENCES)[number], string> = {
  none: "No cardio, please",
  light: "A little",
  moderate: "Moderate amount",
  high: "Lots of cardio",
};

export function PreferencesStep() {
  const { data, set } = useOnboardingStore();

  return (
    <div className="space-y-8">
      <StepHeader title="Training style" description="Tell us how you like to train, and we'll shape your programme around it." />

      <div className="space-y-2.5">
        <p className="text-sm font-medium">Where will you train?</p>
        <div className="grid grid-cols-3 gap-2.5">
          {LOCATIONS.map((loc) => {
            const Icon = LOCATION_ICONS[loc];
            return (
              <SelectableCard
                key={loc}
                compact
                selected={data.location === loc}
                onClick={() => set("location", loc)}
                title={LOCATION_LABELS[loc]}
                icon={<Icon className="size-4" />}
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="text-sm font-medium">Preferred split</p>
        <div className="grid grid-cols-2 gap-2.5">
          {SPLIT_TYPES.map((s) => (
            <SelectableCard key={s} compact selected={data.splitType === s} onClick={() => set("splitType", s)} title={SPLIT_LABELS[s]} />
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="text-sm font-medium">Training style</p>
        <div className="grid grid-cols-2 gap-2.5">
          {TRAINING_STYLES.map((s) => (
            <SelectableCard key={s} compact selected={data.trainingStyle === s} onClick={() => set("trainingStyle", s)} title={STYLE_LABELS[s]} />
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="text-sm font-medium">Cardio preference</p>
        <div className="grid grid-cols-2 gap-2.5">
          {CARDIO_PREFERENCES.map((c) => (
            <SelectableCard key={c} compact selected={data.cardioPreference === c} onClick={() => set("cardioPreference", c)} title={CARDIO_LABELS[c]} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Exercises you love (optional)</Label>
        <TagInput values={data.preferredExercises} onChange={(v) => set("preferredExercises", v)} placeholder="e.g. Deadlift, Pull-ups" />
      </div>

      <div className="space-y-2">
        <Label>Exercises you&rsquo;d rather skip (optional)</Label>
        <TagInput values={data.dislikedExercises} onChange={(v) => set("dislikedExercises", v)} placeholder="e.g. Burpees" />
      </div>
    </div>
  );
}
