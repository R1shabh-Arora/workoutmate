import Link from "next/link";
import { Trophy, Scale, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PR_TYPE_LABELS } from "@/lib/types/enums";
import { formatWeight } from "@/lib/utils";
import type { Tables } from "@/lib/types/database.types";

export function RecentActivityCard({
  recentPRs,
  latestWeight,
}: {
  recentPRs: Tables<"personal_records">[];
  latestWeight: Tables<"body_measurements"> | null;
}) {
  const hasContent = recentPRs.length > 0 || latestWeight;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Recent activity</CardTitle>
        <Link href="/progress" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {!hasContent ? (
          <EmptyState
            icon={Sparkles}
            title="Nothing yet"
            description="Complete a few workouts and your progress will start appearing here."
            className="py-8"
          />
        ) : (
          <div className="space-y-3">
            {latestWeight && (
              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Scale className="size-4" />
                </div>
                <p className="text-sm">
                  Logged <span className="font-medium">{formatWeight(latestWeight.weight_kg, "kg")}</span>
                </p>
              </div>
            )}
            {recentPRs.map((pr) => (
              <div key={pr.id} className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                  <Trophy className="size-4" />
                </div>
                <p className="text-sm">
                  New PR: <span className="font-medium">{PR_TYPE_LABELS[pr.record_type]}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
