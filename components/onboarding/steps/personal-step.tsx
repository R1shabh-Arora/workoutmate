"use client";

import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepHeader } from "../step-header";
import { SelectableCard } from "../selectable-card";
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from "@/lib/utils";
import type { Sex, Units } from "@/lib/types/enums";
import { cn } from "@/lib/utils";

const SEX_CHOICES: { value: Sex; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export function PersonalStep() {
  const { data, set } = useOnboardingStore();
  const { ft, inch } = cmToFtIn(data.heightCm);
  const lb = Math.round(kgToLb(data.weightKg));

  function setUnits(units: Units) {
    set("units", units);
  }

  return (
    <div className="space-y-8">
      <StepHeader title="A bit about you" description="This helps us size your training loads correctly." />

      <div className="space-y-2">
        <Label htmlFor="dob">Date of birth</Label>
        <Input
          id="dob"
          type="date"
          value={data.dateOfBirth}
          onChange={(e) => set("dateOfBirth", e.target.value)}
          max={new Date().toISOString().split("T")[0]}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label>Sex</Label>
        <div className="grid grid-cols-2 gap-2.5">
          {SEX_CHOICES.map((choice) => (
            <SelectableCard
              key={choice.value}
              compact
              selected={data.sex === choice.value}
              onClick={() => set("sex", choice.value)}
              title={choice.label}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Units</Label>
        <div className="inline-flex rounded-lg border border-border bg-muted p-1">
          {(["metric", "imperial"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnits(u)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                data.units === u ? "bg-card shadow-sm" : "text-muted-foreground"
              )}
            >
              {u === "metric" ? "Metric (cm/kg)" : "Imperial (ft/lb)"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Height</Label>
          {data.units === "metric" ? (
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                value={data.heightCm}
                onChange={(e) => set("heightCm", Number(e.target.value))}
                className="h-11 pr-10"
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                cm
              </span>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={ft}
                  onChange={(e) => set("heightCm", Math.round(ftInToCm(Number(e.target.value), inch)))}
                  className="h-11 pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ft
                </span>
              </div>
              <div className="relative flex-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={inch}
                  onChange={(e) => set("heightCm", Math.round(ftInToCm(ft, Number(e.target.value))))}
                  className="h-11 pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  in
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Weight</Label>
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              value={data.units === "metric" ? data.weightKg : lb}
              onChange={(e) =>
                set("weightKg", data.units === "metric" ? Number(e.target.value) : lbToKg(Number(e.target.value)))
              }
              className="h-11 pr-10"
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {data.units === "metric" ? "kg" : "lb"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
