import type { SeedExercise } from "./exercise-seed-types";
import { CHEST_EXERCISES } from "./exercises/chest";
import { BACK_EXERCISES } from "./exercises/back";
import { SHOULDER_EXERCISES } from "./exercises/shoulders";
import { ARM_EXERCISES } from "./exercises/arms";
import { LEG_EXERCISES } from "./exercises/legs";
import { CORE_EXERCISES } from "./exercises/core";
import { FULL_BODY_EXERCISES } from "./exercises/full-body";
import { CARDIO_EXERCISES } from "./exercises/cardio";

export const EXERCISE_SEED_DATA: SeedExercise[] = [
  ...CHEST_EXERCISES,
  ...BACK_EXERCISES,
  ...SHOULDER_EXERCISES,
  ...ARM_EXERCISES,
  ...LEG_EXERCISES,
  ...CORE_EXERCISES,
  ...FULL_BODY_EXERCISES,
  ...CARDIO_EXERCISES,
];
