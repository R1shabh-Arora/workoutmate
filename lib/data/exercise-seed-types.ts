import type { Difficulty, EquipmentKey, ExerciseCategory, MovementType, MuscleGroup } from "@/lib/types/enums";

export interface SeedExercise {
  slug: string;
  name: string;
  description: string;
  category: ExerciseCategory;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: EquipmentKey[];
  difficulty: Difficulty;
  movementType: MovementType;
  instructions: string[];
  commonMistakes: string[];
  isUnilateral?: boolean;
  /** Slugs of exercises that make good substitutes — used to seed exercise_alternatives (bidirectionally). */
  alternatives?: string[];
}
