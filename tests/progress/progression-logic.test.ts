import { describe, it, expect } from "vitest";
import { computeProgressionRecommendation, type LoggedSet } from "@/lib/progress/progression-logic";

describe("computeProgressionRecommendation", () => {
  it("reports insufficient data with no logged sets", () => {
    const rec = computeProgressionRecommendation([], 8, 12);
    expect(rec.status).toBe("insufficient_data");
  });

  it("recommends a weight increase when the user hits the top of the range comfortably", () => {
    const sets: LoggedSet[] = [
      { weightKg: 60, reps: 12, rpe: 7 },
      { weightKg: 60, reps: 12, rpe: 7 },
      { weightKg: 60, reps: 12, rpe: 7 },
    ];
    const rec = computeProgressionRecommendation(sets, 8, 12);
    expect(rec.status).toBe("increase_weight");
    expect(rec.suggestedWeightKg).toBeGreaterThan(60);
    // Never a big jump — should stay within ~3%.
    expect(rec.suggestedWeightKg!).toBeLessThanOrEqual(60 * 1.03);
  });

  it("does not recommend an increase if RPE was very high, even at the top of the range", () => {
    const sets: LoggedSet[] = [
      { weightKg: 60, reps: 12, rpe: 10 },
      { weightKg: 60, reps: 12, rpe: 9.5 },
    ];
    const rec = computeProgressionRecommendation(sets, 8, 12);
    expect(rec.status).not.toBe("increase_weight");
  });

  it("recommends a deload when the user missed reps at a very high RPE", () => {
    const sets: LoggedSet[] = [
      { weightKg: 80, reps: 5, rpe: 9.5 },
      { weightKg: 80, reps: 4, rpe: 10 },
    ];
    const rec = computeProgressionRecommendation(sets, 8, 12);
    expect(rec.status).toBe("deload");
  });

  it("recommends maintaining when reps were missed but effort was moderate", () => {
    const sets: LoggedSet[] = [{ weightKg: 80, reps: 6, rpe: 7 }];
    const rec = computeProgressionRecommendation(sets, 8, 12);
    expect(rec.status).toBe("maintain");
  });

  it("recommends maintaining for an in-range, moderate-effort performance", () => {
    const sets: LoggedSet[] = [{ weightKg: 80, reps: 9, rpe: 7.5 }];
    const rec = computeProgressionRecommendation(sets, 8, 12);
    expect(rec.status).toBe("maintain");
  });

  it("never recommends a status of increase_weight without a positive suggested weight", () => {
    const sets: LoggedSet[] = [
      { weightKg: 40, reps: 15, rpe: 6 },
      { weightKg: 40, reps: 15, rpe: 6 },
    ];
    const rec = computeProgressionRecommendation(sets, 10, 15);
    if (rec.status === "increase_weight") {
      expect(rec.suggestedWeightKg).toBeGreaterThan(0);
    }
  });
});
