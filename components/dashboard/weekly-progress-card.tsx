import { Flame, TrendingUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { WeeklyStats } from "@/lib/data/sessions";

export function WeeklyProgressCard({ stats, streak }: { stats: WeeklyStats; streak: number }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>This week</CardTitle>
        {streak > 0 && (
          <span className="flex items-center gap-1 text-sm font-semibold text-warning">
            <Flame className="size-4 fill-current" />
            {streak}-day streak
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-3xl font-semibold tabular-nums">{stats.completed}</span>
            <span className="text-lg text-muted-foreground"> / {stats.planned}</span>
          </div>
          <span className="text-sm font-medium text-muted-foreground">{stats.completionPct}%</span>
        </div>
        <Progress value={stats.completionPct} className="mt-3" />
        <p className="mt-2 text-xs text-muted-foreground">workouts completed</p>

        {stats.totalVolumeKg > 0 && (
          <div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-sm">
            <TrendingUp className="size-4 text-success" />
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{Math.round(stats.totalVolumeKg).toLocaleString()} kg</span> total volume
              this week
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
