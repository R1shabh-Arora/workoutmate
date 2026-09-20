"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { fetchSubstitutes } from "@/lib/actions/substitutions";
import { swapExercise } from "@/lib/actions/plan";
import { toast } from "sonner";
import type { Tables } from "@/lib/types/database.types";

export function SwapExerciseDialog({
  open,
  onOpenChange,
  workoutExerciseId,
  currentExercise,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutExerciseId: string;
  currentExercise: Tables<"exercises">;
}) {
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<Tables<"exercises">[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    // No setLoading(true) here: the parent mounts a fresh instance (keyed by
    // exercise id) each time this opens, so `loading` already starts true.
    fetchSubstitutes(currentExercise.id)
      .then(setOptions)
      .finally(() => setLoading(false));
  }, [open, currentExercise.id]);

  function handleSwap(newExerciseId: string) {
    startTransition(async () => {
      try {
        await swapExercise(workoutExerciseId, newExerciseId);
        toast.success(`Replaced with a new exercise`);
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't swap that exercise.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Swap {currentExercise.name}</DialogTitle>
          <DialogDescription>
            Matched by target muscle, movement pattern and your available equipment.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : options.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No substitutes found"
            description="Try adjusting your available equipment in Settings, or ask your AI coach."
            className="py-8"
          />
        ) : (
          <div className="space-y-2">
            {options.map((ex) => (
              <button
                key={ex.id}
                type="button"
                disabled={isPending}
                onClick={() => handleSwap(ex.id)}
                className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent/50 disabled:opacity-50"
              >
                <div>
                  <p className="font-medium">{ex.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{ex.equipment.join(", ") || "Bodyweight"}</p>
                </div>
                <ArrowLeftRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
