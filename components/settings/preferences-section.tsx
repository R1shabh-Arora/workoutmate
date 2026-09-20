"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { SettingsSection } from "./settings-section";
import { Button } from "@/components/ui/button";
import { SelectableCard } from "@/components/onboarding/selectable-card";
import { updateTrainingPreferences } from "@/lib/actions/settings";
import {
  WORKOUT_DURATIONS,
  DURATION_LABELS,
  SPLIT_TYPES,
  SPLIT_LABELS,
  LOCATIONS,
  TRAINING_STYLES,
  CARDIO_PREFERENCES,
  EQUIPMENT_OPTIONS,
  EQUIPMENT_LABELS,
} from "@/lib/types/enums";
import type { Tables } from "@/lib/types/database.types";
import type { TrainingStyle } from "@/lib/types/enums";

const STYLE_LABELS: Record<TrainingStyle, string> = {
  strength: "Strength",
  hypertrophy: "Hypertrophy",
  circuit: "Circuit",
  hiit: "HIIT",
  endurance: "Endurance",
  mixed: "Mixed",
};

export function PreferencesSection({ preferences }: { preferences: Tables<"training_preferences"> | null }) {
  const [daysPerWeek, setDaysPerWeek] = useState(preferences?.days_per_week ?? 4);
  const [duration, setDuration] = useState(preferences?.workout_duration ?? "45_60");
  const [splitType, setSplitType] = useState(preferences?.split_type ?? "upper_lower");
  const [location, setLocation] = useState(preferences?.location ?? "gym");
  const [style, setStyle] = useState(preferences?.training_style ?? "mixed");
  const [cardio, setCardio] = useState(preferences?.cardio_preference ?? "light");
  const [equipment, setEquipment] = useState<string[]>((preferences?.equipment as string[]) ?? []);
  const [isPending, startTransition] = useTransition();

  function toggleEquipment(key: string) {
    setEquipment((prev) => (prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]));
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateTrainingPreferences({
          daysPerWeek,
          workoutDuration: duration,
          splitType,
          location,
          trainingStyle: style,
          cardioPreference: cardio,
          equipment,
        });
        toast.success("Preferences saved — your plan has been rebuilt");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't save preferences.");
      }
    });
  }

  return (
    <SettingsSection title="Training preferences" description="Changing these rebuilds your weekly plan.">
      <div className="space-y-2">
        <p className="text-sm font-medium">Days per week</p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDaysPerWeek(n)}
              className={`flex size-10 items-center justify-center rounded-full border text-sm font-semibold ${daysPerWeek === n ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Workout duration</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {WORKOUT_DURATIONS.map((d) => (
            <SelectableCard key={d} compact selected={duration === d} onClick={() => setDuration(d)} title={DURATION_LABELS[d]} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Split</p>
        <div className="grid grid-cols-2 gap-2">
          {SPLIT_TYPES.map((s) => (
            <SelectableCard key={s} compact selected={splitType === s} onClick={() => setSplitType(s)} title={SPLIT_LABELS[s]} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Location</p>
        <div className="grid grid-cols-3 gap-2">
          {LOCATIONS.map((l) => (
            <SelectableCard key={l} compact selected={location === l} onClick={() => setLocation(l)} title={l} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Training style</p>
        <div className="grid grid-cols-2 gap-2">
          {TRAINING_STYLES.map((s) => (
            <SelectableCard key={s} compact selected={style === s} onClick={() => setStyle(s)} title={STYLE_LABELS[s]} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Cardio</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CARDIO_PREFERENCES.map((c) => (
            <SelectableCard key={c} compact selected={cardio === c} onClick={() => setCardio(c)} title={c} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Equipment</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {EQUIPMENT_OPTIONS.filter((e) => e !== "other").map((key) => (
            <SelectableCard key={key} compact selected={equipment.includes(key)} onClick={() => toggleEquipment(key)} title={EQUIPMENT_LABELS[key]} />
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={isPending} size="sm">
        <RefreshCw className={isPending ? "size-4 animate-spin" : "size-4"} />
        {isPending ? "Rebuilding plan…" : "Save & rebuild plan"}
      </Button>
    </SettingsSection>
  );
}
