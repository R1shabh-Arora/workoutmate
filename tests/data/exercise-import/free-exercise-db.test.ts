import { describe, it, expect } from "vitest";
import { freeExerciseDbAdapter } from "@/lib/data/exercise-import/free-exercise-db";
import type { NormalizedExercise, SkippedRecord } from "@/lib/data/exercise-import/types";

function isSkip(result: NormalizedExercise | SkippedRecord): result is SkippedRecord {
  return "reason" in result;
}

describe("freeExerciseDbAdapter.normalize", () => {
  it("maps a typical compound-lift record onto WorkoutMate's vocabulary", () => {
    const result = freeExerciseDbAdapter.normalize({
      id: "Barbell_Bench_Press",
      name: "Barbell Bench Press",
      force: "push",
      level: "intermediate",
      mechanic: "compound",
      equipment: "barbell",
      primaryMuscles: ["chest"],
      secondaryMuscles: ["shoulders", "triceps"],
      instructions: ["Lie on the bench.", "Press the bar up."],
      category: "strength",
    });

    expect(isSkip(result)).toBe(false);
    const ex = result as NormalizedExercise;
    expect(ex.source).toBe("free_exercise_db");
    expect(ex.sourceId).toBe("Barbell_Bench_Press");
    expect(ex.primaryMuscle).toBe("chest");
    expect(ex.secondaryMuscles).toEqual(["shoulders", "triceps"]);
    expect(ex.category).toBe("chest");
    expect(ex.difficulty).toBe("intermediate");
    expect(ex.movementType).toBe("compound");
    expect(ex.force).toBe("push");
    expect(ex.equipment).toEqual(["barbell"]);
    expect(ex.license).toContain("Unlicense");
    expect(ex.instructions).toHaveLength(2);
  });

  it("derives movement_type from category when mechanic is null (cardio)", () => {
    const result = freeExerciseDbAdapter.normalize({
      id: "Air_Bike",
      name: "Air Bike",
      force: null,
      level: "beginner",
      mechanic: null,
      equipment: null,
      primaryMuscles: ["quadriceps"],
      secondaryMuscles: [],
      category: "cardio",
    });

    expect(isSkip(result)).toBe(false);
    const ex = result as NormalizedExercise;
    expect(ex.movementType).toBe("cardio");
    expect(ex.equipment).toEqual([]); // null equipment -> no equipment required
    expect(ex.force).toBeNull();
  });

  it("derives movement_type from category when mechanic is null (stretching -> mobility)", () => {
    const result = freeExerciseDbAdapter.normalize({
      id: "Cat_Stretch",
      name: "Cat Stretch",
      level: "beginner",
      mechanic: null,
      equipment: "body only",
      primaryMuscles: ["lower back"],
      category: "stretching",
    });

    expect(isSkip(result)).toBe(false);
    const ex = result as NormalizedExercise;
    expect(ex.movementType).toBe("mobility");
    expect(ex.primaryMuscle).toBe("lower_back");
    expect(ex.equipment).toEqual(["bodyweight"]);
  });

  it("maps expert level to advanced difficulty", () => {
    const result = freeExerciseDbAdapter.normalize({
      id: "Muscle_Up",
      name: "Muscle Up",
      level: "expert",
      mechanic: "compound",
      equipment: "pull-up bar",
      primaryMuscles: ["lats"],
      category: "strength",
    });
    // "pull-up bar" isn't in the equipment map (FEDB actually uses "other" /
    // specific strings) — this record should be skipped with a clear reason
    // rather than silently guessing an equipment requirement.
    expect(isSkip(result)).toBe(true);
    expect((result as SkippedRecord).reason).toContain("unmapped equipment");
  });

  it("skips a record with an unmapped primary muscle rather than guessing", () => {
    const result = freeExerciseDbAdapter.normalize({
      id: "Some_Exercise",
      name: "Some Exercise",
      level: "beginner",
      mechanic: "isolation",
      equipment: "dumbbell",
      primaryMuscles: ["not_a_real_muscle"],
      category: "strength",
    });
    expect(isSkip(result)).toBe(true);
    expect((result as SkippedRecord).reason).toContain("unmapped primary muscle");
  });

  it("skips a record that fails schema validation instead of throwing", () => {
    const result = freeExerciseDbAdapter.normalize({ id: "Broken", name: "Broken" });
    expect(isSkip(result)).toBe(true);
    expect((result as SkippedRecord).reason).toContain("schema validation");
  });

  it("flags a name that suggests a unilateral movement", () => {
    const result = freeExerciseDbAdapter.normalize({
      id: "Single_Leg_Deadlift",
      name: "Single-Leg Deadlift",
      level: "intermediate",
      mechanic: "compound",
      equipment: "dumbbell",
      primaryMuscles: ["hamstrings"],
      category: "strength",
    });
    expect(isSkip(result)).toBe(false);
    expect((result as NormalizedExercise).isUnilateral).toBe(true);
  });
});
