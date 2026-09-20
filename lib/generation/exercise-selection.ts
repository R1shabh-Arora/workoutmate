import type { Tables } from "@/lib/types/database.types";
import type { ExperienceLevel } from "@/lib/types/enums";
import type { ExerciseSlot } from "./types";

const EXPERIENCE_CEILING: Record<ExperienceLevel, Array<Tables<"exercises">["difficulty"]>> = {
  beginner: ["beginner"],
  intermediate: ["beginner", "intermediate"],
  advanced: ["beginner", "intermediate", "advanced"],
};

// Fallback order when nothing matches at the user's own ceiling — widen one
// step at a time. A beginner with no true-beginner option for a slot should
// land on intermediate before ever reaching advanced.
const CEILING_FALLBACK_ORDER: Array<Tables<"exercises">["difficulty"]>[] = [
  ["beginner"],
  ["beginner", "intermediate"],
  ["beginner", "intermediate", "advanced"],
];

function hasRequiredEquipment(exercise: Tables<"exercises">, available: ReadonlySet<string>): boolean {
  if (exercise.equipment.length === 0) return true;
  if (available.has("full_gym")) return true;
  return exercise.equipment.every((eq) => eq === "bodyweight" || available.has(eq));
}

function matchesSlot(exercise: Tables<"exercises">, slot: ExerciseSlot): boolean {
  if (slot.movementType && exercise.movement_type !== slot.movementType) return false;
  return slot.muscles.includes(exercise.primary_muscle);
}

/** Loose substring match so "burpees" excludes an exercise named "Burpee" and vice versa. */
function nameMatchesAny(name: string, terms: ReadonlySet<string>): boolean {
  const lower = name.toLowerCase();
  for (const term of terms) {
    if (term.length < 3) continue;
    if (lower.includes(term) || term.includes(lower)) return true;
  }
  return false;
}

export interface SelectExerciseParams {
  slot: ExerciseSlot;
  pool: Tables<"exercises">[];
  experience: ExperienceLevel;
  availableEquipment: ReadonlySet<string>;
  excludedTerms: ReadonlySet<string>;
  preferredTerms: ReadonlySet<string>;
  /** Exercise ids already used *on this day* — never repeat a lift within one workout. */
  usedTodayIds: ReadonlySet<string>;
  seed: number;
}

/**
 * Picks one exercise for a template slot. Falls back through progressively
 * looser constraints (difficulty ceiling, then equipment) rather than
 * leaving a slot empty, but never crosses the hard exclusion list (injuries
 * / disliked exercises) or repeats an exercise already used today.
 */
export function selectExercise({
  slot,
  pool,
  experience,
  availableEquipment,
  excludedTerms,
  preferredTerms,
  usedTodayIds,
  seed,
}: SelectExerciseParams): Tables<"exercises"> | null {
  const base = pool.filter(
    (ex) =>
      matchesSlot(ex, slot) &&
      !usedTodayIds.has(ex.id) &&
      !nameMatchesAny(ex.name, excludedTerms) &&
      hasRequiredEquipment(ex, availableEquipment)
  );

  // Start at the user's own ceiling, then widen one step at a time — never
  // jump straight from "beginner only" to "anything including advanced".
  const startIndex = CEILING_FALLBACK_ORDER.findIndex(
    (tier) => tier.length === EXPERIENCE_CEILING[experience].length
  );
  let candidates: Tables<"exercises">[] = [];
  for (let i = Math.max(0, startIndex); i < CEILING_FALLBACK_ORDER.length; i++) {
    const tier = new Set(CEILING_FALLBACK_ORDER[i]);
    candidates = base.filter((ex) => tier.has(ex.difficulty));
    if (candidates.length > 0) break;
  }
  if (candidates.length === 0) return null;

  const preferred = candidates.filter((ex) => nameMatchesAny(ex.name, preferredTerms));
  const shortlist = preferred.length > 0 ? preferred : candidates;

  // Deterministic pseudo-random pick: varied across slots/days, reproducible
  // for a given seed so a re-run for the same input is stable.
  const index = Math.abs(seed) % shortlist.length;
  return shortlist[index] ?? null;
}

export function normalizeTerms(terms: string[]): Set<string> {
  return new Set(terms.map((t) => t.trim().toLowerCase()).filter(Boolean));
}
