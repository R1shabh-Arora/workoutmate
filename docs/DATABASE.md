# Database

Supabase (Postgres). 10 numbered migrations, 19 tables, RLS everywhere. This document explains what each table is *for* and how they relate — the migration files themselves (`supabase/migrations/*.sql`) are the source of truth for exact columns/constraints; don't let this doc's prose drift from them without updating both.

## Migrations

| File | Adds |
|---|---|
| `0001_extensions_and_helpers.sql` | Extensions, `set_updated_at()` trigger helper |
| `0002_profiles.sql` | `profiles`, `fitness_goals`, `training_preferences`, `physical_limitations`, `handle_new_user()` (auto-provisions a `profiles` row on signup) |
| `0003_exercises.sql` | `exercises`, `exercise_alternatives` — public-read |
| `0004_workout_plans.sql` | `workout_plans`, `workout_days`, `workout_exercises` — the generated-plan structure |
| `0005_workout_sessions.sql` | `workout_sessions`, `set_logs` — what actually happened |
| `0006_progress.sql` | `body_measurements`, `personal_records` |
| `0007_coach.sql` | `coach_conversations`, `coach_messages`, `pending_plan_changes` — the AI coach and its confirmation queue |
| `0008_notifications.sql` | `notifications`, `notification_preferences` |
| `0009_analytics.sql` | `analytics_events` — insert-only |
| `0010_functions.sql` | `swap_workout_days()` RPC |

**Apply in order, always.** There's no "just run the latest one" shortcut — later migrations assume earlier tables/columns exist. `0007_coach.sql` in particular is easy to forget if you're bringing up a project incrementally, since it was added after the first batch, but `/coach` doesn't work at all without it.

