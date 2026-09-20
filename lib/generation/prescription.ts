import type { ExperienceLevel, TrainingStyle } from "@/lib/types/enums";
import type { ExerciseSlot } from "./types";

export interface Prescription {
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  tempo: string | null;
  intensityGuidance: string;
}

const STYLE_BASE: Record<TrainingStyle, Omit<Prescription, "sets" | "tempo">> = {
  strength: { repsMin: 3, repsMax: 6, restSeconds: 150, intensityGuidance: "RPE 8–9 (leave 1–2 reps in reserve)" },
  hypertrophy: { repsMin: 8, repsMax: 12, restSeconds: 75, intensityGuidance: "RPE 7–8" },
  circuit: { repsMin: 12, repsMax: 15, restSeconds: 30, intensityGuidance: "RPE 6–7, keep moving between exercises" },
  hiit: { repsMin: 10, repsMax: 15, restSeconds: 30, intensityGuidance: "Near-max effort for the work interval" },
  endurance: { repsMin: 15, repsMax: 20, restSeconds: 45, intensityGuidance: "RPE 6, controlled and repeatable" },
  mixed: { repsMin: 8, repsMax: 12, restSeconds: 60, intensityGuidance: "RPE 7–8" },
};

const EXPERIENCE_SET_ADJUSTMENT: Record<ExperienceLevel, { primary: number; secondary: number; finisher: number }> = {
  beginner: { primary: 3, secondary: 2, finisher: 2 },
  intermediate: { primary: 4, secondary: 3, finisher: 2 },
  advanced: { primary: 4, secondary: 3, finisher: 3 },
};

/**
 * Builds the sets/reps/rest/intensity for one exercise slot. Beginners get
 * longer rest on primary compound lifts (form and recovery over intensity)
 * regardless of the chosen training style, since technical breakdown under
 * fatigue is the main injury risk for newer lifters.
 */
export function buildPrescription(
  slot: ExerciseSlot,
  style: TrainingStyle,
  experience: ExperienceLevel,
  isCompound: boolean
): Prescription {
  const base = STYLE_BASE[style];
  const sets = EXPERIENCE_SET_ADJUSTMENT[experience][slot.priority === "primary" ? "primary" : slot.priority === "secondary" ? "secondary" : "finisher"];

  let restSeconds = base.restSeconds;
  if (experience === "beginner" && isCompound) {
    restSeconds = Math.max(restSeconds, 90);
  }
  if (slot.priority === "finisher") {
    restSeconds = Math.min(restSeconds, 60);
  }

  const tempo = style === "strength" && isCompound ? "3-1-1-0" : null;

  return {
    sets,
    repsMin: base.repsMin,
    repsMax: base.repsMax,
    restSeconds,
    tempo,
    intensityGuidance: base.intensityGuidance,
  };
}

/** Rough seconds-per-set (time under tension + transition) used to size a workout to the target duration. */
export function estimateSetSeconds(repsMax: number): number {
  return 12 + repsMax * 2.5;
}
