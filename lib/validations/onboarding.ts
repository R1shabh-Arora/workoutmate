import { z } from "zod";
import {
  ACTIVITY_LEVELS,
  CARDIO_PREFERENCES,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_LEVELS,
  FITNESS_GOALS,
  LOCATIONS,
  PREFERRED_TIMES,
  SEX_OPTIONS,
  SPLIT_TYPES,
  TRAINING_STYLES,
  UNITS_OPTIONS,
  WORKOUT_DURATIONS,
} from "@/lib/types/enums";

export const onboardingObjectSchema = z.object({
  // Step: personal
  firstName: z.string().trim().min(1, "Tell us what to call you").max(60),
  dateOfBirth: z
    .string()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid date")
    .refine((v) => {
      const age = (Date.now() - new Date(v).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      return age >= 13 && age <= 100;
    }, "You must be between 13 and 100 years old"),
  sex: z.enum(SEX_OPTIONS),
  units: z.enum(UNITS_OPTIONS),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(30).max(300),

  // Step: experience
  experienceLevel: z.enum(EXPERIENCE_LEVELS),
  activityLevel: z.enum(ACTIVITY_LEVELS),

  // Step: goals
  goals: z.array(z.enum(FITNESS_GOALS)).min(1, "Pick at least one goal").max(5, "Pick up to 5 goals"),
  primaryGoal: z.enum(FITNESS_GOALS),

  // Step: schedule
  daysPerWeek: z.number().int().min(1).max(7),
  preferredDays: z.array(z.number().int().min(0).max(6)),
  workoutDuration: z.enum(WORKOUT_DURATIONS),
  preferredTime: z.enum(PREFERRED_TIMES),

  // Step: equipment
  equipment: z.array(z.string()).min(1, "Select at least one option"),

  // Step: training preferences
  location: z.enum(LOCATIONS),
  splitType: z.enum(SPLIT_TYPES),
  trainingStyle: z.enum(TRAINING_STYLES),
  cardioPreference: z.enum(CARDIO_PREFERENCES),
  preferredExercises: z.array(z.string()).max(20),
  dislikedExercises: z.array(z.string()).max(20),

  // Step: limitations (never diagnostic — informational only)
  injuries: z.string().trim().max(1000).optional().default(""),
  limitations: z.string().trim().max(1000).optional().default(""),
  avoidExercises: z.array(z.string()).max(20),

  // Step: lifestyle (optional)
  sleepHours: z.number().min(0).max(24).nullable(),
});

export const onboardingSchema = onboardingObjectSchema.refine((data) => data.goals.includes(data.primaryGoal), {
  message: "Primary goal must be one of your selected goals",
  path: ["primaryGoal"],
});

export type OnboardingData = z.infer<typeof onboardingObjectSchema>;

export const ONBOARDING_DEFAULTS: OnboardingData = {
  firstName: "",
  dateOfBirth: "",
  sex: "prefer_not_to_say",
  units: "metric",
  heightCm: 170,
  weightKg: 70,
  experienceLevel: "beginner",
  activityLevel: "lightly_active",
  goals: [],
  primaryGoal: "improve_general_fitness",
  daysPerWeek: 4,
  preferredDays: [1, 2, 4, 5],
  workoutDuration: "45_60",
  preferredTime: "flexible",
  equipment: [],
  location: "gym",
  splitType: "upper_lower",
  trainingStyle: "mixed",
  cardioPreference: "light",
  preferredExercises: [],
  dislikedExercises: [],
  injuries: "",
  limitations: "",
  avoidExercises: [],
  sleepHours: null,
};

/** Per-step field lists, used to validate only what's on screen before allowing "Continue". */
export const ONBOARDING_STEP_FIELDS = {
  welcome: ["firstName"],
  personal: ["dateOfBirth", "sex", "units", "heightCm", "weightKg"],
  experience: ["experienceLevel", "activityLevel"],
  goals: ["goals", "primaryGoal"],
  schedule: ["daysPerWeek", "preferredDays", "workoutDuration", "preferredTime"],
  equipment: ["equipment"],
  preferences: ["location", "splitType", "trainingStyle", "cardioPreference"],
  limitations: ["injuries", "limitations", "avoidExercises"],
  lifestyle: ["sleepHours"],
  review: [],
} as const satisfies Record<string, (keyof OnboardingData)[]>;

export type OnboardingStepId = keyof typeof ONBOARDING_STEP_FIELDS;

/** Validates only the fields shown on a given step, so "Continue" gates on what's visible. */
export function validateStep(stepId: OnboardingStepId, data: OnboardingData): { valid: boolean; message?: string } {
  const fields = ONBOARDING_STEP_FIELDS[stepId];
  if (fields.length === 0) return { valid: true };

  const shape = onboardingObjectSchema.pick(
    Object.fromEntries(fields.map((f) => [f, true])) as Record<(typeof fields)[number], true>
  );
  const result = shape.safeParse(data);
  if (result.success) return { valid: true };
  return { valid: false, message: result.error.issues[0]?.message };
}

export const ONBOARDING_STEPS: { id: OnboardingStepId; title: string }[] = [
  { id: "welcome", title: "Welcome" },
  { id: "personal", title: "About you" },
  { id: "experience", title: "Experience" },
  { id: "goals", title: "Goals" },
  { id: "schedule", title: "Schedule" },
  { id: "equipment", title: "Equipment" },
  { id: "preferences", title: "Training style" },
  { id: "limitations", title: "Limitations" },
  { id: "lifestyle", title: "Lifestyle" },
  { id: "review", title: "Review" },
];