## Migration workflow

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Or paste each file into the Supabase dashboard's SQL Editor, in filename order, one at a time. New migrations: add a new numbered file, never edit one that's already been applied to any real database (editing an unapplied-anywhere migration during initial development is fine; once it's live anywhere, add a new migration instead).

## Tables, grouped by what they represent

**Identity / profile** — `profiles` (one row per user, auto-created by trigger), `fitness_goals` (many-to-one, one flagged `is_primary`), `training_preferences` (one row, equipment/split/location/etc.), `physical_limitations` (one row, injuries/limitations/exercises to avoid — informational only, never used to diagnose).

**Shared exercise library** — `exercises` (~75 seeded rows, `is_active` public-read), `exercise_alternatives` (a substitution graph between exercises, also public-read). Neither is user-scoped; both are reference data.

**The generated plan** — `workout_plans` (one `active` plan per user, enforced by a partial unique index on `profile_id where status = 'active'`), `workout_days` (one row per weekday per plan, including rest days — `is_rest_day` is explicit, there's no implicit "no row = rest"), `workout_exercises` (the prescribed sets/reps/rest per exercise per day). `profile_id` is denormalized onto `workout_days` and `workout_exercises` via `before insert` triggers, so RLS on child tables stays a flat `auth.uid() = profile_id` check instead of a join up through `workout_plans`.

**What actually happened** — `workout_sessions` (one per started/completed/skipped workout), `set_logs` (one row per completed set: weight, reps, RPE).

**Progress** — `body_measurements` (user-logged body weight over time), `personal_records` (one row per detected PR — max weight, max reps, est. 1RM, max session volume, longest workout, longest streak).

**AI coach** — `coach_conversations`, `coach_messages` (role, content, and any `tool_calls` as JSON), `pending_plan_changes` (the confirmation queue — `change_type`, `summary`, `payload` JSON, `status`: `pending`/`applied`/`cancelled`/`expired`).

**Notifications** — `notifications`, `notification_preferences`. Tables and settings UI exist; nothing currently sends a push or email (see `docs/PROJECT_STATUS.md`).

**Analytics** — `analytics_events`, insert-only (no `select` policy — the app writes events but never reads them back).

## Relationships worth knowing

- `profiles.id` = `auth.users.id` (1:1, same UUID) — not a separate identity table.
- `workout_plans` → `workout_days` → `workout_exercises` → `exercises` (a workout_exercise always references a real library exercise; there's no "custom/inline" exercise).
- `workout_sessions` → `set_logs` → `exercises` (a set log references the exercise performed, independent of whether it's still in the current plan — history survives a plan swap).
- `coach_conversations` → `coach_messages`, and optionally → `pending_plan_changes` (a proposal can be tied to the conversation that created it).

## RLS strategy

Every user-owned table: `for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id)` (or `= id` on `profiles` itself, with `select`/`update` split there specifically). Two intentional exceptions, both public-read reference data with no user information: `exercises` (`is_active = true`) and `exercise_alternatives` (`using (true)`). `analytics_events` is insert-only — `with check (auth.uid() = profile_id)`, no `select` policy at all.

**Never disable RLS to fix an application error.** If a query fails, the fix is either the policy (if it's genuinely too strict) or the query (if it's not scoping correctly) — not turning RLS off. This has been live-tested against production twice, not just read from the migration source:

- **Anonymous vs. owner:** an anonymous write to a user-scoped table is rejected with a real `42501` Postgres error, and an anonymous read of one returns an empty result rather than leaking a row.
- **Two real authenticated users cross-checking each other:** two throwaway accounts, each with its own real row in every user-owned table (`profiles`, `fitness_goals`, `training_preferences`, `workout_plans`, `workout_sessions`, `set_logs`, `body_measurements`, `personal_records`, `coach_conversations`, `coach_messages`, `pending_plan_changes`), attempted `select`/`update`/`delete` against the other's rows by id, using each account's own authenticated (anon-key) client — never the service-role key. Every cross-user attempt returned zero rows and left the target row unchanged, in both directions, across all 11 tables. Both test accounts were deleted afterward (cascades, verified empty).

## RPCs / functions

- `set_updated_at()` — generic `before update` trigger, bumps `updated_at`.
- `handle_new_user()` — `after insert on auth.users`, creates the matching `profiles` row.
- `workout_days_set_profile_id()`, `workout_exercises_set_profile_id()`, `set_logs_set_profile_id()`, `coach_messages_set_profile_id()` — `before insert` triggers that denormalize `profile_id` from the parent row.
- `handle_new_profile_defaults()` — seeds default `notification_preferences` for a new profile.
- **`swap_workout_days(day_id_a uuid, day_id_b uuid)`** — the one RPC the app calls directly (from "My Plan"'s move-day UI and the AI coach's `move_workout` tool). Swaps which weekday two `workout_days` rows fall on. Runs `security invoker` (RLS still applies) and additionally checks `auth.uid()` ownership of both rows explicitly before writing, then defers the `workout_days_plan_dow_unique` constraint for the duration of the swap (both rows are transiently non-unique on `(plan_id, day_of_week)` until both updates land). Granted to `authenticated` only.

## Seed data

`scripts/seed-exercises.ts` (run via `npm run db:seed`) upserts ~75 hand-authored exercises across chest/back/shoulders/arms/legs/core/full-body/cardio, plus their substitution links in `exercise_alternatives`. Idempotent — safe to re-run; it upserts by exercise name, not insert-only.

## Database testing

No live-database tests run in CI/Vitest by design — `tests/` covers pure logic (generation engine, exercise selection, prescription math, progression/PR detection, validation schemas) with no Supabase dependency, specifically so tests don't need a live project to run. Verifying schema/RLS/RPC behavior against a real database is a manual, live-project activity: `npx supabase migration list` confirms what's applied, and a direct query (`npx supabase db query --linked "..."`) is the most reliable way to check table existence, RLS flags (`pg_class.relrowsecurity`), policy counts (`pg_policies`), and constraint definitions (`pg_constraint`) against what's actually deployed, rather than trusting the migration source alone.
