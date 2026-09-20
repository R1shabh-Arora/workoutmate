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

  return (data ?? [])
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
}
