"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createConversation } from "@/lib/actions/coach";
import { formatDistanceToNowStrict } from "date-fns";
import type { Tables } from "@/lib/types/database.types";

export function ConversationMenu({
  conversations,
  activeId,
}: {
  conversations: Tables<"coach_conversations">[];
  activeId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleNewChat() {
    startTransition(async () => {
      const conversation = await createConversation();
      router.push(`/coach?c=${conversation.id}`);
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="ghost" size="icon-sm" onClick={handleNewChat} disabled={isPending} aria-label="New conversation">
        <Plus className="size-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Conversation history">
            <History className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Conversations</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {conversations.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">No past conversations yet.</p>
          ) : (
            conversations.map((c) => (
              <DropdownMenuItem key={c.id} onClick={() => router.push(`/coach?c=${c.id}`)} className={c.id === activeId ? "bg-accent" : ""}>
                <div className="min-w-0 flex-1">
                  <p className="truncate">{c.title}</p>
                  <p className="text-[0.7rem] text-muted-foreground">{formatDistanceToNowStrict(new Date(c.updated_at), { addSuffix: true })}</p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
