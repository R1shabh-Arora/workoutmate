"use client";

import { Check } from "lucide-react";
import { cn, kgToLb, lbToKg } from "@/lib/utils";
import type { SetEntry } from "@/lib/stores/workout-session-store";

const RPE_OPTIONS = [6, 7, 8, 9, 10];

export function SetRow({
  setNumber,
  entry,
  isTimed,
  weightUnit,
  placeholderWeight,
  placeholderReps,
  onChange,
  onComplete,
}: {
  setNumber: number;
  entry: SetEntry;
  isTimed: boolean;
  weightUnit: "kg" | "lb";
  placeholderWeight?: number | null;
  placeholderReps?: number | null;
  onChange: (patch: Partial<SetEntry>) => void;
  onComplete: () => void;
}) {
  return (
    <div className={cn("rounded-xl border p-3.5 transition-colors", entry.completed ? "border-success/30 bg-success/[0.05]" : "border-border")}>
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
          {setNumber}
        </span>

        {!isTimed && (
          <div className="flex-1">
            <label className="block text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
              Weight ({weightUnit})
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={entry.weightKg == null ? "" : Math.round((weightUnit === "lb" ? kgToLb(entry.weightKg) : entry.weightKg) * 10) / 10}
              onChange={(e) => {
                if (e.target.value === "") {
                  onChange({ weightKg: null });
                  return;
                }
                const typed = Number(e.target.value);
                onChange({ weightKg: weightUnit === "lb" ? lbToKg(typed) : typed });
              }}
              placeholder={
                placeholderWeight ? String(Math.round((weightUnit === "lb" ? kgToLb(placeholderWeight) : placeholderWeight) * 10) / 10) : "0"
              }
              className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-center text-lg font-semibold tabular-nums outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>
        )}

        <div className="flex-1">
          <label className="block text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
            {isTimed ? "Seconds" : "Reps"}
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={isTimed ? (entry.durationSeconds ?? "") : (entry.reps ?? "")}
            onChange={(e) =>
              onChange(
                isTimed
                  ? { durationSeconds: e.target.value === "" ? null : Number(e.target.value) }
                  : { reps: e.target.value === "" ? null : Number(e.target.value) }
              )
            }
            placeholder={placeholderReps ? String(placeholderReps) : "0"}
            className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-center text-lg font-semibold tabular-nums outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>

        <button
          type="button"
          onClick={onComplete}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center self-end rounded-lg border transition-colors",
            entry.completed
              ? "border-success bg-success text-success-foreground"
              : "border-input bg-background text-muted-foreground hover:border-primary/50 hover:text-primary"
          )}
          aria-label={entry.completed ? "Set completed" : "Complete set"}
          aria-pressed={entry.completed}
        >
          <Check className="size-5" strokeWidth={2.5} />
        </button>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        <span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">RPE</span>
        {RPE_OPTIONS.map((rpe) => (
          <button
            key={rpe}
            type="button"
            onClick={() => onChange({ rpe: entry.rpe === rpe ? null : rpe })}
            className={cn(
              "flex size-6 items-center justify-center rounded-md text-[0.7rem] font-medium transition-colors",
              entry.rpe === rpe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {rpe}
          </button>
        ))}
      </div>
    </div>
  );
}
