# Architecture

How WorkoutMate is actually built and deployed, in enough detail to work on it without reading every source file. See `CLAUDE.md` for the short version and the rules; see `docs/DATABASE.md`, `docs/AI_COACH.md`, and `docs/DEPLOYMENT.md` for depth on those three areas specifically.

## System overview

```mermaid
flowchart LR
    Browser["Browser<br/>(React 19 client components)"]
    Worker["Cloudflare Worker<br/>(Next.js 16 via OpenNext)"]
    Supabase["Supabase<br/>(Postgres + RLS + Auth)"]
    Claude["Anthropic Claude<br/>(claude-sonnet-5)"]
    Google["Google OAuth"]

    Browser <--> |"Server Actions, RSC, streaming fetch"| Worker
    Worker <--> |"@supabase/ssr, service-role for admin ops"| Supabase
    Worker <--> |"Vercel AI SDK, tool calls"| Claude
    Browser -.-> |"sign-in redirect"| Google
    Google -.-> |"OAuth code"| Supabase
    Supabase -.-> |"session cookie"| Browser
```

`proxy.ts` (Next 16's renamed `middleware.ts`) runs on every request at the Worker edge: it refreshes the Supabase session cookie and redirects unauthenticated requests away from protected routes.

## Authentication flow

1. `/login` → "Continue with Google" → Supabase's hosted OAuth redirect (`<project-ref>.supabase.co/auth/v1/callback`) → Google's consent screen → back to Supabase → back to the app's own `app/auth/callback/route.ts`.
2. That route exchanges the auth code for a session, then checks whether `profiles.onboarding_completed_at` is set: unset → `/onboarding`, set → `/dashboard`.
3. A Postgres trigger (`handle_new_user()`, migration `0002_profiles.sql`) auto-creates the `profiles` row the moment a new `auth.users` row appears — the app never has to.
4. `proxy.ts` gates every route under the authenticated shell; a missing/expired session redirects to `/login`.

## Onboarding flow

10-step wizard (`components/onboarding/`), state held client-side in a Zustand store seeded from `lib/validations/onboarding.ts`'s defaults so most steps are valid without the user touching anything. The final "Generate My Plan" step calls `completeOnboarding()` (`lib/actions/onboarding.ts`), a single Server Action that:

1. Validates the full payload with the same Zod schema client and server share.
2. Writes `profiles`, `fitness_goals`, `training_preferences`, `physical_limitations`.
3. Loads the active exercise pool and runs the deterministic generation engine (see below).
4. Persists the generated plan (`lib/generation/persist.ts`), which builds it as `status: 'draft'` and only flips it to `active` after every row succeeds — a failure midway never leaves a half-written plan live.
5. Redirects to `/dashboard`.

Nothing here is an LLM call. The Zod validation is the same "never save malformed output" boundary used for AI-proposed plan rebuilds too.

## Workout generation flow

`lib/generation/engine.ts` is pure, deterministic, unit-tested logic with no Supabase/network dependency:

1. **Split selection** (`split-templates.ts`) — resolves a template (full body / upper-lower / push-pull-legs / body-part / custom) from days-per-week and the user's stated preference. `body_part` cycles four fixed day templates (Chest & Triceps → Back & Biceps → Shoulders & Abs → Legs) via `pattern[i % 4]`, the same mechanism `push_pull_legs` uses for its own 3-day cycle — so 5/6/7 training days naturally repeat from the top rather than needing special-cased logic. It's a first-class, explicitly-selectable split, never an auto-resolved fallback for `custom` (`autoSplitFor()` only ever resolves `custom` to full_body/upper_lower/push_pull_legs by day count, untouched by this addition).
2. **Schedule** (`schedule.ts`) — assigns training days to the user's preferred weekdays, fills the rest with explicit rest days (every weekday gets a `workout_days` row, `is_rest_day` true or false — there's no implicit "day with no row").
3. **Exercise selection** (`exercise-selection.ts`) — fills each day's slots from the exercise library, filtered by equipment, injuries/avoided exercises, and an experience-level ceiling that widens progressively (beginner → beginner+intermediate → all) only if a slot can't otherwise be filled, rather than jumping straight to "any difficulty."
4. **Prescription** (`prescription.ts`) — sets/reps/rest/intensity guidance from goal + training style + experience.

The AI coach can trigger this same engine (via `change_training_days`, `rebuild_plan`, and `change_split`) but never generates plan structure itself — see `docs/AI_COACH.md`.

## Workout execution / logging flow

