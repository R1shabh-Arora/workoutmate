"use client";

import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className="rounded-lg border border-input bg-background p-2.5 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30">
      <div className="flex flex-wrap items-center gap-1.5">
        {values.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 py-1 pl-2.5 pr-1">
            {tag}
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== tag))}
              className="rounded-full p-0.5 hover:bg-foreground/10"
              aria-label={`Remove ${tag}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder={values.length === 0 ? placeholder : "Add another…"}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
        />
        {draft && (
          <button
            type="button"
            onClick={commit}
            className="flex size-6 items-center justify-center rounded-full bg-accent text-muted-foreground hover:text-foreground"
            aria-label="Add"
          >
            <Plus className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
