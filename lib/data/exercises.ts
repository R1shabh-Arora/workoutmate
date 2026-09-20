import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types/database.types";

/** The exercise library is shared reference data — readable by anyone, no auth required. */
export async function getExerciseLibrary(): Promise<Tables<"exercises">[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("exercises").select("*").eq("is_active", true).order("name");
  return data ?? [];
}
