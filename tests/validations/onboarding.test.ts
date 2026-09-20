import { describe, it, expect } from "vitest";
import { onboardingSchema, validateStep, ONBOARDING_DEFAULTS } from "@/lib/validations/onboarding";

const VALID_DATA = {
  ...ONBOARDING_DEFAULTS,
  firstName: "Alex",
  dateOfBirth: "1995-06-15",
  goals: ["build_muscle", "improve_strength"] as const,
  primaryGoal: "build_muscle" as const,
  equipment: ["dumbbells", "bench"],
};

describe("onboardingSchema", () => {
  it("accepts a fully valid submission", () => {
    const result = onboardingSchema.safeParse(VALID_DATA);
    expect(result.success).toBe(true);
  });

  it("rejects a primary goal that isn't in the selected goals list", () => {
    const result = onboardingSchema.safeParse({ ...VALID_DATA, primaryGoal: "lose_fat" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty goals array", () => {
    const result = onboardingSchema.safeParse({ ...VALID_DATA, goals: [] });
    expect(result.success).toBe(false);
  });

  it("rejects an empty equipment selection", () => {
    const result = onboardingSchema.safeParse({ ...VALID_DATA, equipment: [] });
    expect(result.success).toBe(false);
  });

  it("rejects someone under 13 or over 100", () => {
    const tooYoung = onboardingSchema.safeParse({ ...VALID_DATA, dateOfBirth: new Date().toISOString() });
    expect(tooYoung.success).toBe(false);

    const tooOld = onboardingSchema.safeParse({ ...VALID_DATA, dateOfBirth: "1900-01-01" });
    expect(tooOld.success).toBe(false);
  });

  it("rejects unrealistic height or weight", () => {
    expect(onboardingSchema.safeParse({ ...VALID_DATA, heightCm: 30 }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...VALID_DATA, weightKg: 1000 }).success).toBe(false);
  });
});

describe("validateStep", () => {
  it("gates the welcome step on a non-empty first name only", () => {
    expect(validateStep("welcome", { ...ONBOARDING_DEFAULTS, firstName: "" }).valid).toBe(false);
    expect(validateStep("welcome", { ...ONBOARDING_DEFAULTS, firstName: "Sam" }).valid).toBe(true);
  });

  it("does not require later-step fields to be valid yet", () => {
    // firstName is fine, but equipment (a later step) is still empty —
    // the welcome step shouldn't care.
    expect(validateStep("welcome", { ...ONBOARDING_DEFAULTS, firstName: "Sam", equipment: [] }).valid).toBe(true);
  });

  it("the review step has no required fields of its own", () => {
    expect(validateStep("review", ONBOARDING_DEFAULTS).valid).toBe(true);
  });
});
