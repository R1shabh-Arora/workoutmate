"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/data/profile";
import { persistPlan } from "@/lib/generation/persist";
import { estimateSetSeconds } from "@/lib/generation/prescription";
import type { GeneratedPlan } from "@/lib/generation/types";
import type { TablesUpdate } from "@/lib/types/database.types";

export async function createConversation(title = "New conversation") {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("coach_conversations")
    .insert({ profile_id: user.id, title })
    .select()
    .single();
  if (error || !data) throw new Error("Couldn't start a new conversation.");
  return data;
}

/**
 * The ONLY place a pending AI proposal becomes a real plan change. Re-checks
 * ownership and re-validates before writing anything — the model's tool call
 * only ever produced a proposal, never a mutation.
 */
export async function applyPendingChange(pendingChangeId: string) {
  const { supabase, user } = await requireUser();

  const { data: change } = await supabase
    .from("pending_plan_changes")
    .select("*")
    .eq("id", pendingChangeId)
    .eq("profile_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (!change) {
    throw new Error("This proposal is no longer available.");
  }

  const payload = change.payload as Record<string, unknown>;

  switch (change.change_type) {
    case "replace_exercise": {
      const { error } = await supabase
        .from("workout_exercises")
        .update({ exercise_id: payload.toExerciseId as string })
        .eq("id", payload.workoutExerciseId as string)
        .eq("profile_id", user.id);
      if (error) throw new Error("Couldn't apply that exercise swap.");
      break;
    }

    case "update_workout": {
      const patch: TablesUpdate<"workout_exercises"> = {};
      if (payload.sets != null) patch.sets = payload.sets as number;
      if (payload.repsMin != null) patch.reps_min = payload.repsMin as number;
      if (payload.repsMax != null) patch.reps_max = payload.repsMax as number;
      if (payload.restSeconds != null) patch.rest_seconds = payload.restSeconds as number;
      const { error } = await supabase
        .from("workout_exercises")
        .update(patch)
        .eq("id", payload.workoutExerciseId as string)
        .eq("profile_id", user.id);
      if (error) throw new Error("Couldn't update that exercise.");
      break;
    }

    case "move_workout": {
      const { error } = await supabase.rpc("swap_workout_days", {
        day_id_a: payload.dayIdA as string,
        day_id_b: payload.dayIdB as string,
      });
      if (error) throw new Error("Couldn't move that workout.");
      break;
    }

    case "adjust_duration": {
      const workoutDayId = payload.workoutDayId as string;
      const action = payload.action as string;

      const { data: exercises } = await supabase
        .from("workout_exercises")
        .select("*")
        .eq("workout_day_id", workoutDayId)
        .eq("profile_id", user.id)
        .order("order_index");

      if (exercises && exercises.length > 0) {
        if (action === "trim" && exercises.length > 3) {
          // Drop the trailing (lowest-priority) exercises until it fits, keeping at least 3.
          const target = payload.targetMinutes as number;
          const kept = [...exercises];
          while (kept.length > 3) {
            const estMinutes =
              6 + kept.reduce((sum, ex) => sum + ex.sets * (estimateSetSeconds(ex.reps_max ?? 10) + ex.rest_seconds) + 25, 0) / 60;
            if (estMinutes <= target) break;
            kept.pop();
          }
          const removedIds = exercises.filter((ex) => !kept.includes(ex)).map((ex) => ex.id);
          if (removedIds.length > 0) {
            await supabase.from("workout_exercises").delete().in("id", removedIds);
          }
        } else if (action === "extend") {
          // Add one working set to each existing exercise — a safe way to add
          // volume without needing to source brand-new exercises.
          for (const ex of exercises) {
            await supabase
              .from("workout_exercises")
              .update({ sets: Math.min(6, ex.sets + 1) })
              .eq("id", ex.id);
          }
        }

        const { data: refreshed } = await supabase.from("workout_exercises").select("*").eq("workout_day_id", workoutDayId);
        const newEstimate = Math.round(
          6 + (refreshed ?? []).reduce((sum, ex) => sum + ex.sets * (estimateSetSeconds(ex.reps_max ?? 10) + ex.rest_seconds) + 25, 0) / 60
        );
        await supabase.from("workout_days").update({ estimated_duration_minutes: newEstimate }).eq("id", workoutDayId);
      }
      break;
    }

    case "change_training_days":
    case "rebuild_plan":
    case "change_split": {
      const generatedPlan = payload.generatedPlan as GeneratedPlan;
      await persistPlan(supabase, user.id, generatedPlan, "ai");
      break;
    }

    default:
      throw new Error(`Unsupported change type: ${change.change_type}`);
  }

  await supabase
    .from("pending_plan_changes")
    .update({ status: "applied", resolved_at: new Date().toISOString() })
    .eq("id", pendingChangeId);

  await supabase.from("analytics_events").insert({
    profile_id: user.id,
    event_name: "plan_updated",
    properties: { change_type: change.change_type, via: "ai_coach" },
  });

  revalidatePath("/plan");
  revalidatePath("/dashboard");
  revalidatePath("/coach");

  return { applied: true, changeType: change.change_type, summary: change.summary };
}

export async function cancelPendingChange(pendingChangeId: string) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("pending_plan_changes")
    .update({ status: "cancelled", resolved_at: new Date().toISOString() })
    .eq("id", pendingChangeId)
    .eq("profile_id", user.id)
    .eq("status", "pending");
  revalidatePath("/coach");
}
