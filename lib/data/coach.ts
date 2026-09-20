import "server-only";
import type { UIMessage } from "ai";
import { requireUser } from "./profile";
import type { Tables } from "@/lib/types/database.types";

export async function getRecentConversations(limit = 15): Promise<Tables<"coach_conversations">[]> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("coach_conversations")
    .select("*")
    .eq("profile_id", user.id)
    .eq("archived", false)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getOrCreateActiveConversation(): Promise<Tables<"coach_conversations">> {
  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("coach_conversations")
    .select("*")
    .eq("profile_id", user.id)
    .eq("archived", false)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("coach_conversations")
    .insert({ profile_id: user.id, title: "New conversation" })
    .select()
    .single();
  if (error || !created) throw new Error("Couldn't start a conversation.");
  return created;
}

export async function getConversation(id: string): Promise<Tables<"coach_conversations"> | null> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("coach_conversations").select("*").eq("id", id).eq("profile_id", user.id).maybeSingle();
  return data;
}

/** Converts stored coach_messages rows back into the UIMessage shape useChat expects for initial history. */
export async function getConversationUIMessages(conversationId: string): Promise<UIMessage[]> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("coach_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true });

  const messages = (data ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => {
      const parts: UIMessage["parts"] = [];
      if (m.content) parts.push({ type: "text", text: m.content });
      if (Array.isArray(m.tool_calls)) {
        for (const part of m.tool_calls as UIMessage["parts"]) {
          parts.push(part);
        }
      }
      return { id: m.id, role: m.role as "user" | "assistant", parts };
    });

  // A proposal's tool-output only ever recorded "proposed: true" — the state
  // at the moment it was created. It may since have been applied or
  // cancelled, so stamp each one's real current status on reload; the
  // ConfirmationCard reads `currentStatus` instead of always assuming pending.
  const pendingChangeIds = new Set<string>();
  for (const message of messages) {
    for (const part of message.parts) {
      if (!part.type.startsWith("tool-") || !("output" in part)) continue;
      const output = part.output as Record<string, unknown> | undefined;
      if (output?.proposed === true && typeof output.pendingChangeId === "string") {
        pendingChangeIds.add(output.pendingChangeId);
      }
    }
  }

  if (pendingChangeIds.size > 0) {
    const { data: changes } = await supabase
      .from("pending_plan_changes")
      .select("id, status")
      .eq("profile_id", user.id)
      .in("id", Array.from(pendingChangeIds));
    const statusById = new Map((changes ?? []).map((c) => [c.id, c.status]));

    for (const message of messages) {
      for (const part of message.parts as Array<{ type: string; output?: unknown }>) {
        if (!part.type.startsWith("tool-") || !("output" in part)) continue;
        const output = part.output as Record<string, unknown> | undefined;
        const currentStatus = typeof output?.pendingChangeId === "string" ? statusById.get(output.pendingChangeId) : undefined;
        if (currentStatus) part.output = { ...output, currentStatus };
      }
    }
  }

  return messages;
}
