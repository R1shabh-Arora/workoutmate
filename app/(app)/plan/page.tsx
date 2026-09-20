import type { Metadata } from "next";
import Link from "next/link";
import { CalendarOff, Settings2 } from "lucide-react";
import { getFullProfile } from "@/lib/data/profile";
import { getActivePlan } from "@/lib/data/plan";
import { getDayOfWeekInTimezone } from "@/lib/date-tz";
import { DayCard } from "@/components/plan/day-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { SPLIT_LABELS } from "@/lib/types/enums";

export const metadata: Metadata = { title: "My Plan" };

export default async function PlanPage() {
  const { profile } = await getFullProfile();
  const plan = await getActivePlan();
  const todayDow = getDayOfWeekInTimezone(profile.timezone);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">My Plan</h1>
          {plan && (
            <p className="mt-1 text-sm text-muted-foreground">
              {plan.name} · {SPLIT_LABELS[plan.split_type]} · {plan.days_per_week} days/week
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/settings">
            <Settings2 className="size-4" />
            Adjust
          </Link>
        </Button>
      </div>

      {!plan ? (
        <EmptyState icon={CalendarOff} title="No active plan" description="Head to Settings to generate a new training programme." />
      ) : (
        <div className="space-y-3">
          {plan.days.map((day) => (
            <DayCard key={day.id} day={day} isToday={day.day_of_week === todayDow} />
          ))}
        </div>
      )}
    </div>
  );
}
