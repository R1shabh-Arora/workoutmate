import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { getFullProfile } from "@/lib/data/profile";
import { getWeightHistory, getVolumeByWeek, getFrequencyByWeek, getAllPRs, getVolumeInsight } from "@/lib/data/progress";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { WeightChart } from "@/components/progress/weight-chart";
import { WeekBarChart } from "@/components/progress/week-bar-chart";
import { PRList } from "@/components/progress/pr-list";
import { LogWeightDialog } from "@/components/progress/log-weight-dialog";

export const metadata: Metadata = { title: "Progress" };

export default async function ProgressPage() {
  const { profile } = await getFullProfile();
  const [weightHistory, volumeByWeek, frequencyByWeek, prs, insight] = await Promise.all([
    getWeightHistory(),
    getVolumeByWeek(),
    getFrequencyByWeek(),
    getAllPRs(),
    getVolumeInsight(),
  ]);

  const weightUnit = profile.units === "imperial" ? "lb" : "kg";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">Only real, calculated data — nothing here is estimated for you.</p>
      </div>

      {insight && (
        <Card className="flex items-center gap-3 border-primary/20 bg-primary/[0.04] p-4">
          <Sparkles className="size-4 shrink-0 text-primary" />
          <p className="text-sm">{insight}</p>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Body weight</CardTitle>
          <LogWeightDialog unit={weightUnit} />
        </CardHeader>
        <CardContent>
          <WeightChart entries={weightHistory} unit={weightUnit} />
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly volume</CardTitle>
          </CardHeader>
          <CardContent>
            <WeekBarChart data={volumeByWeek} unit="kg" color="var(--chart-1)" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Weekly frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <WeekBarChart data={frequencyByWeek} unit="workouts" color="var(--chart-2)" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal records</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <PRList prs={prs} />
        </CardContent>
      </Card>
    </div>
  );
}
