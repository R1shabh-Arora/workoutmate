// Literal unions mirroring every CHECK constraint in supabase/migrations/*.sql.
// Keep these two in sync — this file is the single source of truth on the
// TypeScript side; the SQL CHECK constraints are the source of truth in Postgres.

export const SEX_OPTIONS = ["male", "female", "other", "prefer_not_to_say"] as const;
export type Sex = (typeof SEX_OPTIONS)[number];

export const UNITS_OPTIONS = ["metric", "imperial"] as const;
export type Units = (typeof UNITS_OPTIONS)[number];

export const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const ACTIVITY_LEVELS = [
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
  "extremely_active",
] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const AI_COACH_TONES = ["balanced", "encouraging", "direct"] as const;
export type AiCoachTone = (typeof AI_COACH_TONES)[number];

export const FITNESS_GOALS = [
  "build_muscle",
  "lose_fat",
  "lose_weight",
  "gain_weight",
  "improve_strength",
  "improve_endurance",
  "improve_cardio",
  "improve_mobility",
  "improve_general_fitness",
  "maintain_fitness",
  "athletic_performance",
] as const;
export type FitnessGoal = (typeof FITNESS_GOALS)[number];

export const GOAL_LABELS: Record<FitnessGoal, string> = {
  build_muscle: "Build muscle",
  lose_fat: "Lose fat",
  lose_weight: "Lose weight",
  gain_weight: "Gain weight",
  improve_strength: "Improve strength",
  improve_endurance: "Improve endurance",
  improve_cardio: "Improve cardiovascular fitness",
  improve_mobility: "Improve mobility",
  improve_general_fitness: "Improve general fitness",
  maintain_fitness: "Maintain fitness",
  athletic_performance: "Athletic performance",
};

export const GOAL_DESCRIPTIONS: Record<FitnessGoal, string> = {
  build_muscle: "Grow muscle size through progressive resistance training.",
  lose_fat: "Reduce body fat while preserving muscle.",
  lose_weight: "Lower overall body weight through training and consistency.",
  gain_weight: "Add size and mass with a structured strength focus.",
  improve_strength: "Get measurably stronger on key lifts.",
  improve_endurance: "Build muscular and cardiovascular stamina.",
  improve_cardio: "Improve heart health and aerobic capacity.",
  improve_mobility: "Move better with improved range of motion.",
  improve_general_fitness: "A well-rounded, balanced training approach.",
  maintain_fitness: "Stay consistent and hold onto current fitness.",
  athletic_performance: "Train for sport-specific power, speed and agility.",
};

export const SPLIT_TYPES = ["full_body", "upper_lower", "push_pull_legs", "body_part", "custom"] as const;
export type SplitType = (typeof SPLIT_TYPES)[number];

export const SPLIT_LABELS: Record<SplitType, string> = {
  full_body: "Full Body",
  upper_lower: "Upper / Lower",
  push_pull_legs: "Push / Pull / Legs",
  body_part: "Chest / Triceps · Back / Biceps · Shoulders / Abs · Legs",
  custom: "Custom",
};

export const WORKOUT_DURATIONS = ["15_30", "30_45", "45_60", "60_90", "90_plus"] as const;
export type WorkoutDuration = (typeof WORKOUT_DURATIONS)[number];

export const DURATION_LABELS: Record<WorkoutDuration, string> = {
  "15_30": "15–30 min",
  "30_45": "30–45 min",
  "45_60": "45–60 min",
  "60_90": "60–90 min",
  "90_plus": "90+ min",
};

// Midpoint minutes used by the generation engine to size a workout.
export const DURATION_MINUTES: Record<WorkoutDuration, number> = {
  "15_30": 25,
  "30_45": 40,
  "45_60": 52,
  "60_90": 75,
  "90_plus": 100,
};

export const PREFERRED_TIMES = ["morning", "afternoon", "evening", "flexible"] as const;
export type PreferredTime = (typeof PREFERRED_TIMES)[number];

export const LOCATIONS = ["home", "gym", "both"] as const;
export type Location = (typeof LOCATIONS)[number];

export const TRAINING_STYLES = ["strength", "hypertrophy", "circuit", "hiit", "endurance", "mixed"] as const;
export type TrainingStyle = (typeof TRAINING_STYLES)[number];

