import { describe, it, expect } from "vitest";
import { buildPrescription } from "@/lib/generation/prescription";
import type { ExerciseSlot } from "@/lib/generation/types";

const primaryCompound: ExerciseSlot = { muscles: ["chest"], movementType: "compound", priority: "primary" };

describe("buildPrescription", () => {
  it("gives strength style low reps and long rest", () => {
    const p = buildPrescription(primaryCompound, "strength", "advanced", true);
    expect(p.repsMax).toBeLessThanOrEqual(6);
    expect(p.restSeconds).toBeGreaterThanOrEqual(120);
  });

  it("gives hypertrophy style moderate reps", () => {
    const p = buildPrescription(primaryCompound, "hypertrophy", "intermediate", true);
    expect(p.repsMin).toBeGreaterThanOrEqual(6);
    expect(p.repsMax).toBeLessThanOrEqual(15);
  });

  it("gives circuit/HIIT styles short rest", () => {
    const circuit = buildPrescription(primaryCompound, "circuit", "intermediate", false);
    const hiit = buildPrescription(primaryCompound, "hiit", "intermediate", false);
    expect(circuit.restSeconds).toBeLessThanOrEqual(45);
    expect(hiit.restSeconds).toBeLessThanOrEqual(45);
  });

  it("gives beginners at least as much compound rest as their style default, never less", () => {
    const beginner = buildPrescription(primaryCompound, "hypertrophy", "beginner", true);
    expect(beginner.restSeconds).toBeGreaterThanOrEqual(90);
  });

  it("gives finisher-priority slots shorter rest than primary compounds", () => {
    const finisherSlot: ExerciseSlot = { muscles: ["abs"], movementType: "isolation", priority: "finisher" };
    const finisher = buildPrescription(finisherSlot, "strength", "advanced", false);
    const primary = buildPrescription(primaryCompound, "strength", "advanced", true);
    expect(finisher.restSeconds).toBeLessThanOrEqual(primary.restSeconds);
  });

  it("never prescribes zero or negative sets", () => {
    for (const style of ["strength", "hypertrophy", "circuit", "hiit", "endurance", "mixed"] as const) {
      for (const experience of ["beginner", "intermediate", "advanced"] as const) {
        const p = buildPrescription(primaryCompound, style, experience, true);
        expect(p.sets).toBeGreaterThan(0);
      }
    }
  });
});
