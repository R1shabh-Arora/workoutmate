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
    preferredDays: [1, 2, 3, 4],
    workoutDuration: "45_60",
    splitType: "body_part",
    trainingStyle: "hypertrophy",
    cardioPreference: "light",
    equipment: ["full_gym"],
    preferredExercises: [],
    dislikedExercises: [],
    avoidExercises: [],
    ...overrides,
  };
}

function trainingDayNames(plan: ReturnType<typeof generatePlan>): string[] {
  return plan.days.filter((d) => !d.isRestDay).map((d) => d.name);
}

describe("body_part split", () => {
  it("4 days: Chest/Triceps -> Back/Biceps -> Shoulders/Abs -> Legs", () => {
    const plan = generatePlan(baseInput({ daysPerWeek: 4, preferredDays: [1, 2, 3, 4] }), EXERCISE_FIXTURES);
    expect(trainingDayNames(plan)).toEqual(["Chest & Triceps", "Back & Biceps", "Shoulders & Abs", "Legs"]);
  });

  it("5 days: cycles back to Chest/Triceps", () => {
    const plan = generatePlan(baseInput({ daysPerWeek: 5, preferredDays: [1, 2, 3, 4, 5] }), EXERCISE_FIXTURES);
    expect(trainingDayNames(plan)).toEqual(["Chest & Triceps", "Back & Biceps", "Shoulders & Abs", "Legs", "Chest & Triceps"]);
  });

  it("6 days: cycles through to Back/Biceps", () => {
    const plan = generatePlan(baseInput({ daysPerWeek: 6, preferredDays: [1, 2, 3, 4, 5, 6] }), EXERCISE_FIXTURES);
    expect(trainingDayNames(plan)).toEqual([
      "Chest & Triceps",
      "Back & Biceps",
      "Shoulders & Abs",
      "Legs",
      "Chest & Triceps",
      "Back & Biceps",
    ]);
  });

  it("7 days: cycles through to Shoulders/Abs", () => {
    const plan = generatePlan(baseInput({ daysPerWeek: 7, preferredDays: [0, 1, 2, 3, 4, 5, 6] }), EXERCISE_FIXTURES);
    expect(trainingDayNames(plan)).toEqual([
      "Chest & Triceps",
      "Back & Biceps",
      "Shoulders & Abs",
      "Legs",
      "Chest & Triceps",
      "Back & Biceps",
      "Shoulders & Abs",
    ]);
  });

  it("is a first-class split, never silently substituted for push_pull_legs or upper_lower", () => {
    const plan = generatePlan(baseInput({ daysPerWeek: 4 }), EXERCISE_FIXTURES);
    expect(plan.splitType).toBe("body_part");
    const names = trainingDayNames(plan);
    expect(names).not.toContain("Push");
    expect(names).not.toContain("Pull");
    expect(names).not.toContain("Upper Body");
    expect(names).not.toContain("Lower Body");
  });

  it("does not fold into 'custom' auto-resolution — custom at 4 days still resolves to upper_lower", () => {
    const plan = generatePlan(baseInput({ splitType: "custom", daysPerWeek: 4, preferredDays: [1, 2, 3, 4] }), EXERCISE_FIXTURES);
    expect(plan.splitType).toBe("upper_lower");
  });

  it("Chest & Triceps day only selects chest/triceps exercises", () => {
    const plan = generatePlan(baseInput({ daysPerWeek: 4, preferredDays: [1, 2, 3, 4] }), EXERCISE_FIXTURES);
    const day = plan.days.find((d) => d.name === "Chest & Triceps")!;
    expect(day.exercises.length).toBeGreaterThan(0);
    for (const ex of day.exercises) {
      expect(["chest", "triceps"]).toContain(ex.exercise.primary_muscle);
    }
  });

  it("Back & Biceps day only selects back/biceps/forearms exercises", () => {
    const plan = generatePlan(baseInput({ daysPerWeek: 4, preferredDays: [1, 2, 3, 4] }), EXERCISE_FIXTURES);
    const day = plan.days.find((d) => d.name === "Back & Biceps")!;
    expect(day.exercises.length).toBeGreaterThan(0);
    for (const ex of day.exercises) {
      expect(["lats", "upper_back", "biceps", "forearms"]).toContain(ex.exercise.primary_muscle);
    }
  });

  it("Shoulders & Abs day only selects shoulders/abs/obliques exercises", () => {
    const plan = generatePlan(baseInput({ daysPerWeek: 4, preferredDays: [1, 2, 3, 4] }), EXERCISE_FIXTURES);
    const day = plan.days.find((d) => d.name === "Shoulders & Abs")!;
    expect(day.exercises.length).toBeGreaterThan(0);
    for (const ex of day.exercises) {
      expect(["shoulders", "abs", "obliques"]).toContain(ex.exercise.primary_muscle);
    }
  });

  it("Legs day only selects quads/hamstrings/glutes/calves exercises", () => {
    const plan = generatePlan(baseInput({ daysPerWeek: 4, preferredDays: [1, 2, 3, 4] }), EXERCISE_FIXTURES);
    const day = plan.days.find((d) => d.name === "Legs")!;
    expect(day.exercises.length).toBeGreaterThan(0);
    for (const ex of day.exercises) {
      expect(["quads", "hamstrings", "glutes", "calves"]).toContain(ex.exercise.primary_muscle);
    }
  });

  it("every training day still gets at least 4 exercises", () => {
    const plan = generatePlan(baseInput({ daysPerWeek: 4, preferredDays: [1, 2, 3, 4] }), EXERCISE_FIXTURES);
    for (const day of plan.days.filter((d) => !d.isRestDay)) {
      expect(day.exercises.length).toBeGreaterThanOrEqual(4);
    }
  });
});
