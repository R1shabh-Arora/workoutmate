"use client";

import { useState } from "react";
import { Dumbbell, PersonStanding, Weight, Rows3, Cable, Waves, ChevronsUp, CircleDot, Building2, Plus } from "lucide-react";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { StepHeader } from "../step-header";
import { SelectableCard } from "../selectable-card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EQUIPMENT_OPTIONS, EQUIPMENT_LABELS } from "@/lib/types/enums";
import { X } from "lucide-react";

const ICONS: Record<string, React.ReactNode> = {
  none: <PersonStanding className="size-4.5" />,
  bodyweight: <PersonStanding className="size-4.5" />,
  dumbbells: <Dumbbell className="size-4.5" />,
  barbell: <Weight className="size-4.5" />,
  bench: <Rows3 className="size-4.5" />,
  cable_machine: <Cable className="size-4.5" />,
  resistance_bands: <Waves className="size-4.5" />,
  pull_up_bar: <ChevronsUp className="size-4.5" />,
  kettlebells: <CircleDot className="size-4.5" />,
  full_gym: <Building2 className="size-4.5" />,
  other: <Plus className="size-4.5" />,
};

export function EquipmentStep() {
  const { data, set } = useOnboardingStore();
  const [customDraft, setCustomDraft] = useState("");
  const customItems = data.equipment.filter((e) => e.startsWith("other:"));

  function toggle(key: string) {
    if (key === "none") {
      set("equipment", data.equipment.includes("none") ? [] : ["none"]);
      return;
    }
    const withoutNone = data.equipment.filter((e) => e !== "none");
    const next = withoutNone.includes(key) ? withoutNone.filter((e) => e !== key) : [...withoutNone, key];
    set("equipment", next);
  }

  function addCustom() {
    const trimmed = customDraft.trim();
    if (!trimmed) return;
    set("equipment", [...data.equipment.filter((e) => e !== "none"), `other:${trimmed}`]);
    setCustomDraft("");
  }

  return (
    <div className="space-y-6">
      <StepHeader title="What equipment do you have?" description="Select everything available to you — at home or at the gym." />

      <div className="grid grid-cols-2 gap-2.5">
        {EQUIPMENT_OPTIONS.filter((e) => e !== "other").map((key) => (
          <SelectableCard
            key={key}
            compact
            selected={data.equipment.includes(key)}
            onClick={() => toggle(key)}
            title={EQUIPMENT_LABELS[key]}
            icon={ICONS[key]}
          />
        ))}
      </div>

      <div className="space-y-2.5">
        <p className="text-sm font-medium">Anything else? (optional)</p>
        <div className="flex gap-2">
          <Input
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
            placeholder="e.g. Sandbag, TRX, sled"
            className="h-11"
          />
        </div>
        {customItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {customItems.map((item) => (
              <Badge key={item} variant="secondary" className="gap-1 py-1 pl-2.5 pr-1">
                {item.replace("other:", "")}
                <button
                  type="button"
                  onClick={() => set("equipment", data.equipment.filter((e) => e !== item))}
                  className="rounded-full p-0.5 hover:bg-foreground/10"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