export const CARDIO_PREFERENCES = ["none", "light", "moderate", "high"] as const;
export type CardioPreference = (typeof CARDIO_PREFERENCES)[number];

export const EQUIPMENT_OPTIONS = [
  "none",
  "bodyweight",
  "dumbbells",
  "barbell",
  "bench",
  "cable_machine",
  "resistance_bands",
  "pull_up_bar",
  "kettlebells",
  "full_gym",
  "other",
] as const;
export type EquipmentKey = (typeof EQUIPMENT_OPTIONS)[number];

export const EQUIPMENT_LABELS: Record<EquipmentKey, string> = {
  none: "No equipment",
  bodyweight: "Bodyweight",
  dumbbells: "Dumbbells",
  barbell: "Barbell",
  bench: "Bench",
  cable_machine: "Cable machine",
  resistance_bands: "Resistance bands",
  pull_up_bar: "Pull-up bar",
  kettlebells: "Kettlebells",
  full_gym: "Full gym",
  other: "Other",
};

export const EXERCISE_CATEGORIES = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "legs",
  "core",
  "full_body",
  "cardio",
] as const;
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  legs: "Legs",
  core: "Core",
  full_body: "Full Body",
  cardio: "Cardio",
};

export const MUSCLE_GROUPS = [
  "chest",
  "lats",
  "upper_back",
  "lower_back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
  "obliques",
  "full_body",
  "cardio",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  lats: "Back",
  upper_back: "Upper Back",
  lower_back: "Lower Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  abs: "Core",
  obliques: "Obliques",
  full_body: "Full Body",
  cardio: "Cardio",
};

export const MOVEMENT_TYPES = ["compound", "isolation", "cardio", "mobility"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

// Where a library exercise's data came from. 'manual' = the original
// hand-authored ~75 (no source_id, no license — original content). Adding
// another source later means a new value here plus a migration extending
// exercises_source_check, same pattern as adding a split type.
export const EXERCISE_SOURCES = ["manual", "free_exercise_db"] as const;
export type ExerciseSource = (typeof EXERCISE_SOURCES)[number];

export const EXERCISE_SOURCE_LABELS: Record<ExerciseSource, string> = {
  manual: "WorkoutMate",
  free_exercise_db: "Free Exercise DB",
};

// push/pull/static — which direction load moves relative to the body.
// Distinct from movement_type (compound/isolation/cardio/mobility): a
// compound movement can be either a push (bench press) or a pull (row).
export const FORCE_TYPES = ["push", "pull", "static"] as const;
export type ForceType = (typeof FORCE_TYPES)[number];

export const FORCE_LABELS: Record<ForceType, string> = {
  push: "Push",
  pull: "Pull",
  static: "Static",
};

export const SESSION_STATUSES = ["in_progress", "completed", "skipped"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const PLAN_STATUSES = ["active", "archived", "draft"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const PLAN_SOURCES = ["system", "ai", "user"] as const;
export type PlanSource = (typeof PLAN_SOURCES)[number];

export const PR_TYPES = [
  "max_weight",
  "max_reps",
  "est_1rm",
  "max_volume_single_session",
  "longest_workout",
  "longest_streak",
] as const;
export type PersonalRecordType = (typeof PR_TYPES)[number];

export const PR_TYPE_LABELS: Record<PersonalRecordType, string> = {
  max_weight: "Heaviest weight",
  max_reps: "Most reps",
  est_1rm: "Estimated 1RM",
  max_volume_single_session: "Highest session volume",
  longest_workout: "Longest workout",
  longest_streak: "Longest streak",
};

export const PENDING_CHANGE_TYPES = [
  "replace_exercise",
  "update_workout",
  "move_workout",
  "adjust_duration",
  "change_training_days",
  "create_workout",
  "rebuild_plan",
  "change_split",
  "other",
] as const;
export type PendingChangeType = (typeof PENDING_CHANGE_TYPES)[number];

export const PENDING_CHANGE_STATUSES = ["pending", "applied", "cancelled", "expired"] as const;
export type PendingChangeStatus = (typeof PENDING_CHANGE_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "workout_reminder",
  "rest_day",
  "weekly_review",
  "streak",
  "goal",
  "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAYS_OF_WEEK_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
