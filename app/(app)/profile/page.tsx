import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { Settings2, Flame, Trophy } from "lucide-react";
import { getFullProfile } from "@/lib/data/profile";
import { getCurrentStreak } from "@/lib/data/sessions";
import { getActivePlan } from "@/lib/data/plan";
import { getAllPRs } from "@/lib/data/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GOAL_LABELS, PR_TYPE_LABELS, type FitnessGoal } from "@/lib/types/enums";
import { calculateAge, formatWeight, getInitials, kgToLb } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { profile, goals } = await getFullProfile();
  const plan = await getActivePlan();
  const [streak, prs] = await Promise.all([getCurrentStreak(plan, profile.timezone), getAllPRs()]);

  const weightDisplay =
    profile.weight_kg != null
      ? profile.units === "imperial"
        ? formatWeight(kgToLb(profile.weight_kg), "lb")
        : formatWeight(profile.weight_kg, "kg")
      : null;

  const primaryGoal = goals.find((g) => g.is_primary)?.goal as FitnessGoal | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Profile</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/settings">
            <Settings2 className="size-4" />
            Edit
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:text-left">
          <Avatar className="size-20">
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.first_name} />}
            <AvatarFallback className="text-xl">{getInitials(profile.first_name || "You")}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">{profile.first_name || "WorkoutMate user"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Member since {format(new Date(profile.created_at), "MMMM yyyy")}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {primaryGoal && <Badge>{GOAL_LABELS[primaryGoal]}</Badge>}
              {profile.experience_level && (
                <Badge variant="outline" className="capitalize">
                  {profile.experience_level}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {profile.date_of_birth && (
          <Card className="p-4 text-center">
            <p className="text-lg font-semibold">{calculateAge(profile.date_of_birth)}</p>
            <p className="text-xs text-muted-foreground">Years old</p>
          </Card>
        )}
        {profile.height_cm && (
          <Card className="p-4 text-center">
            <p className="text-lg font-semibold">{profile.height_cm} cm</p>
            <p className="text-xs text-muted-foreground">Height</p>
          </Card>
        )}
        {weightDisplay && (
          <Card className="p-4 text-center">
            <p className="text-lg font-semibold">{weightDisplay}</p>
            <p className="text-xs text-muted-foreground">Weight</p>
          </Card>
        )}
        <Card className="p-4 text-center">
          <p className="flex items-center justify-center gap-1 text-lg font-semibold">
            <Flame className="size-4 text-warning" />
            {streak}
          </p>
          <p className="text-xs text-muted-foreground">Day streak</p>
        </Card>
      </div>

      {goals.length > 0 && (
        <Card>
          <CardContent className="py-5">
            <p className="mb-3 text-sm font-medium">Goals</p>
            <div className="flex flex-wrap gap-1.5">
              {goals.map((g) => (
                <Badge key={g.id} variant={g.is_primary ? "default" : "outline"}>
                  {GOAL_LABELS[g.goal]}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {prs.length > 0 && (
        <Card>
          <CardContent className="py-5">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-medium">
              <Trophy className="size-4 text-warning" />
              Recent PRs
            </p>
            <div className="space-y-2">
              {prs.slice(0, 3).map((pr) => (
                <div key={pr.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {pr.exercise?.name ?? "Workout"} — {PR_TYPE_LABELS[pr.record_type]}
                  </span>
                  <span className="font-medium tabular-nums">
                    {pr.value} {pr.unit}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
