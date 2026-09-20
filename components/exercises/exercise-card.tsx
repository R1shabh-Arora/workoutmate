"use client";

import { useState } from "react";
import { ChevronDown, Dumbbell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS, FORCE_LABELS, type ForceType } from "@/lib/types/enums";
import type { Tables } from "@/lib/types/database.types";

const DIFFICULTY_VARIANT: Record<string, "outline" | "success" | "warning" | "destructive"> = {
  beginner: "success",
  intermediate: "warning",
  advanced: "destructive",
};

export function ExerciseCard({ exercise }: { exercise: Tables<"exercises"> }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 p-4 text-left">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Dumbbell className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{exercise.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[0.6875rem]">
              {MUSCLE_GROUP_LABELS[exercise.primary_muscle]}
            </Badge>
            <Badge variant={DIFFICULTY_VARIANT[exercise.difficulty]} className="text-[0.6875rem] capitalize">
              {exercise.difficulty}
            </Badge>
            {exercise.force && (
              <Badge variant="secondary" className="text-[0.6875rem]">
                {FORCE_LABELS[exercise.force as ForceType]}
              </Badge>
            )}
          </div>
        </div>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border px-4 py-4">
          <p className="text-sm text-muted-foreground">{exercise.description}</p>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Equipment</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {exercise.equipment.length === 0 ? (
                <span className="text-sm text-muted-foreground">None</span>
              ) : (
                exercise.equipment.map((e) => (
                  <Badge key={e} variant="secondary" className="text-[0.6875rem]">
                    {EQUIPMENT_LABELS[e] ?? e}
                  </Badge>
                ))
              )}
            </div>
          </div>

          {exercise.instructions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How to perform</p>
              <ol className="mt-1.5 space-y-1 text-sm text-muted-foreground">
                {exercise.instructions.map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-medium text-foreground">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {exercise.common_mistakes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Common mistakes</p>
              <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
                {exercise.common_mistakes.map((m, i) => (
                  <li key={i} className="flex gap-2">
                    <span>—</span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {exercise.attribution && (
            <p className="text-[0.6875rem] text-muted-foreground/70">
              {exercise.attribution}
              {exercise.license_url && (
                <>
                  {" "}
                  <a href={exercise.license_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                    License
                  </a>
                </>
              )}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
