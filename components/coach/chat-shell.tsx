"use client";

import { useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { ShieldAlert } from "lucide-react";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { EmptyChatState } from "./empty-chat-state";
import { ConversationMenu } from "./conversation-menu";
import { LogoMark } from "@/components/marketing/logo";
import type { Tables } from "@/lib/types/database.types";

export function ChatShell({
  conversationId,
  initialMessages,
  conversations,
  firstName,
}: {
  conversationId: string;
  initialMessages: UIMessage[];
  conversations: Tables<"coach_conversations">[];
  firstName: string;
}) {
  const { messages, sendMessage, status, error } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/coach", body: { conversationId } }),
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function handleSend(text: string) {
    sendMessage({ text });
  }

  return (
    <div className="flex h-[calc(100svh-3.5rem)] flex-col lg:h-[calc(100svh-2.5rem)]">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <LogoMark className="size-8 rounded-full" />
          <span className="text-sm font-semibold">AI Coach</span>
        </div>
        <ConversationMenu conversations={conversations} activeId={conversationId} />
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <EmptyChatState firstName={firstName} onPick={handleSend} />
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}

        {status === "submitted" && (
          <div className="flex items-center gap-1.5 pl-9 text-xs text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
            <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
          </div>
        )}

        {error && (
          <div className="mx-9 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <ShieldAlert className="size-3.5 shrink-0" />
            Something went wrong. Please try again.
          </div>
        )}
      </div>

      <div className="border-t border-border pt-3">
        <ChatInput onSend={handleSend} disabled={isBusy} />
        <p className="mt-2 text-center text-[0.6875rem] text-muted-foreground">
          General fitness guidance only — not medical advice.
        </p>
      </div>
    </div>
  );
}
