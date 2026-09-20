"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { SettingsSection } from "./settings-section";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updatePersonalDetails } from "@/lib/actions/settings";
import { EXPERIENCE_LEVELS, ACTIVITY_LEVELS } from "@/lib/types/enums";
import { cn, kgToLb, lbToKg } from "@/lib/utils";
import type { Tables } from "@/lib/types/database.types";

export function PersonalSection({ profile }: { profile: Tables<"profiles"> }) {
  const [firstName, setFirstName] = useState(profile.first_name);
  const [units, setUnits] = useState(profile.units);
  const [heightCm, setHeightCm] = useState(profile.height_cm ?? 170);
  const [weightKg, setWeightKg] = useState(profile.weight_kg ?? 70);
  const [experience, setExperience] = useState(profile.experience_level ?? "beginner");
  const [activity, setActivity] = useState(profile.activity_level ?? "lightly_active");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await updatePersonalDetails({
          firstName,
          units,
          heightCm,
          weightKg,
          experienceLevel: experience,
          activityLevel: activity,
        });
        toast.success("Saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't save changes.");
      }
    });
  }

  return (
    <SettingsSection title="Personal details">
      <div className="space-y-2">
        <Label htmlFor="firstName">First name</Label>
        <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="max-w-xs" />
      </div>

      <div className="space-y-2">
        <Label>Units</Label>
        <div className="inline-flex rounded-lg border border-border bg-muted p-1">
          {(["metric", "imperial"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnits(u)}
              className={cn("rounded-md px-4 py-1.5 text-sm font-medium capitalize", units === u ? "bg-card shadow-sm" : "text-muted-foreground")}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <div className="grid max-w-xs grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Height (cm)</Label>
          <Input type="number" value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Weight ({units === "metric" ? "kg" : "lb"})</Label>
          <Input
            type="number"
            value={units === "metric" ? weightKg : Math.round(kgToLb(weightKg))}
            onChange={(e) => setWeightKg(units === "metric" ? Number(e.target.value) : lbToKg(Number(e.target.value)))}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Experience level</Label>
          <select
            value={experience}
            onChange={(e) => setExperience(e.target.value as typeof experience)}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm capitalize outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {EXPERIENCE_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Activity level</Label>
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value as typeof activity)}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {ACTIVITY_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button onClick={handleSave} disabled={isPending} size="sm">
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </SettingsSection>
  );
}
