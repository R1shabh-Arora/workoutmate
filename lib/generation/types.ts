import type { MuscleGroup, MovementType } from "@/lib/types/enums";
import type { Tables } from "@/lib/types/database.types";

/** A single slot in a day template the exercise selector must fill, e.g. "one compound chest movement". */
export interface ExerciseSlot {
  muscles: MuscleGroup[];
  movementType?: MovementType;
  isWarmup?: boolean;
  /** Roughly how central this slot is — compounds go first and are never skipped for time. */
  priority: "primary" | "secondary" | "finisher";
}

export interface DayTemplate {
  name: string;
  focusMuscleGroups: MuscleGroup[];
  slots: ExerciseSlot[];
}

/** A fully-resolved exercise placed into a day, ready to persist as a workout_exercises row. */
export interface GeneratedExercise {
  exercise: Tables<"exercises">;
  orderIndex: number;
  isWarmup: boolean;
  sets: number;
  repsMin: number | null;
  repsMax: number | null;
  durationSeconds: number | null;
  restSeconds: number;
  tempo: string | null;
  intensityGuidance: string;
  notes: string | null;
}

export interface GeneratedDay {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  name: string;
  isRestDay: boolean;
  focusMuscleGroups: MuscleGroup[];
  estimatedDurationMinutes: number;
  exercises: GeneratedExercise[];
}

export interface GeneratedPlan {
  name: string;
  splitType: Tables<"workout_plans">["split_type"];
  daysPerWeek: number;
  primaryGoal: string;
  days: GeneratedDay[];
}

/** The subset of onboarding/profile data the generation engine actually needs. */
export interface GenerationInput {
  experienceLevel: NonNullable<Tables<"profiles">["experience_level"]>;
  primaryGoal: string;
  goals: string[];
  daysPerWeek: number;
  preferredDays: number[];
  workoutDuration: NonNullable<Tables<"training_preferences">["workout_duration"]>;
  splitType: NonNullable<Tables<"training_preferences">["split_type"]>;
  trainingStyle: NonNullable<Tables<"training_preferences">["training_style"]>;
  cardioPreference: NonNullable<Tables<"training_preferences">["cardio_preference"]>;
  equipment: string[];
  preferredExercises: string[];
  dislikedExercises: string[];
  avoidExercises: string[];
}
