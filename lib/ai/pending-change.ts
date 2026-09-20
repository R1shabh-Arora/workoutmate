import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/types/database.types";
import type { PendingChangeType } from "@/lib/types/enums";

type DbClient = SupabaseClient<Database>;

/**
 * Every mutating AI tool calls this instead of writing to the plan directly.
 * The row is only ever turned into a real change by applyPendingChange(),
 * triggered by the user clicking "Apply Change" in the UI — never by the
 * model itself.
 */
export async function proposeChange(
  supabase: DbClient,
  profileId: string,
  conversationId: string | null,
  changeType: PendingChangeType,
  summary: string,
  payload: Json
) {
  const { data, error } = await supabase
    .from("pending_plan_changes")
    .insert({ profile_id: profileId, conversation_id: conversationId, change_type: changeType, summary, payload, status: "pending" })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create change proposal: ${error?.message}`);
  }

  return data;
}
