import { format } from "date-fns";
import { Trophy } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PR_TYPE_LABELS } from "@/lib/types/enums";
import type { Tables } from "@/lib/types/database.types";

type PRWithExercise = Tables<"personal_records"> & { exercise: Tables<"exercises"> | null };

export function PRList({ prs }: { prs: PRWithExercise[] }) {
  if (prs.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No personal records yet"
        description="Your PRs are detected automatically as you log workouts that beat your history."
        className="py-10"
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      {prs.map((pr) => (
        <div key={pr.id} className="flex items-center gap-3.5 py-3.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
            <Trophy className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{pr.exercise?.name ?? "Workout"}</p>
            <p className="text-xs text-muted-foreground">{PR_TYPE_LABELS[pr.record_type]}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">
              {pr.value} {pr.unit}
              {pr.reps_at_weight ? ` × ${pr.reps_at_weight}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">{format(new Date(pr.achieved_at), "MMM d, yyyy")}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
