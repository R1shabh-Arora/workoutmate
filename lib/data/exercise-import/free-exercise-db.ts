import { z } from "zod";
import type { Difficulty, EquipmentKey, ExerciseCategory, ForceType, MovementType, MuscleGroup } from "@/lib/types/enums";
import type { ExerciseSourceAdapter, NormalizedExercise, SkippedRecord } from "./types";

const SOURCE_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const REPO_URL = "https://github.com/yuhonas/free-exercise-db";
const LICENSE = "Unlicense (public domain)";
const LICENSE_URL = "https://unlicense.org/";
const ATTRIBUTION = "Exercise data from Free Exercise DB (github.com/yuhonas/free-exercise-db), dedicated to the public domain under the Unlicense.";

// Free Exercise DB's own JSON Schema (schema.json in their repo) is looser
// than this — e.g. "mechanic" is nullable and not every field is always
// present the same way across all 800+ hand-contributed entries. Validate
// only what normalize() actually needs; a record missing something required
// here is skipped, not a hard failure for the whole import.
const rawExerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  force: z.string().nullable().optional(),
  level: z.string(),
  mechanic: z.string().nullable().optional(),
  equipment: z.string().nullable().optional(),
  primaryMuscles: z.array(z.string()),
  secondaryMuscles: z.array(z.string()).optional(),
  instructions: z.array(z.string()).optional(),
  category: z.string(),
});

// ── Value mapping tables — Free Exercise DB's vocabulary onto WorkoutMate's ──
// Deliberately explicit (no fallthrough guess) so an unrecognized value is a
// visible skip in the import report, not a silently wrong muscle/category.

const MUSCLE_MAP: Record<string, MuscleGroup> = {
  abdominals: "abs",
  abductors: "glutes",
  adductors: "quads",
  biceps: "biceps",
  calves: "calves",
  chest: "chest",
  forearms: "forearms",
  glutes: "glutes",
  hamstrings: "hamstrings",
  lats: "lats",
  "lower back": "lower_back",
  "middle back": "upper_back",
  neck: "shoulders",
  quadriceps: "quads",
  shoulders: "shoulders",
  traps: "upper_back",
  triceps: "triceps",
};

const CATEGORY_BY_MUSCLE: Record<MuscleGroup, ExerciseCategory> = {
  chest: "chest",
  lats: "back",
  upper_back: "back",
  lower_back: "back",
  shoulders: "shoulders",
  biceps: "arms",
  triceps: "arms",
  forearms: "arms",
  quads: "legs",
  hamstrings: "legs",
  glutes: "legs",
  calves: "legs",
  abs: "core",
  obliques: "core",
  full_body: "full_body",
  cardio: "cardio",
};

const EQUIPMENT_MAP: Record<string, EquipmentKey> = {
  "body only": "bodyweight",
  machine: "cable_machine",
  kettlebells: "kettlebells",
  dumbbell: "dumbbells",
  cable: "cable_machine",
  barbell: "barbell",
  bands: "resistance_bands",
  "medicine ball": "other",
  "exercise ball": "other",
  "e-z curl bar": "barbell",
  "foam roll": "other",
  other: "other",
  none: "none",
};

const DIFFICULTY_MAP: Record<string, Difficulty> = {
  beginner: "beginner",
  intermediate: "intermediate",
  expert: "advanced",
};

const FORCE_MAP: Record<string, ForceType> = {
  push: "push",
  pull: "pull",
  static: "static",
};

// FEDB's "mechanic" (compound/isolation/null) is mapped straight onto the
// existing movement_type column instead of a separate column — a dedicated
// "mechanic" field would just duplicate it (see the migration's header
// comment). For categories with no compound/isolation notion (cardio,
// stretching), movement_type is derived from FEDB's own category instead.
function resolveMovementType(mechanic: string | null | undefined, category: string): MovementType {
  if (mechanic === "compound") return "compound";
  if (mechanic === "isolation") return "isolation";
  if (category === "cardio" || category === "plyometrics") return "cardio";
  if (category === "stretching") return "mobility";
  return "compound"; // olympic weightlifting / strongman / powerlifting are virtually all compound
}

