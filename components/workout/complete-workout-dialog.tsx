"use client";

import { useRouter } from "next/navigation";
import { PartyPopper, Trophy, Clock, Dumbbell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";

export function CompleteWorkoutDialog({
  open,
  durationSeconds,
  totalVolumeKg,
  newPRCount,
}: {
  open: boolean;
  durationSeconds: number;
  totalVolumeKg: number;
  newPRCount: number;
}) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={() => router.push("/dashboard")}>
      <DialogContent showClose={false} className="text-center">
        <DialogHeader className="items-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
            <PartyPopper className="size-6" />
          </div>
          <DialogTitle className="mt-2 text-xl">Workout complete</DialogTitle>
          <DialogDescription>Nice work — logged and saved to your progress.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="rounded-xl border border-border p-4">
            <Clock className="mx-auto size-4 text-muted-foreground" />
            <p className="mt-1.5 text-lg font-semibold tabular-nums">{formatDuration(Math.round(durationSeconds / 60))}</p>
            <p className="text-xs text-muted-foreground">Duration</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <Dumbbell className="mx-auto size-4 text-muted-foreground" />
            <p className="mt-1.5 text-lg font-semibold tabular-nums">{Math.round(totalVolumeKg).toLocaleString()} kg</p>
            <p className="text-xs text-muted-foreground">Total volume</p>
          </div>
        </div>

        {newPRCount > 0 && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-warning/10 px-4 py-3 text-sm font-medium text-warning">
            <Trophy className="size-4" />
            {newPRCount} new personal record{newPRCount > 1 ? "s" : ""}!
          </div>
        )}

        <Button size="lg" className="w-full" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </DialogContent>
    </Dialog>
  );
}
