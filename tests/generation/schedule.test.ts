import { describe, it, expect } from "vitest";
import { resolveTrainingDays } from "@/lib/generation/schedule";

describe("resolveTrainingDays", () => {
  it("returns exactly daysPerWeek unique weekdays", () => {
    for (const daysPerWeek of [1, 2, 3, 4, 5, 6, 7]) {
      const days = resolveTrainingDays(daysPerWeek, []);
      expect(days).toHaveLength(daysPerWeek);
      expect(new Set(days).size).toBe(daysPerWeek);
      for (const d of days) expect(d).toBeGreaterThanOrEqual(0);
      for (const d of days) expect(d).toBeLessThanOrEqual(6);
    }
  });

  it("respects preferred days exactly when the count matches", () => {
    const days = resolveTrainingDays(3, [1, 3, 5]);
    expect(days).toEqual([1, 3, 5]);
  });

  it("fills in extra days when fewer preferred days than daysPerWeek were given", () => {
    const days = resolveTrainingDays(4, [1]);
    expect(days).toHaveLength(4);
    expect(days).toContain(1);
  });

  it("thins out preferred days when more were given than daysPerWeek", () => {
    const days = resolveTrainingDays(2, [0, 1, 2, 3, 4, 5, 6]);
    expect(days).toHaveLength(2);
  });

  it("is deterministic for the same input", () => {
    const a = resolveTrainingDays(5, [1, 2, 3]);
    const b = resolveTrainingDays(5, [1, 2, 3]);
    expect(a).toEqual(b);
  });
});
