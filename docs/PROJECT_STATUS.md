# Project Status

Factual current state. Update this file whenever status actually changes — don't let it go stale, and don't record something here as "done" unless it's been verified, not just built.

## Current status

Core product is built and **live in production**, with the end-to-end journey (Google login → onboarding → generated plan → dashboard → workout execution/logging → progress → AI coach → propose a change → confirm → verify the database and UI both changed) verified against real production infrastructure, not just source-read.

## Production status

- **Live URL:** https://workoutmate.rishabh.uk — **not yet updated with this pass's code** (see "Deploy gap" below); the live site is still running the previous deploy (`body_part` split, `change_split` tool, the Cloudflare 1102 fix — all confirmed live as of the prior pass).
- **Hosting:** Cloudflare Workers (Worker name `workoutmate`), via the OpenNext adapter — see `docs/DEPLOYMENT.md`
- **Database:** Supabase project `jrsmrcpyitawbwpxewhe`, all 12 migrations applied (`0012_exercise_library_expansion.sql` applied and verified this pass), RLS confirmed live on all 19 tables as of the prior pass, **~930 exercises** (75 hand-authored + ~853 imported from Free Exercise DB — see `docs/DATABASE.md`)
- **AI:** Anthropic Claude (`claude-sonnet-5`); the propose/confirm/apply/cancel flow and tool-calling were live-tested as of the prior pass. This pass's new/changed AI-adjacent code (schema narrowing for the exercise pool, the broadened substitute search) was verified at the code/type/test level and via direct database checks, **not** against a live `/api/coach` request — see "Deploy gap" below.
- **Auth:** Google OAuth reported working in production by the project owner; not independently tested by an AI agent in this environment, since that would require entering real Google credentials
- **Git:** Pushed to GitHub at `github.com/R1shabh-Arora/workoutmate` (`main` branch) — check `git remote -v` for current state rather than trusting this line

### Deploy gap (this pass)

