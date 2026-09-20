import "server-only";
import { requireUser } from "./profile";
import type { Tables } from "@/lib/types/database.types";

/**
 * Finds good substitutes for an exercise: curated alternatives first (seeded
 * by movement pattern / target muscle), falling back to a same-primary-muscle
 * search if nothing curated is available. Always respects equipment and any
 * excluded terms (dislikes / avoid-list).
 */
export async function getSubstitutesForExercise(
  exerciseId: string,
  opts?: { equipment?: string[]; excludeTerms?: string[] }
): Promise<Tables<"exercises">[]> {
  const { supabase } = await requireUser();

  const { data: original } = await supabase.from("exercises").select("*").eq("id", exerciseId).maybeSingle();
  if (!original) return [];

  const { data: curated } = await supabase
    .from("exercise_alternatives")
    .select("alternative_exercise_id, priority")
    .eq("exercise_id", exerciseId)
    .order("priority", { ascending: false });

  const curatedIds = (curated ?? []).map((c) => c.alternative_exercise_id);

  let candidates: Tables<"exercises">[] = [];
  if (curatedIds.length > 0) {
    const { data } = await supabase.from("exercises").select("*").in("id", curatedIds).eq("is_active", true);
    const byId = new Map((data ?? []).map((e) => [e.id, e]));
    candidates = curatedIds.map((id) => byId.get(id)).filter((e): e is Tables<"exercises"> => !!e);
  }

  if (candidates.length === 0) {
    const { data } = await supabase
      .from("exercises")
      .select("*")
      .eq("primary_muscle", original.primary_muscle)
      .eq("movement_type", original.movement_type)
      .eq("is_active", true)
      .neq("id", exerciseId)
      .limit(8);
    candidates = data ?? [];
  }

  const equipment = opts?.equipment;
  if (equipment && equipment.length > 0) {
    const available = new Set(equipment.map((e) => (e.startsWith("other:") ? "other" : e)));
    candidates = candidates.filter(
      (ex) =>
        ex.equipment.length === 0 ||
        available.has("full_gym") ||
        ex.equipment.every((eq) => eq === "bodyweight" || available.has(eq))
    );
  }

  const exclude = (opts?.excludeTerms ?? []).map((t) => t.toLowerCase().trim()).filter((t) => t.length > 2);
  if (exclude.length > 0) {
    candidates = candidates.filter((ex) => !exclude.some((t) => ex.name.toLowerCase().includes(t)));
  }

  return candidates;
}
