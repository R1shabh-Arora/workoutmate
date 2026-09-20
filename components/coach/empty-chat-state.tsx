"use client";

import { MessageCircle } from "lucide-react";

const EXAMPLE_PROMPTS = [
  "What should I train today?",
  "I only have 30 minutes today",
  "Why am I not progressing on bench press?",
  "Can you replace squats? My gym is busy.",
];

export function EmptyChatState({ firstName, onPick }: { firstName: string; onPick: (prompt: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageCircle className="size-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Ask your coach anything</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {firstName ? `${firstName}, y` : "Y"}our coach knows your profile, plan and history — no need to repeat yourself.
      </p>
      <div className="mt-6 flex w-full max-w-sm flex-col gap-2">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPick(prompt)}
            className="rounded-xl border border-border bg-card px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
