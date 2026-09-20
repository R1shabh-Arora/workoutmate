"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { ONBOARDING_STEPS, validateStep } from "@/lib/validations/onboarding";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/marketing/logo";
import { completeOnboarding } from "@/lib/actions/onboarding";
import { WelcomeStep } from "./steps/welcome-step";
import { PersonalStep } from "./steps/personal-step";
import { ExperienceStep } from "./steps/experience-step";
import { GoalsStep } from "./steps/goals-step";
import { ScheduleStep } from "./steps/schedule-step";
import { EquipmentStep } from "./steps/equipment-step";
import { PreferencesStep } from "./steps/preferences-step";
import { LimitationsStep } from "./steps/limitations-step";
import { LifestyleStep } from "./steps/lifestyle-step";
import { ReviewStep } from "./steps/review-step";

const STEP_COMPONENTS = {
  welcome: WelcomeStep,
  personal: PersonalStep,
  experience: ExperienceStep,
  goals: GoalsStep,
  schedule: ScheduleStep,
  equipment: EquipmentStep,
  preferences: PreferencesStep,
  limitations: LimitationsStep,
  lifestyle: LifestyleStep,
  review: ReviewStep,
};

export function OnboardingShell({ initialFirstName }: { initialFirstName?: string }) {
  const router = useRouter();
  const { data, stepIndex, goNext, goBack, reset, set } = useOnboardingStore();
  const [submitting, setSubmitting] = useState(false);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (initialFirstName && !data.firstName) {
      set("firstName", initialFirstName);
    }
    // Only ever seed once on mount — after that the store (and its
    // localStorage persistence) is the single source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = ONBOARDING_STEPS[stepIndex]!;
  const StepComponent = STEP_COMPONENTS[step.id];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1;
  const progress = Math.round(((stepIndex + 1) / ONBOARDING_STEPS.length) * 100);
  const { valid } = validateStep(step.id, data);

  function handleBack() {
    setDirection(-1);
    goBack();
  }

  function handleNext() {
    setDirection(1);
    goNext();
  }

  async function handleGenerate() {
    setSubmitting(true);
    try {
      await completeOnboarding(data);
      reset();
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-0">
          <Logo />
          <span className="text-xs font-medium text-muted-foreground">
            Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
          </span>
        </div>
        <div className="h-1 w-full bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-32 pt-8 sm:px-0 sm:pt-12">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1"
          >
            <StepComponent />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4 sm:px-0">
          <Button variant="ghost" onClick={handleBack} disabled={isFirst || submitting} className={isFirst ? "invisible" : ""}>
            <ArrowLeft className="size-4" />
            Back
          </Button>

          {isLast ? (
            <Button size="lg" onClick={handleGenerate} disabled={submitting} className="min-w-44">
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Building your plan…
                </>
              ) : (
                "Generate My Plan"
              )}
            </Button>
          ) : (
            <Button size="lg" onClick={handleNext} disabled={!valid} className="min-w-32">
              Continue
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
