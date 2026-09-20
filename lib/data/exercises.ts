import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types/database.types";
import type { Difficulty, EquipmentKey, ExerciseCategory, MovementType, MuscleGroup } from "@/lib/types/enums";

export interface ExerciseFilters {
  query?: string;
  muscle?: MuscleGroup;
  equipment?: EquipmentKey;
  difficulty?: Difficulty;
  category?: ExerciseCategory;
  movementType?: MovementType;
}

export interface ExerciseSearchResult {
  exercises: Tables<"exercises">[];
  total: number;
  hasMore: boolean;
}

const PAGE_SIZE = 24;

/**
 * The exercise library is shared reference data — readable by anyone, no
 * auth required. Server-side filtered + paginated (the library is ~900
 * rows since the Free Exercise DB import — too many to ever load whole into
 * the browser, see docs/DATABASE.md).
 */
export async function searchExerciseLibrary(filters: ExerciseFilters, page = 0): Promise<ExerciseSearchResult> {
  const supabase = await createClient();
  let q = supabase.from("exercises").select("*", { count: "exact" }).eq("is_active", true);

  if (filters.query && filters.query.trim()) {
    q = q.textSearch("search_vector", filters.query.trim(), { type: "websearch", config: "english" });
  }
  if (filters.muscle) q = q.eq("primary_muscle", filters.muscle);
  if (filters.equipment) q = q.contains("equipment", [filters.equipment]);
  if (filters.difficulty) q = q.eq("difficulty", filters.difficulty);
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.movementType) q = q.eq("movement_type", filters.movementType);

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, count } = await q.order("name").range(from, to);
  const total = count ?? 0;
  return { exercises: data ?? [], total, hasMore: from + (data?.length ?? 0) < total };
}
