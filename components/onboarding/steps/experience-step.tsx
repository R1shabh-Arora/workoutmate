"use client";

import { Sprout, TrendingUp, Trophy, Armchair, Footprints, Bike, Flame, Zap } from "lucide-react";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { StepHeader } from "../step-header";
import { SelectableCard } from "../selectable-card";
import type { ActivityLevel, ExperienceLevel } from "@/lib/types/enums";

const EXPERIENCE_CHOICES: { value: ExperienceLevel; title: string; description: string; icon: React.ReactNode }[] = [
  { value: "beginner", title: "Beginner", description: "New to structured training, or returning after a long break.", icon: <Sprout className="size-4.5" /> },
  { value: "intermediate", title: "Intermediate", description: "Training consistently for 6+ months with good form.", icon: <TrendingUp className="size-4.5" /> },
  { value: "advanced", title: "Advanced", description: "Years of consistent training, comfortable pushing intensity.", icon: <Trophy className="size-4.5" /> },
];

const ACTIVITY_CHOICES: { value: ActivityLevel; title: string; description: string; icon: React.ReactNode }[] = [
  { value: "sedentary", title: "Sedentary", description: "Desk job, little movement day to day.", icon: <Armchair className="size-4.5" /> },
  { value: "lightly_active", title: "Lightly active", description: "Some walking or light activity most days.", icon: <Footprints className="size-4.5" /> },
  { value: "moderately_active", title: "Moderately active", description: "On your feet often, regular casual exercise.", icon: <Bike className="size-4.5" /> },
  { value: "very_active", title: "Very active", description: "Physical job or daily intentional exercise.", icon: <Flame className="size-4.5" /> },
  { value: "extremely_active", title: "Extremely active", description: "Athlete-level training or physical demands.", icon: <Zap className="size-4.5" /> },
];

export function ExperienceStep() {
  const { data, set } = useOnboardingStore();

  return (
    <div className="space-y-8">
      <StepHeader title="Your training experience" description="This sets your starting intensity and exercise complexity." />

      <div className="space-y-2.5">
        {EXPERIENCE_CHOICES.map((choice) => (
          <SelectableCard
            key={choice.value}
            selected={data.experienceLevel === choice.value}
            onClick={() => set("experienceLevel", choice.value)}
            title={choice.title}
            description={choice.description}
            icon={choice.icon}
          />
        ))}
      </div>

      <div className="space-y-2.5">
        <p className="text-sm font-medium">Current activity level (outside of workouts)</p>
        {ACTIVITY_CHOICES.map((choice) => (
          <SelectableCard
            key={choice.value}
            selected={data.activityLevel === choice.value}
            onClick={() => set("activityLevel", choice.value)}
            title={choice.title}
            description={choice.description}
            icon={choice.icon}
          />
        ))}
      </div>
    </div>
  );
}
