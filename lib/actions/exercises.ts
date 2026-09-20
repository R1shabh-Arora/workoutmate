"use server";

import { searchExerciseLibrary, type ExerciseFilters, type ExerciseSearchResult } from "@/lib/data/exercises";

/** Public reference data — no auth required, same as the page itself. */
export async function searchExercisesAction(filters: ExerciseFilters, page: number): Promise<ExerciseSearchResult> {
  return searchExerciseLibrary(filters, page);
}