This pass's code changes were **not deployed** to Cloudflare. This session's environment was missing both `.env.local` (confirmed genuinely absent, not merely permission-denied — `dotenv` reports 0 keys injected, and the same failure reproduces on the pre-existing, previously-working `db:seed` script, so it isn't specific to anything new) and Cloudflare/wrangler authentication (`wrangler whoami` reports not authenticated; `CLOUDFLARE_API_TOKEN` is unset). Deploying without the real `NEXT_PUBLIC_*` values baked in would ship a build where the browser Supabase client can't be constructed — worse than not deploying — so `cf:deploy` was deliberately not run.

What *was* still possible and was done: all schema/data work went through the Supabase CLI, which has its own separate, already-authenticated session (unaffected by the missing `.env.local`) — the migration was applied and verified live, and the exercise import actually ran against the real production database (via generated SQL applied through `supabase db query`, since the importer's normal path needs the service-role key). `typecheck`/`lint`/`test`/`build` all ran and passed locally. What was **not** possible: deploying the Worker, or any live-authenticated `/api/coach` request test (the server-to-server technique documented in `docs/AI_COACH.md` also needs `.env.local`'s Supabase URL/anon key to mint a session).

**To finish this pass:** restore `.env.local` (or provide `CLOUDFLARE_API_TOKEN`) in this environment and ask for the deploy + live verification to be completed, or run `npm run cf:deploy` from a machine that has them. The code itself passed every check that doesn't require those credentials.

## Features completed this pass (verified at code/DB level; not yet live-deployed — see "Deploy gap" above)

- **Exercise library expansion**: ~930 exercises (was ~75), via a reusable, idempotent ingestion pipeline (`scripts/import-exercises.ts`, `lib/data/exercise-import/`) that imported Free Exercise DB's public-domain text data while deliberately excluding its images (see `docs/DATABASE.md`). `/exercises` is now server-side paginated and searchable/filterable (query, muscle, equipment, difficulty, category, movement type) instead of loading the whole table client-side. The AI coach's `replace_exercise` substitute search was broadened to use the same full-text index. All verified directly against the production database (import ran for real, row counts and sample data checked, full-text search queries checked) — not yet exercised through a live `/api/coach` request or the deployed `/exercises` page.
- **Persistent pending-change indicator**: a nav badge + "N pending plan changes · Review" link (sidebar on desktop, badge on mobile) driven by `getPendingChangeCount()`, so a proposal stays discoverable without scrolling back through the conversation. Code-complete, unit-testable pieces pass; not yet clicked through in a live browser session.
- CPU-consciousness follow-through on the exercise pool: every generation-pool query now selects a narrow, explicit column list instead of `select("*")` (`lib/generation/pool-columns.ts`), since the same `/api/coach`-path queries that once caused the Cloudflare 1102 now run against a ~10x larger table.

## Features completed (genuinely working, live-verified)

- Google sign-in, session handling, protected-route gating (`proxy.ts`)
- 10-step onboarding wizard, persists to Supabase, generates and activates a real plan
- Deterministic workout generation engine (split selection, equipment/injury-filtered exercise selection with a progressive difficulty ceiling, goal-based prescription)
- 75-exercise library with instructions, common mistakes, and curated substitutions
- Dashboard: today's workout, weekly completion, streak, AI coach entry point, recent activity
- `/plan`: full week view, exercise swap dialog, move-day (via the `swap_workout_days` RPC)
- Workout execution: per-exercise flow, rest timer, set logging, finish → session + set_logs persisted
- Progress: real weight/volume/frequency data, real PR detection, honest empty states when there isn't enough data yet
- AI coach: streaming chat, condensed context retrieval, 15 tools (8 read/log execute immediately, 7 plan-editing only ever propose), Apply/Cancel/Failed confirmation UI that accurately reflects Pending/Applied/Cancelled/Expired on reload, `applyPendingChange()` as the sole write path, per-user server-side rate limiting on `/api/coach`
- Fifth split option, `body_part` (Chest & Triceps → Back & Biceps → Shoulders & Abs → Legs, cycling for 5–7 training days), selectable in onboarding and settings, generated by the same deterministic engine as every other split; the AI coach can switch a user onto it (or any other split) via a dedicated `change_split` tool, live-verified to correctly propose rather than silently apply
- Settings: profile, goals, preferences, equipment, units, theme, account deletion (cascades correctly, verified)

## Features partially completed

- **Notifications** — `notifications`/`notification_preferences` tables and settings UI toggles exist; nothing sends a push or email yet (would need a scheduled job, e.g. a Cloudflare Cron Trigger, wired to a provider)

## Known issues

- Cloudflare's Rate Limiting binding is "eventually consistent" and its counters are local to the Cloudflare PoP a request lands on (per Cloudflare's own docs) — not a precise billing-grade quota. Accepted trade-off for zero added latency/infrastructure; see `docs/AI_COACH.md`'s rate limiting section for when a Supabase-backed exact counter would be worth the extra complexity.
- The golden path (Google login → onboarding → workout generation → dashboard → workout execution/logging → progress) has not been re-driven through an actual browser since the 2026-09-20 bug-fix pass — this environment can authenticate server-to-server (used to verify the AI coach's actual behavior and the Cloudflare CPU fix live, both against production) but can't drive a full interactive browser session for a disposable test account, by design (a platform safeguard against materializing a live session into a browser). Worth a real click-through pass next time someone is signed in with the real Google account; nothing here is known to be broken, this is a verification gap, not a bug report.

## Technical debt

- No dependency/CVE audit has been run on a recurring basis (a one-off `npm audit` came back clean; worth making a habit, not a one-time check).

## Remaining production tasks

**Blocking:** deploy this pass's changes (exercise library expansion, `/exercises` rewrite, pending-change nav indicator, pool-query narrowing) and live-verify them — see "Deploy gap" above for exactly what's missing and how to unblock it. Nothing found broken; this is an environment/credentials gap, not a known defect.

Everything from the prior pass — rate limiting, the confirmation-card reload fix, the two-authenticated-account RLS cross-check, the GitHub push, the Cloudflare 1102 CPU fix, and the `body_part` split — is still done and live-verified (see `CHANGELOG.md`). The full interactive-browser golden-path pass noted below is the one longstanding item worth doing when convenient.

## Future roadmap

Split by how committed the idea is — none of this is implemented; don't treat it as a spec.

**Intentionally deferred from v1 (documented, not forgotten):**
- Payments/billing (schema is structured to allow a Free/Pro split and Stripe later; no payment code exists)
- Push/email notification delivery
- A dedicated `create_workout` AI tool (currently: use `change_training_days` with an incremented count)
- Admin panel (no UI; exercises/plans are normal tables an admin surface could be built against)

**Nice-to-have ideas, not committed:**
- An exact, billing-grade rate-limit counter (Supabase-backed) if Cloudflare's eventually-consistent binding ever proves too loose in practice
- A second AI provider as a fallback if Anthropic has an outage (not currently planned — would need its own design discussion given the "no mock/fallback AI response" rule in `CLAUDE.md`)
