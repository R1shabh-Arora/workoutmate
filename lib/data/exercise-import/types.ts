import type {
  Difficulty,
  EquipmentKey,
  ExerciseCategory,
  ExerciseSource,
  ForceType,
  MovementType,
  MuscleGroup,
} from "@/lib/types/enums";

/** One exercise, already mapped onto WorkoutMate's own vocabulary — ready to upsert. */
export interface NormalizedExercise {
  source: ExerciseSource;
  sourceId: string;
  slug: string;
  name: string;
  description: string;
  category: ExerciseCategory;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: EquipmentKey[];
  difficulty: Difficulty;
  movementType: MovementType;
  force: ForceType | null;
  instructions: string[];
  commonMistakes: string[];
  isUnilateral: boolean;
  aliases: string[];
  license: string;
  licenseUrl: string;
  attribution: string;
  externalUrl: string;
}

export interface SkippedRecord {
  identifier: string;
  reason: string;
}

/**
 * One external exercise dataset. To add a new source later (e.g. wger),
 * implement this interface and add one line to scripts/import-exercises.ts —
 * the dedupe/upsert/report pipeline (./pipeline.ts) is shared and unchanged.
 */
export interface ExerciseSourceAdapter {
  source: ExerciseSource;
  label: string;
  /** Fetches the raw dataset. Network/parsing errors propagate — the script fails loudly rather than importing a partial dataset. */
  fetchRaw(): Promise<unknown[]>;
  /** Validates + maps one raw record. Returns a skip reason instead of throwing for a malformed or unmappable record. */
  normalize(raw: unknown): NormalizedExercise | SkippedRecord;
}
