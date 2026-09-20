import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getFullProfile } from "@/lib/data/profile";
import { getRecentConversations, getOrCreateActiveConversation, getConversation, getConversationUIMessages } from "@/lib/data/coach";
import { ChatShell } from "@/components/coach/chat-shell";

export const metadata: Metadata = { title: "AI Coach" };

export default async function CoachPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const { profile } = await getFullProfile();

  let conversation = c ? await getConversation(c) : null;
  if (!conversation) {
    conversation = await getOrCreateActiveConversation();
    if (c) redirect(`/coach?c=${conversation.id}`);
  }

  const [conversations, initialMessages] = await Promise.all([
    getRecentConversations(),
    getConversationUIMessages(conversation.id),
  ]);

  return (
    <ChatShell
      key={conversation.id}
      conversationId={conversation.id}
      initialMessages={initialMessages}
      conversations={conversations}
      firstName={profile.first_name}
    />
  );
}
