import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types/database.types";

/** Redirects to /login if there's no session. Belt-and-braces alongside the proxy — never trust the client alone. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export type FullProfile = {
  profile: Tables<"profiles">;
  goals: Tables<"fitness_goals">[];
  preferences: Tables<"training_preferences"> | null;
  limitations: Tables<"physical_limitations"> | null;
};

/** Loads the signed-in user's full onboarding profile. Redirects to /login if unauthenticated. */
export async function getFullProfile(): Promise<FullProfile> {
  const { supabase, user } = await requireUser();

  const [{ data: profile }, { data: goals }, { data: preferences }, { data: limitations }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("fitness_goals").select("*").eq("profile_id", user.id),
    supabase.from("training_preferences").select("*").eq("profile_id", user.id).maybeSingle(),
    supabase.from("physical_limitations").select("*").eq("profile_id", user.id).maybeSingle(),
  ]);

  if (!profile) {
    // The handle_new_user() trigger should have created this row already.
    throw new Error("Profile not found for signed-in user.");
  }

  return { profile, goals: goals ?? [], preferences: preferences ?? null, limitations: limitations ?? null };
}

/** Use in layouts that must only render for users who have finished onboarding. */
export async function requireOnboardedProfile(): Promise<FullProfile> {
  const full = await getFullProfile();
  if (!full.profile.onboarding_completed_at) {
    redirect("/onboarding");
  }
  return full;
}
