import { describe, it, expect } from "vitest";
import { kgToLb, lbToKg, cmToFtIn, ftInToCm, calculateAge, estimateOneRepMax, formatDuration, formatWeight, slugify } from "@/lib/utils";

describe("unit conversions", () => {
  it("round-trips kg <-> lb", () => {
    expect(kgToLb(100)).toBeCloseTo(220.46, 1);
    expect(lbToKg(220.462)).toBeCloseTo(100, 1);
  });

  it("round-trips cm <-> ft/in", () => {
    const { ft, inch } = cmToFtIn(180);
    expect(ftInToCm(ft, inch)).toBeCloseTo(180, 0);
  });
});

describe("calculateAge", () => {
  it("computes age correctly relative to today", () => {
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
    expect(calculateAge(eighteenYearsAgo.toISOString())).toBe(18);
  });

  it("does not round up before the birthday has passed this year", () => {
    const almostNineteen = new Date();
    almostNineteen.setFullYear(almostNineteen.getFullYear() - 19);
    almostNineteen.setDate(almostNineteen.getDate() + 5); // birthday is 5 days from now
    expect(calculateAge(almostNineteen.toISOString())).toBe(18);
  });
});

describe("estimateOneRepMax", () => {
  it("returns the weight itself for a 1-rep set", () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });

  it("estimates a higher 1RM for more reps at the same weight", () => {
    expect(estimateOneRepMax(100, 5)).toBeGreaterThan(estimateOneRepMax(100, 1));
    expect(estimateOneRepMax(100, 10)).toBeGreaterThan(estimateOneRepMax(100, 5));
  });
});

describe("formatDuration", () => {
  it("shows minutes under an hour", () => {
    expect(formatDuration(45)).toBe("45 min");
  });
  it("shows whole hours cleanly", () => {
    expect(formatDuration(60)).toBe("1 hr");
  });
  it("shows hours and minutes together", () => {
    expect(formatDuration(90)).toBe("1 hr 30 min");
  });
});

describe("formatWeight", () => {
  it("drops trailing .0", () => {
    expect(formatWeight(100, "kg")).toBe("100 kg");
  });
  it("keeps one decimal when needed", () => {
    expect(formatWeight(82.5, "kg")).toBe("82.5 kg");
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Barbell Bench Press")).toBe("barbell-bench-press");
  });
  it("strips punctuation", () => {
    expect(slugify("90/90 Hip Switch!")).toBe("90-90-hip-switch");
  });
});