const UNILATERAL_HINTS = ["single-arm", "single arm", "single-leg", "single leg", "one-arm", "one arm", "one-leg", "one leg", "alternate", "unilateral"];
function looksUnilateral(name: string): boolean {
  const lower = name.toLowerCase();
  return UNILATERAL_HINTS.some((hint) => lower.includes(hint));
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalize(raw: unknown): NormalizedExercise | SkippedRecord {
  const parsed = rawExerciseSchema.safeParse(raw);
  if (!parsed.success) {
    const identifier = typeof raw === "object" && raw && "id" in raw ? String((raw as { id: unknown }).id) : "(unparseable record)";
    return { identifier, reason: `failed schema validation: ${parsed.error.issues[0]?.message ?? "unknown"}` };
  }
  const rec = parsed.data;

  const primaryMuscleRaw = rec.primaryMuscles[0];
  if (!primaryMuscleRaw) return { identifier: rec.id, reason: "no primary muscle listed" };
  const primaryMuscle = MUSCLE_MAP[primaryMuscleRaw];
  if (!primaryMuscle) return { identifier: rec.id, reason: `unmapped primary muscle "${primaryMuscleRaw}"` };

  const secondaryMuscles = (rec.secondaryMuscles ?? [])
    .map((m) => MUSCLE_MAP[m])
    .filter((m): m is MuscleGroup => Boolean(m));

  const difficulty = DIFFICULTY_MAP[rec.level];
  if (!difficulty) return { identifier: rec.id, reason: `unmapped level "${rec.level}"` };

  const equipmentKey = rec.equipment ? EQUIPMENT_MAP[rec.equipment] : "none";
  if (rec.equipment && !equipmentKey) return { identifier: rec.id, reason: `unmapped equipment "${rec.equipment}"` };
  const equipment: EquipmentKey[] = equipmentKey && equipmentKey !== "none" ? [equipmentKey] : [];

  const force = rec.force ? (FORCE_MAP[rec.force] ?? null) : null;

  return {
    source: "free_exercise_db",
    sourceId: rec.id,
    slug: `fedb-${slugify(rec.id)}`,
    name: rec.name,
    description: "",
    category: CATEGORY_BY_MUSCLE[primaryMuscle],
    primaryMuscle,
    secondaryMuscles,
    equipment,
    difficulty,
    movementType: resolveMovementType(rec.mechanic, rec.category),
    force,
    instructions: rec.instructions ?? [],
    commonMistakes: [],
    isUnilateral: looksUnilateral(rec.name),
    aliases: [],
    license: LICENSE,
    licenseUrl: LICENSE_URL,
    attribution: ATTRIBUTION,
    externalUrl: `${REPO_URL}/blob/main/exercises/${rec.id}.json`,
  };
}

export const freeExerciseDbAdapter: ExerciseSourceAdapter = {
  source: "free_exercise_db",
  label: "Free Exercise DB",
  async fetchRaw() {
    const res = await fetch(SOURCE_URL);
    if (!res.ok) throw new Error(`Failed to fetch Free Exercise DB dataset: ${res.status} ${res.statusText}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Free Exercise DB dataset was not a JSON array as expected");
    return data;
  },
  normalize,
};

// Deliberately NOT imported: Free Exercise DB's exercise images. The
// dataset's own text/JSON content is confirmed public domain (GitHub's
// license API reports "Unlicense" for the whole repo), but the README
// traces the data's lineage back through another, older community dataset —
// good reason to import the structured text with confidence while NOT
// assuming the images carry the same clean provenance. image_url/video_url
// are left null for every imported row; see docs/DATABASE.md.
