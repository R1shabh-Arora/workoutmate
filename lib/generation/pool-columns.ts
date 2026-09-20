/**
 * The exact column list every "load the exercise pool for generation" query
 * selects, matching PoolExercise (./types.ts). Keep the two in sync.
 */
export const GENERATION_POOL_COLUMNS =
  "id, name, slug, category, primary_muscle, secondary_muscles, equipment, difficulty, movement_type, is_unilateral";
