/**
 * Seeds (or re-syncs) the shared exercise library from lib/data/exercises-seed.ts.
 * Idempotent — safe to re-run; upserts by slug and only adds missing alternatives.
 *
 * Usage:  npm run db:seed
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * (the service role key is required because this bypasses RLS to write to
 * the shared, read-only-to-users exercise tables).
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { EXERCISE_SEED_DATA } from "../lib/data/exercises-seed";
import type { Database } from "../lib/types/database.types";

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

async function main() {
  console.log(`Seeding ${EXERCISE_SEED_DATA.length} exercises…`);

  const rows = EXERCISE_SEED_DATA.map((ex) => ({
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
    is_unilateral: ex.isUnilateral ?? false,
    is_active: true,
  }));

  const { data: upserted, error: upsertError } = await supabase
    .from("exercises")
    .upsert(rows, { onConflict: "slug" })
    .select("id, slug");

  if (upsertError || !upserted) {
    console.error("Failed to upsert exercises:", upsertError?.message);
    process.exit(1);
  }
  console.log(`Upserted ${upserted.length} exercises.`);

  const idBySlug = new Map(upserted.map((row) => [row.slug, row.id]));

  const alternativeRows: Database["public"]["Tables"]["exercise_alternatives"]["Insert"][] = [];
  for (const ex of EXERCISE_SEED_DATA) {
    const fromId = idBySlug.get(ex.slug);
    if (!fromId) continue;
    for (const altSlug of ex.alternatives ?? []) {
      const toId = idBySlug.get(altSlug);
      if (!toId) {
        console.warn(`  ! ${ex.slug} references unknown alternative slug "${altSlug}"`);
        continue;
      }
      // Seed both directions so "swap" suggestions work either way round.
      alternativeRows.push({ exercise_id: fromId, alternative_exercise_id: toId, reason: "equipment" });
      alternativeRows.push({ exercise_id: toId, alternative_exercise_id: fromId, reason: "equipment" });
    }
  }

  const uniqueAlternatives = Array.from(
    new Map(alternativeRows.map((r) => [`${r.exercise_id}:${r.alternative_exercise_id}`, r])).values()
  );

  const { error: altError } = await supabase
    .from("exercise_alternatives")
    .upsert(uniqueAlternatives, { onConflict: "exercise_id,alternative_exercise_id" });

  if (altError) {
    console.error("Failed to upsert exercise alternatives:", altError.message);
    process.exit(1);
  }
  console.log(`Upserted ${uniqueAlternatives.length} exercise alternative links.`);
  console.log("Done.");
}

main();
