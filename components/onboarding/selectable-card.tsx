"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function SelectableCard({
  selected,
  onClick,
  title,
  description,
  icon,
  compact = false,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-xl border text-left transition-all duration-150",
        compact ? "px-3.5 py-3" : "px-4 py-3.5",
        selected
          ? "border-primary bg-primary/[0.06] ring-1 ring-primary"
          : "border-border bg-card hover:border-foreground/20 hover:bg-accent/50"
      )}
    >
      {icon && (
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
            selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className={cn("font-medium", compact ? "text-sm" : "text-sm")}>{title}</div>
        {description && <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</div>}
      </div>
      <div
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent"
        )}
      >
        {selected && <Check className="size-3" strokeWidth={3} />}
      </div>
    </button>
  );
}
