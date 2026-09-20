-- WorkoutMate — expands the exercise library schema to support a much larger,
-- multi-source catalogue (see scripts/import-exercises.ts and docs/DATABASE.md).
--
-- New columns:
--   source, source_id  — provenance + idempotent-upsert key for an ingestion
--                        pipeline. 'manual' (source_id null) is the original
--                        hand-authored ~75. A unique index on (source,
--                        source_id) makes re-running an importer safe.
--   license, license_url, attribution, external_url — per-row licensing
--                        metadata, since imported sources are not all
--                        licensed identically (see docs/DATABASE.md). Null
--                        for 'manual' rows, which are original content.
--   aliases             — alternate names, feeds full-text search.
--   force               — push / pull / static, a genuinely new training
--                        axis not already captured by movement_type
--                        (compound/isolation/cardio/mobility). Nullable —
--                        not every exercise has a clear push/pull direction.
--   search_vector        — generated tsvector over name/aliases/primary
--                        muscle/category, GIN-indexed, for fast search.
--
-- Deliberately NOT added: a separate "mechanic" column — it would duplicate
-- movement_type's compound/isolation values for no benefit (see the note in
-- scripts/import-exercises.ts on how an imported source's mechanic field is
-- mapped onto the existing column instead).

alter table public.exercises
  add column source text not null default 'manual',
  add column source_id text,
  add column license text,
  add column license_url text,
  add column attribution text,
  add column external_url text,
  add column aliases text[] not null default '{}',
  add column force text;

alter table public.exercises
  add constraint exercises_source_check check (source in ('manual', 'free_exercise_db'));

alter table public.exercises
  add constraint exercises_force_check check (force is null or force in ('push', 'pull', 'static'));

-- Idempotent-upsert key for the ingestion pipeline: scripts/import-exercises.ts
-- upserts with onConflict: "source,source_id". Not partial — standard SQL
-- NULL-distinctness already means the ~75 'manual' rows (source_id null)
-- never collide with each other, and a plain (non-partial) unique index is
-- required for Postgres to accept a plain ON CONFLICT (source, source_id)
-- target (a partial index needs the conflict clause to repeat its predicate,
-- which the Supabase JS client's upsert() has no way to express).
create unique index exercises_source_source_id_key
  on public.exercises (source, source_id);

-- movement_type had no index despite being a common generation-engine filter
-- (matchesSlot() checks it on every candidate) — added now while touching
-- this table, ahead of the catalogue growing ~10x.
create index exercises_movement_type_idx on public.exercises (movement_type) where is_active;

-- Full-text search backing the /exercises page's search box and the AI
-- coach's substitute lookup (getSubstitutesForExercise's broadened fallback).
-- Postgres won't allow to_tsvector(regconfig, text) in a generated-column
-- expression (it's STABLE, not IMMUTABLE — SQLSTATE 42P17), so this is
-- maintained by a trigger instead, the standard Postgres pattern for a
-- weighted, multi-column search vector. GIN-indexed so search stays fast at
-- catalogue scale without a per-request CPU cost.
alter table public.exercises add column search_vector tsvector;

create function public.exercises_set_search_vector()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('english', array_to_string(new.aliases, ' ')), 'B') ||
    setweight(to_tsvector('english', replace(coalesce(new.primary_muscle, ''), '_', ' ')), 'C') ||
    setweight(to_tsvector('english', replace(coalesce(new.category, ''), '_', ' ')), 'C');
  return new;
end;
$$;

create trigger exercises_set_search_vector
  before insert or update on public.exercises
  for each row execute function public.exercises_set_search_vector();

-- Backfill existing rows (the trigger only fires on future writes). This
-- also bumps updated_at via the pre-existing set_updated_at() trigger, which
-- is a harmless side effect of a one-time backfill.
update public.exercises set search_vector =
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', array_to_string(aliases, ' ')), 'B') ||
  setweight(to_tsvector('english', replace(coalesce(primary_muscle, ''), '_', ' ')), 'C') ||
  setweight(to_tsvector('english', replace(coalesce(category, ''), '_', ' ')), 'C');

create index exercises_search_vector_idx on public.exercises using gin (search_vector);
