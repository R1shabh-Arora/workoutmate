import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type { ExerciseSourceAdapter, NormalizedExercise } from "./types";

type DbClient = SupabaseClient<Database>;

export interface ImportReport {
  source: string;
  fetched: number;
  imported: number;
  skipped: Array<{ identifier: string; reason: string }>;
  importedByCategory: Record<string, number>;
}

function normalizeNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Runs one source end to end: fetch -> validate/map -> dedupe against
 * whatever's already in the table (any source) -> upsert. Idempotent and
 * safe to re-run: existing rows from this source are matched and updated by
 * (source, source_id), not re-inserted; rows that would duplicate an
 * existing exercise by name (e.g. the manual seed already has "Bench Press")
 * are skipped rather than creating a near-duplicate entry.
 */
export async function runImport(supabase: DbClient, adapter: ExerciseSourceAdapter): Promise<ImportReport> {
  const raw = await adapter.fetchRaw();

  const { data: existing } = await supabase.from("exercises").select("name, source, source_id");
  const existingNames = new Set((existing ?? []).map((e) => normalizeNameKey(e.name)));
  // Rows already imported from this exact source (by source_id) are allowed
  // to update themselves even though their name is, tautologically, already
  // in existingNames — otherwise every re-run after the first would skip
  // everything as "duplicate of existing".
  const ownSourceIds = new Set(
    (existing ?? []).filter((e) => e.source === adapter.source && e.source_id).map((e) => e.source_id as string)
  );

  const skipped: Array<{ identifier: string; reason: string }> = [];
  const toUpsert: NormalizedExercise[] = [];
  const seenInBatch = new Set<string>();

  for (const rawRecord of raw) {
    const result = adapter.normalize(rawRecord);
    if ("reason" in result) {
      skipped.push(result);
      continue;
    }

    const nameKey = normalizeNameKey(result.name);
    if (!ownSourceIds.has(result.sourceId) && existingNames.has(nameKey)) {
      skipped.push({ identifier: result.sourceId, reason: `duplicate of an existing exercise named "${result.name}"` });
      continue;
    }
    if (seenInBatch.has(nameKey)) {
      skipped.push({ identifier: result.sourceId, reason: `duplicate within ${adapter.label} itself: "${result.name}"` });
      continue;
    }

    seenInBatch.add(nameKey);
    existingNames.add(nameKey);
    toUpsert.push(result);
  }

  const importedByCategory: Record<string, number> = {};
  const BATCH_SIZE = 200;
  for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
    const batch = toUpsert.slice(i, i + BATCH_SIZE);
    const rows = batch.map((ex) => ({
      slug: ex.slug,
      name: ex.name,
      description: ex.description,
      category: ex.category,
      primary_muscle: ex.primaryMuscle,
      secondary_muscles: ex.secondaryMuscles,
      equipment: ex.equipment,
      difficulty: ex.difficulty,
      movement_type: ex.movementType,
      instructions: ex.instructions,
      common_mistakes: ex.commonMistakes,
      is_unilateral: ex.isUnilateral,
      is_active: true,
      source: ex.source,
      source_id: ex.sourceId,
      license: ex.license,
      license_url: ex.licenseUrl,
      attribution: ex.attribution,
      external_url: ex.externalUrl,
      aliases: ex.aliases,
      force: ex.force,
    }));

    const { error } = await supabase.from("exercises").upsert(rows, { onConflict: "source,source_id" });
    if (error) {
      throw new Error(`Upsert failed on batch starting at index ${i}: ${error.message}`);
    }
    for (const ex of batch) {
      importedByCategory[ex.category] = (importedByCategory[ex.category] ?? 0) + 1;
    }
  }

  return {
    source: adapter.label,
    fetched: raw.length,
    imported: toUpsert.length,
    skipped,
    importedByCategory,
  };
}

export function printImportReport(report: ImportReport): void {
  console.log(`\n=== ${report.source} ===`);
  console.log(`Fetched:  ${report.fetched}`);
  console.log(`Imported: ${report.imported}`);
  console.log(`Skipped:  ${report.skipped.length}`);
  if (Object.keys(report.importedByCategory).length > 0) {
    console.log("By category:");
    for (const [category, count] of Object.entries(report.importedByCategory).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${category}: ${count}`);
    }
  }
  if (report.skipped.length > 0) {
    const reasonCounts = new Map<string, number>();
    for (const s of report.skipped) {
      const bucket = s.reason.split(":")[0]!.trim();
      reasonCounts.set(bucket, (reasonCounts.get(bucket) ?? 0) + 1);
    }
    console.log("Skip reasons:");
    for (const [reason, count] of Array.from(reasonCounts.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${count}x ${reason}`);
    }
  }
}
