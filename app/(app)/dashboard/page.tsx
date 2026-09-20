import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getFullProfile } from "@/lib/data/profile";
import { getDashboardData } from "@/lib/data/dashboard";
import { TodayWorkoutCard } from "@/components/dashboard/today-workout-card";
import { WeeklyProgressCard } from "@/components/dashboard/weekly-progress-card";
import { CoachTeaserCard } from "@/components/dashboard/coach-teaser-card";
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { profile } = await getFullProfile();
  const data = await getDashboardData(profile.timezone);

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting}, {profile.first_name || "there"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <CoachTeaserCard firstName={profile.first_name} hasWorkoutToday={!!data.today && !data.today.is_rest_day} />

      {!data.plan ? (
        <EmptyState
          icon={Sparkles}
          title="Your first workout is waiting"
          description="We're still setting up your programme. If this doesn't resolve shortly, regenerate it from Settings."
          action={
            <Button asChild size="sm" className="mt-1">
              <Link href="/settings">Go to Settings</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TodayWorkoutCard today={data.today} inProgressSession={data.todayInProgressSession} />
          </div>
          <div className="space-y-6">
            <WeeklyProgressCard stats={data.weeklyStats} streak={data.streak} />
            <RecentActivityCard recentPRs={data.recentPRs} latestWeight={data.latestWeight} />
          </div>
        </div>
      )}
    </div>
  );
}
