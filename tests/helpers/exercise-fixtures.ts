import { EXERCISE_SEED_DATA } from "@/lib/data/exercises-seed";
import type { Tables } from "@/lib/types/database.types";

/** Converts the real seed data into DB-row-shaped fixtures, so tests exercise the actual production exercise library. */
export const EXERCISE_FIXTURES: Tables<"exercises">[] = EXERCISE_SEED_DATA.map((ex, i) => ({
  id: `fixture-${i}-${ex.slug}`,
  slug: ex.slug,
  name: ex.name,
  description: ex.description,
  category: ex.category,
  primary_muscle: ex.primaryMuscle,
  secondary_muscles: ex.secondaryMuscles,
  equipment: ex.equipment,
  difficulty: ex.difficulty,
  movement_type: ex.movementType,
  instructions: ex.instructions,
  common_mistakes: ex.commonMistakes,
  video_url: null,
  image_url: null,
  is_unilateral: ex.isUnilateral ?? false,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));