1. Dashboard shows a "Start Workout" CTA only for **today's** `workout_days` row (not any arbitrary day — `lib/actions/workout-session.ts#startWorkoutSession(workoutDayId)` will start a session for any day ID given one, but the UI only ever surfaces today's).
2. `/workout/[sessionId]` is a dedicated, chrome-free screen: one exercise at a time, weight/reps inputs per set, a rest timer (persisted as an absolute epoch timestamp in the Zustand store, so it survives a refresh), "Complete set," "Next Exercise," and "Finish Workout" on the last one.
3. Finishing writes the `workout_sessions` row and all `set_logs`, then runs PR detection (`lib/progress/pr-detection.ts`, backed by pure logic in `pr-logic.ts` so it's unit-testable without a DB) against the newly logged sets.
4. Dashboard and `/progress` both re-derive weekly completion, streaks, and PRs from real rows — nothing here is cached or estimated.

## AI Coach request flow

See `docs/AI_COACH.md` for full depth. In short: `app/api/coach/route.ts` authenticates the request, checks the caller against a per-user Cloudflare Rate Limiting binding (`lib/ai/rate-limit.ts` — rejects with `429` before any other work if exceeded), persists the incoming user message, builds a condensed context block (`lib/ai/context.ts` — not a full DB dump), builds the tool set (`lib/ai/tools.ts`), and streams a Claude response via the Vercel AI SDK, persisting the assistant's reply (and any tool calls) when the stream ends.

The authenticated shell (`app/(app)/layout.tsx`) separately fetches `getPendingChangeCount()` (`lib/data/coach.ts`, a `count`-only query on `pending_plan_changes` scoped to `status = 'pending'`) on every page load and threads it into `AppShell` → `Sidebar`/`BottomNav`, so an unresolved proposal stays visible (a nav badge + a "N pending plan changes · Review" link on desktop) even after navigating away from `/coach` or scrolling past its card — the confirmation card itself remains the only way to actually Apply/Cancel.

## A production incident: Cloudflare Error 1102 on `/api/coach`

On 2026-09-20 a real user hit Cloudflare Error 1102 ("Worker exceeded resource limits") while using the AI Coach. Diagnosed from Cloudflare's own Workers Observability telemetry for the exact Ray ID (`a3e38d65bc19ed14`), not guessed: `outcome: "exceededCpu"`, `cpuTimeMs: 10` (this Cloudflare account is on the Workers Free plan, a hard 10ms CPU-time ceiling per invocation), `wallTimeMs: 46`. The low wall time matters — it ruled out `maxDuration = 60` (a Next.js Route Handler wall-clock allowance) as remotely relevant; the Worker was killed by Cloudflare's own CPU accounting almost immediately, likely before the Anthropic stream had even started (network I/O wait doesn't consume CPU time — only synchronous JS execution does).

**Root cause, found by reading the code, not by trial and error:** every `lib/data/*.ts` function the coach path touches (`getActivePlan`, `getWeeklyStats`, `getCurrentStreak`, `getRecentSessions`, `getExerciseHistory`, `getWeightHistory`, `getAllPRs`, `getVolumeInsight`) independently called `requireUser()`, which constructs a **new** Supabase server client and makes a **fresh network round-trip** to re-verify the caller's JWT via `auth.getUser()` — even though `app/api/coach/route.ts` had already authenticated the request once at the top. `buildCoachContext()` alone triggered 3 of these redundant client-construction-plus-reauth cycles on *every single* coach request, before any tool even ran; a conversation involving tool calls could trigger several more. A second, compounding cost: `buildCoachTools()` constructed all 14 tools' Zod `inputSchema`s fresh on every request, rather than once per Worker isolate — real, avoidable CPU spent on JSON-Schema conversion the Anthropic API needs for every tool call, whether or not that tool was ever invoked.

**Fix (both parts, no functionality removed):**
1. Added `*ForUser(supabase, userId, ...)` variants of every affected `lib/data/*.ts` function that take an already-authenticated client instead of self-authenticating. The original self-authenticating exports are unchanged (still used by Server Components/Actions that don't already have a client in scope) — they're now thin wrappers delegating to the `ForUser` variant. `lib/ai/context.ts` and `lib/ai/tools.ts` now call the `ForUser` variants directly with the client `route.ts` already has, eliminating every redundant re-auth on the coach path.
2. Hoisted all 14 tool input schemas in `lib/ai/tools.ts` to module-level constants, built once when the Worker isolate loads, reused across every request it handles — instead of being reconstructed inside `buildCoachTools()` on every call.

Verified live after deploying: two real authenticated `POST /api/coach` requests (one plain conversational, one that triggered `get_current_plan`) both completed with Cloudflare's own telemetry showing `outcome: "ok"`. See `docs/AI_COACH.md` for the rate-limiting design (separate from this fix, added the same session) and `CHANGELOG.md` for the dated entry.

## Exercise library

The shared `exercises` table (~930 rows: ~75 hand-authored `source: 'manual'` plus 850+ imported from Free Exercise DB, `source: 'free_exercise_db'`) is reference data, not user data — public-read, written only by `scripts/seed-exercises.ts` and `scripts/import-exercises.ts` via the service role. `lib/data/exercise-import/` is the ingestion pipeline: a `ExerciseSourceAdapter` (fetch raw records, validate + map onto WorkoutMate's own muscle/equipment/difficulty/movement-type vocabulary, or return a skip reason) feeds a shared fetch → validate → dedupe-by-name → upsert-by-`(source, source_id)` pipeline (`pipeline.ts`) — adding a second source later is one new adapter, not a rewrite of the dedupe/report/upsert logic. Every imported row carries its own `license`/`license_url`/`attribution`/`external_url`; Free Exercise DB's own images were deliberately not imported (see `docs/DATABASE.md` for why). A Postgres full-text index (`search_vector`, trigger-maintained — `to_tsvector(regconfig, text)` isn't IMMUTABLE, so a generated column isn't an option, see the migration) backs both `/exercises`' search box and a broadened fallback in the AI coach's substitute lookup (`getSubstitutesForExercise`).

Every place that loads the exercise pool for *generation* (`lib/generation/engine.ts`'s `generatePlan`, called from onboarding and three AI tools) selects a narrow, explicit column list (`GENERATION_POOL_COLUMNS`/`PoolExercise`, `lib/generation/pool-columns.ts` + `types.ts`) instead of `select("*")` — the generation/selection logic never reads more than id/name/slug/category/muscle/equipment/difficulty/movement_type/is_unilateral, and three of those call sites run inside the same CPU-constrained `/api/coach` request that already caused the 1102 below, now against a library roughly 10x larger than when that incident happened.

## AI tool execution flow

Every tool the model can call falls into one of two categories, enforced by where its `execute` function writes:

- **Read/log tools** query Supabase directly (still RLS-scoped, still Zod-validated inputs) and return data to the model immediately.
- **Plan-editing tools** never touch `workout_plans`/`workout_days`/`workout_exercises`. They call `proposeChange()` (`lib/ai/pending-change.ts`), which only inserts a row into `pending_plan_changes`. The chat UI (`components/coach/confirmation-card.tsx`) renders that row as an Apply/Cancel card. Clicking Apply calls `applyPendingChange()` (`lib/actions/coach.ts`) — a Server Action, not something the model can invoke — which re-validates ownership, switches on `change_type`, and only then writes to the real plan tables.

## Database architecture

Summarized here; full table-by-table detail in `docs/DATABASE.md`. 19 tables, all RLS-scoped to the owning `profile_id` except the shared, public-read exercise library. `profile_id` is denormalized onto child tables (`workout_days`, `workout_exercises`, etc.) via triggers so RLS stays a flat equality check rather than a multi-table join on every row.

## Security boundaries

| Boundary | Enforced by |
|---|---|
| User A can't read/write User B's data | Postgres RLS, scoped to `auth.uid()` — live-tested with two real authenticated accounts across every user-owned table (select/update/delete, both directions), not just inspected (see `docs/DATABASE.md`) |
| Browser never sees `SUPABASE_SERVICE_ROLE_KEY` / `ANTHROPIC_API_KEY` | Both are non-`NEXT_PUBLIC_` env vars, read only in server-only files; the production build fails if one leaks into a client bundle |
| AI can't mutate the plan directly | Plan-editing tools can only insert a `pending_plan_changes` row; `applyPendingChange()` is the sole write path, gated on the user's own click |
| AI tool inputs can't be malformed | Every tool has a Zod `inputSchema`, enforced by the AI SDK before `execute` runs |
| `/api/coach` can't be hammered for unbounded Anthropic spend | Per-user Cloudflare Rate Limiting binding (`COACH_RATE_LIMITER`, 20 req/60s), checked server-side before any model call — see `docs/AI_COACH.md` |
| Secrets don't reach source control | `.gitignore` covers `.env.local`/`.dev.vars`; `.claude/settings.json` also denies the `Read` tool on both as a backstop |

## Deployment architecture

Production is **Cloudflare Workers**, built via the OpenNext adapter — not Vercel, not Cloudflare's beta `vinext`. Full walkthrough, the exact build/deploy commands, and a real Windows-specific bug (and its fix) are in `docs/DEPLOYMENT.md`.

## Data flow summary

```
Browser action → Server Action or Route Handler (runs on the Worker)
  → @supabase/ssr client, scoped to the caller's session → Postgres (RLS enforced)
  → response streamed/returned to the Browser → UI re-renders from real data
```

The AI coach path is the only branch: a chat message additionally goes to Claude (with tool-calling), and any resulting plan edit is staged in `pending_plan_changes` rather than written directly, rejoining the same Server Action write path only once the user confirms.
