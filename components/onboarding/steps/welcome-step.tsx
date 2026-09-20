"use client";

import { Sparkles } from "lucide-react";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepHeader } from "../step-header";

export function WelcomeStep() {
  const { data, set } = useOnboardingStore();

  return (
    <div>
      <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="size-6" />
      </div>
      <StepHeader
        title="Let's build your plan"
        description="A couple of minutes of questions gets you a training programme built specifically for you — not a generic template."
      />
      <div className="space-y-2">
        <Label htmlFor="firstName">What should we call you?</Label>
        <Input
          id="firstName"
          autoFocus
          value={data.firstName}
          onChange={(e) => set("firstName", e.target.value)}
          placeholder="Your first name"
          className="h-12 text-base"
        />
      </div>
    </div>
  );
}
