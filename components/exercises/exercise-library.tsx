"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ExerciseCard } from "./exercise-card";
import { searchExercisesAction } from "@/lib/actions/exercises";
import { cn } from "@/lib/utils";
import {
  EXERCISE_CATEGORIES,
  CATEGORY_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  EQUIPMENT_OPTIONS,
  EQUIPMENT_LABELS,
  DIFFICULTIES,
  MOVEMENT_TYPES,
  type ExerciseCategory,
  type MuscleGroup,
  type EquipmentKey,
  type Difficulty,
  type MovementType,
} from "@/lib/types/enums";
import type { ExerciseFilters, ExerciseSearchResult } from "@/lib/data/exercises";
import type { Tables } from "@/lib/types/database.types";

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function ExerciseLibrary({ initial }: { initial: ExerciseSearchResult }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ExerciseCategory | null>(null);
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [equipment, setEquipment] = useState<EquipmentKey | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [movementType, setMovementType] = useState<MovementType | null>(null);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [exercises, setExercises] = useState<Tables<"exercises">[]>(initial.exercises);
  const [total, setTotal] = useState(initial.total);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [page, setPage] = useState(0);
  const [isPending, startTransition] = useTransition();

  const isFirstRun = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function currentFilters(): ExerciseFilters {
    return {
      query: query || undefined,
      category: category ?? undefined,
      muscle: muscle ?? undefined,
      equipment: equipment ?? undefined,
      difficulty: difficulty ?? undefined,
      movementType: movementType ?? undefined,
    };
  }

  function runSearch(nextPage: number, replace: boolean) {
    startTransition(async () => {
      const result = await searchExercisesAction(currentFilters(), nextPage);
      setExercises((prev) => (replace ? result.exercises : [...prev, ...result.exercises]));
      setTotal(result.total);
      setHasMore(result.hasMore);
      setPage(nextPage);
    });
  }

  // Any filter change (not the raw query, which is debounced separately
  // below) restarts from page 0 with fresh results.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    runSearch(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, muscle, equipment, difficulty, movementType]);

  useEffect(() => {
    if (isFirstRun.current) return; // covered by the effect above on mount
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(0, true), 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const activeFilterCount = [muscle, equipment, difficulty, movementType].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search exercises…" className="h-11 pl-10" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Chip active={category === null} onClick={() => setCategory(null)}>
          All
        </Chip>
        {EXERCISE_CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>
            {CATEGORY_LABELS[c]}
          </Chip>
        ))}
        <button
          type="button"
          onClick={() => setShowMoreFilters((v) => !v)}
          className={cn(
            "ml-auto flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            showMoreFilters || activeFilterCount > 0
              ? "border-primary text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <SlidersHorizontal className="size-3.5" />
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
      </div>

      {showMoreFilters && (
        <div className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Muscle</p>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.filter((m) => m !== "full_body" && m !== "cardio").map((m) => (
                <Chip key={m} active={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)}>
                  {MUSCLE_GROUP_LABELS[m]}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Equipment</p>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT_OPTIONS.map((e) => (
                <Chip key={e} active={equipment === e} onClick={() => setEquipment(equipment === e ? null : e)}>
                  {EQUIPMENT_LABELS[e]}
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Difficulty</p>
              <div className="flex flex-wrap gap-1.5">
                {DIFFICULTIES.map((d) => (
                  <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(difficulty === d ? null : d)}>
                    <span className="capitalize">{d}</span>
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Movement</p>
              <div className="flex flex-wrap gap-1.5">
                {MOVEMENT_TYPES.map((m) => (
                  <Chip key={m} active={movementType === m} onClick={() => setMovementType(movementType === m ? null : m)}>
                    <span className="capitalize">{m}</span>
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {total} exercise{total === 1 ? "" : "s"}
        {isPending && page === 0 ? " · searching…" : ""}
      </p>

      {exercises.length === 0 && !isPending ? (
        <EmptyState icon={Search} title="No exercises found" description="Try a different search term or filter combination." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {exercises.map((ex) => (
              <ExerciseCard key={ex.id} exercise={ex} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => runSearch(page + 1, false)} disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
