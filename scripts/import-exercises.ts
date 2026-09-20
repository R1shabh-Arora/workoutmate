/**
 * Imports exercises from external, appropriately-licensed datasets into the
 * shared exercise library, on top of the ~75 hand-authored 'manual' rows
 * seed-exercises.ts manages. Idempotent — safe to re-run; upserts by
 * (source, source_id) and skips anything that would duplicate an existing
 * exercise by name. See lib/data/exercise-import/ and docs/DATABASE.md.
 *
 * Usage:  npx tsx scripts/import-exercises.ts
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * (bypasses RLS to write to the shared, read-only-to-users exercise table).
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/types/database.types";
import { freeExerciseDbAdapter } from "../lib/data/exercise-import/free-exercise-db";
import { runImport, printImportReport } from "../lib/data/exercise-import/pipeline";
import type { ExerciseSourceAdapter } from "../lib/data/exercise-import/types";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Add another source by implementing ExerciseSourceAdapter (see
// lib/data/exercise-import/free-exercise-db.ts for the reference shape) and
// listing it here — the fetch/validate/dedupe/upsert/report pipeline is
// shared and needs no changes.
const ADAPTERS: ExerciseSourceAdapter[] = [freeExerciseDbAdapter];

async function main() {
  for (const adapter of ADAPTERS) {
    console.log(`Importing from ${adapter.label}…`);
    const report = await runImport(supabase, adapter);
    printImportReport(report);
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Import failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
