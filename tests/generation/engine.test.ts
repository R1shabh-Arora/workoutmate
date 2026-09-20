import { describe, it, expect } from "vitest";
import { generatePlan } from "@/lib/generation/engine";
import type { GenerationInput } from "@/lib/generation/types";
import { EXERCISE_FIXTURES } from "../helpers/exercise-fixtures";

function baseInput(overrides: Partial<GenerationInput> = {}): GenerationInput {
  return {
    experienceLevel: "intermediate",
    primaryGoal: "build_muscle",
    goals: ["build_muscle"],
    daysPerWeek: 4,
    preferredDays: [1, 2, 4, 5],
    workoutDuration: "45_60",
    splitType: "upper_lower",
    trainingStyle: "hypertrophy",
    cardioPreference: "light",
    equipment: ["full_gym"],
    preferredExercises: [],
    dislikedExercises: [],
    avoidExercises: [],
    ...overrides,
  };
}

describe("generatePlan", () => {
  it("always produces exactly 7 days covering the full week", () => {
    const plan = generatePlan(baseInput({ daysPerWeek: 4 }), EXERCISE_FIXTURES);
    expect(plan.days).toHaveLength(7);
    expect(new Set(plan.days.map((d) => d.dayOfWeek)).size).toBe(7);
  });

  it("marks exactly daysPerWeek days as training days, the rest as rest days", () => {
    for (const daysPerWeek of [2, 3, 4, 5, 6]) {
      const plan = generatePlan(baseInput({ daysPerWeek }), EXERCISE_FIXTURES);
      const trainingDays = plan.days.filter((d) => !d.isRestDay);
      expect(trainingDays).toHaveLength(daysPerWeek);
    }
  });

  it("gives every training day at least 4 exercises and no rest day any exercises", () => {
    const plan = generatePlan(baseInput(), EXERCISE_FIXTURES);
    for (const day of plan.days) {
      if (day.isRestDay) {
        expect(day.exercises).toHaveLength(0);
      } else {
        expect(day.exercises.length).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it("never selects an exercise the equipment doesn't support", () => {
    const plan = generatePlan(baseInput({ equipment: ["bodyweight"], daysPerWeek: 3, splitType: "full_body" }), EXERCISE_FIXTURES);
    for (const day of plan.days) {
      for (const ex of day.exercises) {
        const requiresEquipment = ex.exercise.equipment.some((e) => e !== "bodyweight");
        expect(requiresEquipment).toBe(false);
      }
    }
  });

  it("never includes an exercise on the avoid list", () => {
    const plan = generatePlan(baseInput({ avoidExercises: ["Barbell Bench Press", "Barbell Back Squat"] }), EXERCISE_FIXTURES);
    const allNames = plan.days.flatMap((d) => d.exercises.map((e) => e.exercise.name));
    expect(allNames).not.toContain("Barbell Bench Press");
    expect(allNames).not.toContain("Barbell Back Squat");
  });

  it("never gives a beginner an advanced-difficulty exercise when easier options exist", () => {
    const plan = generatePlan(baseInput({ experienceLevel: "beginner", daysPerWeek: 3, splitType: "full_body" }), EXERCISE_FIXTURES);
    const allExercises = plan.days.flatMap((d) => d.exercises);
    const advancedCount = allExercises.filter((e) => e.exercise.difficulty === "advanced").length;
    expect(advancedCount).toBe(0);
  });

  it("does not repeat the same exercise twice within one day", () => {
    const plan = generatePlan(baseInput(), EXERCISE_FIXTURES);
    for (const day of plan.days.filter((d) => !d.isRestDay)) {
      const ids = day.exercises.map((e) => e.exercise.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("auto-resolves a 'custom' split into a sensible real split based on day count", () => {
    const low = generatePlan(baseInput({ splitType: "custom", daysPerWeek: 2 }), EXERCISE_FIXTURES);
    const mid = generatePlan(baseInput({ splitType: "custom", daysPerWeek: 4 }), EXERCISE_FIXTURES);
    const high = generatePlan(baseInput({ splitType: "custom", daysPerWeek: 6 }), EXERCISE_FIXTURES);
    expect(low.splitType).toBe("full_body");
    expect(mid.splitType).toBe("upper_lower");
    expect(high.splitType).toBe("push_pull_legs");
  });

  it("scales estimated duration with the requested workout-duration band", () => {
    const short = generatePlan(baseInput({ workoutDuration: "15_30" }), EXERCISE_FIXTURES);
    const long = generatePlan(baseInput({ workoutDuration: "90_plus" }), EXERCISE_FIXTURES);
    const avgMinutes = (plan: typeof short) => {
      const training = plan.days.filter((d) => !d.isRestDay);
      return training.reduce((sum, d) => sum + d.estimatedDurationMinutes, 0) / training.length;
    };
    expect(avgMinutes(long)).toBeGreaterThan(avgMinutes(short));
  });

  it("adds a cardio finisher on the last training day when cardio preference is high", () => {
    const plan = generatePlan(baseInput({ cardioPreference: "high", daysPerWeek: 3, splitType: "full_body" }), EXERCISE_FIXTURES);
    const trainingDays = plan.days.filter((d) => !d.isRestDay);
    const lastDay = trainingDays[trainingDays.length - 1]!;
    const hasCardio = lastDay.exercises.some((e) => e.exercise.movement_type === "cardio");
    expect(hasCardio).toBe(true);
  });
});
