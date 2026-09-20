import { describe, it, expect } from "vitest";
import { computeExercisePRs, computeSessionPRs } from "@/lib/progress/pr-logic";

describe("computeExercisePRs", () => {
  it("returns no PRs with no history and no session sets", () => {
    expect(computeExercisePRs([], [])).toEqual([]);
  });

  it("awards a max_weight PR the first time an exercise is ever logged", () => {
    const prs = computeExercisePRs([{ weightKg: 100, reps: 5 }], []);
    expect(prs.some((p) => p.recordType === "max_weight" && p.value === 100)).toBe(true);
  });

  it("does not award a PR when the session doesn't beat history", () => {
    const prs = computeExercisePRs([{ weightKg: 90, reps: 5 }], [{ weightKg: 100, reps: 5 }]);
    expect(prs.find((p) => p.recordType === "max_weight")).toBeUndefined();
  });

  it("awards a PR when the session ties history exactly (never fabricates a false 'new' PR, but ties don't count as new)", () => {
    const prs = computeExercisePRs([{ weightKg: 100, reps: 5 }], [{ weightKg: 100, reps: 5 }]);
    // A tie is not an improvement — strictly greater-than is required.
    expect(prs.find((p) => p.recordType === "max_weight")).toBeUndefined();
  });

  it("awards a max_weight PR when the session beats the best historical weight", () => {
    const prs = computeExercisePRs([{ weightKg: 105, reps: 5 }], [{ weightKg: 100, reps: 5 }, { weightKg: 90, reps: 8 }]);
    const maxWeightPR = prs.find((p) => p.recordType === "max_weight");
    expect(maxWeightPR?.value).toBe(105);
    expect(maxWeightPR?.repsAtWeight).toBe(5);
  });

  it("can award both a max_weight and an est_1rm PR in the same session", () => {
    const prs = computeExercisePRs([{ weightKg: 105, reps: 8 }], [{ weightKg: 100, reps: 5 }]);
    expect(prs.map((p) => p.recordType).sort()).toEqual(["est_1rm", "max_weight"]);
  });

  it("ignores sets missing weight or reps entirely", () => {
    const prs = computeExercisePRs([{ weightKg: null, reps: 5 }, { weightKg: 100, reps: null }], []);
    expect(prs).toEqual([]);
  });
});

describe("computeSessionPRs", () => {
  it("awards a longest_workout PR on the very first session", () => {
    const prs = computeSessionPRs({ durationSeconds: 3600, totalVolumeKg: 1000 }, []);
    expect(prs.some((p) => p.recordType === "longest_workout" && p.value === 60)).toBe(true);
  });

  it("does not award a duration PR when a past session was longer", () => {
    const prs = computeSessionPRs({ durationSeconds: 1800, totalVolumeKg: 500 }, [{ durationSeconds: 3600, totalVolumeKg: 1000 }]);
    expect(prs.find((p) => p.recordType === "longest_workout")).toBeUndefined();
  });

  it("awards a max_volume PR when this session's volume beats all past sessions", () => {
    const prs = computeSessionPRs(
      { durationSeconds: 1800, totalVolumeKg: 1500 },
      [{ durationSeconds: 3600, totalVolumeKg: 1000 }, { durationSeconds: 2400, totalVolumeKg: 1200 }]
    );
    expect(prs.find((p) => p.recordType === "max_volume_single_session")?.value).toBe(1500);
  });
});
