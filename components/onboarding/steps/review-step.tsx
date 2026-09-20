"use client";

import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { StepHeader } from "../step-header";
import { Badge } from "@/components/ui/badge";
import {
  DAYS_OF_WEEK_SHORT,
  DURATION_LABELS,
  EQUIPMENT_LABELS,
  GOAL_LABELS,
  SPLIT_LABELS,
} from "@/lib/types/enums";
import { ONBOARDING_STEPS, type OnboardingStepId } from "@/lib/validations/onboarding";
import { calculateAge, formatWeight, kgToLb } from "@/lib/utils";

function ReviewSection({
  title,
  stepId,
  children,
}: {
  title: string;
  stepId: OnboardingStepId;
  children: React.ReactNode;
}) {
  const { goToStep } = useOnboardingStore();
  const index = ONBOARDING_STEPS.findIndex((s) => s.id === stepId);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button
          type="button"
          onClick={() => goToStep(index)}
          className="text-xs font-medium text-primary hover:underline"
        >
          Edit
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function ReviewStep() {
  const { data } = useOnboardingStore();
  const age = data.dateOfBirth ? calculateAge(data.dateOfBirth) : null;
  const weightDisplay =
    data.units === "metric" ? formatWeight(data.weightKg, "kg") : formatWeight(kgToLb(data.weightKg), "lb");

  return (
    <div className="space-y-5">
      <StepHeader title="Review your profile" description="Everything looks good? Let's generate your programme." />

      <ReviewSection title="About you" stepId="personal">
        {age !== null && <Badge variant="outline">{age} years old</Badge>}
        <Badge variant="outline">{data.heightCm} cm</Badge>
        <Badge variant="outline">{weightDisplay}</Badge>
      </ReviewSection>

      <ReviewSection title="Goals" stepId="goals">
        {data.goals.map((g) => (
          <Badge key={g} variant={g === data.primaryGoal ? "default" : "outline"}>
            {GOAL_LABELS[g]}
          </Badge>
        ))}
      </ReviewSection>

      <ReviewSection title="Schedule" stepId="schedule">
        <Badge variant="outline">{data.daysPerWeek} days / week</Badge>
        <Badge variant="outline">{DURATION_LABELS[data.workoutDuration]}</Badge>
        {data.preferredDays.map((d) => (
          <Badge key={d} variant="outline">
            {DAYS_OF_WEEK_SHORT[d]}
          </Badge>
        ))}
      </ReviewSection>

      <ReviewSection title="Equipment" stepId="equipment">
        {data.equipment.map((e) => (
          <Badge key={e} variant="outline">
            {e.startsWith("other:") ? e.replace("other:", "") : EQUIPMENT_LABELS[e as keyof typeof EQUIPMENT_LABELS]}
          </Badge>
        ))}
      </ReviewSection>

      <ReviewSection title="Training style" stepId="preferences">
        <Badge variant="outline">{SPLIT_LABELS[data.splitType]}</Badge>
        <Badge variant="outline" className="capitalize">
          {data.location}
        </Badge>
      </ReviewSection>

      {(data.injuries || data.limitations || data.avoidExercises.length > 0) && (
        <ReviewSection title="Limitations" stepId="limitations">
          {data.injuries && <Badge variant="outline">Injuries noted</Badge>}
          {data.limitations && <Badge variant="outline">Limitations noted</Badge>}
          {data.avoidExercises.map((e) => (
            <Badge key={e} variant="outline">
              Avoid: {e}
            </Badge>
          ))}
        </ReviewSection>
      )}
    </div>
  );
}
