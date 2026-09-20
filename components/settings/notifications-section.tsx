"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { SettingsSection } from "./settings-section";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { updateNotificationPreferences } from "@/lib/actions/settings";
import type { Tables } from "@/lib/types/database.types";

const ROWS: { key: keyof typeof LABELS; label: string; description: string }[] = [
  { key: "workout_reminders", label: "Workout reminders", description: "A nudge when it's time to train." },
  { key: "rest_day_reminders", label: "Rest day reminders", description: "A note on scheduled rest days." },
  { key: "weekly_review", label: "Weekly review", description: "A summary of your week, every week." },
  { key: "streak_reminders", label: "Streak reminders", description: "Heads up before a streak lapses." },
  { key: "goal_reminders", label: "Goal reminders", description: "Occasional check-ins on your goals." },
];

const LABELS = {
  workout_reminders: "workoutReminders",
  rest_day_reminders: "restDayReminders",
  weekly_review: "weeklyReview",
  streak_reminders: "streakReminders",
  goal_reminders: "goalReminders",
} as const;

export function NotificationsSection({ preferences }: { preferences: Tables<"notification_preferences"> | null }) {
  const [state, setState] = useState({
    workout_reminders: preferences?.workout_reminders ?? true,
    rest_day_reminders: preferences?.rest_day_reminders ?? true,
    weekly_review: preferences?.weekly_review ?? true,
    streak_reminders: preferences?.streak_reminders ?? true,
    goal_reminders: preferences?.goal_reminders ?? true,
  });
  const [, startTransition] = useTransition();

  function handleToggle(key: keyof typeof state, value: boolean) {
    setState((prev) => ({ ...prev, [key]: value }));
    startTransition(async () => {
      try {
        await updateNotificationPreferences({ [LABELS[key]]: value });
      } catch {
        toast.error("Couldn't save that setting.");
        setState((prev) => ({ ...prev, [key]: !value }));
      }
    });
  }

  return (
    <SettingsSection title="Notifications" description="We keep this to what's useful — nothing spammy.">
      {ROWS.map((row) => (
        <div key={row.key} className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor={row.key}>{row.label}</Label>
            <p className="text-xs text-muted-foreground">{row.description}</p>
          </div>
          <Switch id={row.key} checked={state[row.key]} onCheckedChange={(v) => handleToggle(row.key, v)} />
        </div>
      ))}
    </SettingsSection>
  );
}
