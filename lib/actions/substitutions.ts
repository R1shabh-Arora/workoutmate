"use server";

import { requireUser } from "@/lib/data/profile";
import { getSubstitutesForExercise } from "@/lib/data/substitutions";

/** Client-callable wrapper so the "swap exercise" dialog can fetch options on demand. */
export async function fetchSubstitutes(exerciseId: string) {
  const { supabase, user } = await requireUser();

  const { data: prefs } = await supabase
    .from("training_preferences")
    .select("equipment, disliked_exercises")
    .eq("profile_id", user.id)
    .maybeSingle();
  const { data: limitations } = await supabase
    .from("physical_limitations")
    .select("avoid_exercises")
    .eq("profile_id", user.id)
    .maybeSingle();

  return getSubstitutesForExercise(exerciseId, {
    equipment: (prefs?.equipment as string[]) ?? [],
    excludeTerms: [...(prefs?.disliked_exercises ?? []), ...(limitations?.avoid_exercises ?? [])],
  });
}
