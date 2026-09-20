"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { ExerciseCard } from "./exercise-card";
import { cn } from "@/lib/utils";
import { EXERCISE_CATEGORIES, CATEGORY_LABELS } from "@/lib/types/enums";
import type { Tables } from "@/lib/types/database.types";

export function ExerciseLibrary({ exercises }: { exercises: Tables<"exercises">[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesQuery = !query || ex.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !category || ex.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [exercises, query, category]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search exercises…" className="h-11 pl-10" />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            category === null ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
          )}
        >
          All
        </button>
        {EXERCISE_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              category === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
            )}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No exercises found" description="Try a different search term or category." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} />
          ))}
        </div>
      )}
    </div>
  );
}
