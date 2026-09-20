import { describe, it, expect } from "vitest";
import { selectExercise, normalizeTerms } from "@/lib/generation/exercise-selection";
import type { ExerciseSlot } from "@/lib/generation/types";
import { EXERCISE_FIXTURES } from "../helpers/exercise-fixtures";

describe("selectExercise", () => {
  const chestCompoundSlot: ExerciseSlot = { muscles: ["chest"], movementType: "compound", priority: "primary" };

  it("only returns exercises matching the slot's muscle and movement type", () => {
    const picked = selectExercise({
      slot: chestCompoundSlot,
      pool: EXERCISE_FIXTURES,
      experience: "advanced",
      availableEquipment: new Set(["full_gym"]),
      excludedTerms: new Set(),
      preferredTerms: new Set(),
      usedTodayIds: new Set(),
      seed: 0,
    });
    expect(picked).not.toBeNull();
    expect(picked!.primary_muscle).toBe("chest");
    expect(picked!.movement_type).toBe("compound");
  });

  it("never returns an exercise already used today", () => {
    const chestCompounds = EXERCISE_FIXTURES.filter((e) => e.primary_muscle === "chest" && e.movement_type === "compound");
    const usedIds = new Set(chestCompounds.slice(0, -1).map((e) => e.id));

    const picked = selectExercise({
      slot: chestCompoundSlot,
      pool: EXERCISE_FIXTURES,
      experience: "advanced",
      availableEquipment: new Set(["full_gym"]),
      excludedTerms: new Set(),
      preferredTerms: new Set(),
      usedTodayIds: usedIds,
      seed: 0,
    });
    expect(picked).not.toBeNull();
    expect(usedIds.has(picked!.id)).toBe(false);
  });

  it("respects the excluded-terms list even for a substring match", () => {
    for (let seed = 0; seed < 10; seed++) {
      const picked = selectExercise({
        slot: chestCompoundSlot,
        pool: EXERCISE_FIXTURES,
        experience: "advanced",
        availableEquipment: new Set(["full_gym"]),
        excludedTerms: normalizeTerms(["bench press"]),
        preferredTerms: new Set(),
        usedTodayIds: new Set(),
        seed,
      });
      expect(picked?.name.toLowerCase()).not.toContain("bench press");
    }
  });

  it("only allows bodyweight-compatible exercises when equipment is limited to bodyweight", () => {
    for (let seed = 0; seed < 10; seed++) {
      const picked = selectExercise({
        slot: chestCompoundSlot,
        pool: EXERCISE_FIXTURES,
        experience: "beginner",
        availableEquipment: new Set(["bodyweight"]),
        excludedTerms: new Set(),
        preferredTerms: new Set(),
        usedTodayIds: new Set(),
        seed,
      });
      if (picked) {
        expect(picked.equipment.every((e) => e === "bodyweight")).toBe(true);
      }
    }
  });

  it("returns null when nothing in the pool matches the slot at all", () => {
    const picked = selectExercise({
      slot: { muscles: ["calves"], movementType: "compound", priority: "primary" } satisfies ExerciseSlot,
      pool: EXERCISE_FIXTURES,
      experience: "advanced",
      availableEquipment: new Set(["full_gym"]),
      excludedTerms: new Set(),
      preferredTerms: new Set(),
      usedTodayIds: new Set(),
      seed: 0,
    });
    // No compound calf exercises exist in the library — isolation only.
    expect(picked).toBeNull();
  });
});
