import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";
import { COACH_SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { buildCoachContext } from "@/lib/ai/context";
import { buildCoachTools } from "@/lib/ai/tools";
import { checkCoachRateLimit } from "@/lib/ai/rate-limit";
import type { Json } from "@/lib/types/database.types";

export const maxDuration = 60;

// The `anthropic` provider reads ANTHROPIC_API_KEY from the environment itself.
const MODEL_ID = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const withinRateLimit = await checkCoachRateLimit(user.id);
  if (!withinRateLimit) {
    return new Response("You're sending messages a bit fast — please wait a moment and try again.", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  let body: { messages: UIMessage[]; conversationId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const { messages, conversationId } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("No messages provided", { status: 400 });
  }

  if (conversationId) {
    const { data: conversation } = await supabase
      .from("coach_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("profile_id", user.id)
      .maybeSingle();
    if (!conversation) {
      return new Response("Conversation not found", { status: 404 });
    }
  }

  // Persist the user's new message immediately, before generation, so it's
  // never lost even if the model call fails.
  const lastMessage = messages[messages.length - 1];
  if (conversationId && lastMessage?.role === "user") {
    const text = lastMessage.parts
      .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
      .map((p) => p.text)
      .join("");
    await supabase.from("coach_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: text,
    });

    const { data: conversation } = await supabase
      .from("coach_conversations")
      .select("title")
      .eq("id", conversationId)
      .single();
    if (conversation?.title === "New conversation" && text.trim()) {
      const title = text.trim().slice(0, 60) + (text.trim().length > 60 ? "…" : "");
      await supabase.from("coach_conversations").update({ title }).eq("id", conversationId);
    }
  }

  const contextBlock = await buildCoachContext(supabase, user.id);
  const tools = buildCoachTools(supabase, user.id, conversationId ?? null);
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: anthropic(MODEL_ID),
    system: `${COACH_SYSTEM_PROMPT}\n\n${contextBlock}`,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(5),
    onError: (event) => {
      console.error("[coach route] streamText error:", event.error);
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onEnd: async ({ messages: finalMessages }) => {
      if (!conversationId) return;
      const assistantMessage = finalMessages[finalMessages.length - 1];
      if (!assistantMessage || assistantMessage.role !== "assistant") return;

      const text = assistantMessage.parts
        .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
        .map((p) => p.text)
        .join("");

      const toolParts = assistantMessage.parts.filter((p) => p.type.startsWith("tool-"));

      await supabase.from("coach_messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: text,
        tool_calls: toolParts.length > 0 ? (toolParts as unknown as Json) : null,
      });

      await supabase.from("coach_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

      await supabase.from("analytics_events").insert({
        profile_id: user.id,
        event_name: "ai_coach_used",
        properties: { tool_calls: toolParts.length },
      });
    },
  });
}
