# Project Status

Factual current state. Update this file whenever status actually changes — don't let it go stale, and don't record something here as "done" unless it's been verified, not just built.

## Current status

Core product is built and **live in production**, with the end-to-end journey (Google login → onboarding → generated plan → dashboard → workout execution/logging → progress → AI coach → propose a change → confirm → verify the database and UI both changed) verified against real production infrastructure, not just source-read.

## Production status

- **Live URL:** https://workoutmate.rishabh.uk
- **Hosting:** Cloudflare Workers (Worker name `workoutmate`), via the OpenNext adapter — see `docs/DEPLOYMENT.md`
- **Database:** Supabase project `jrsmrcpyitawbwpxewhe`, all 10 migrations applied, RLS confirmed live (not just from source) on all 19 tables, ~75 exercises seeded
- **AI:** Anthropic Claude (`claude-sonnet-5`), live-tested including tool-calling and the propose/confirm/apply/cancel flow
- **Auth:** Google OAuth reported working in production by the project owner; not independently tested by an AI agent in this environment, since that would require entering real Google credentials
- **Git:** Local repository only as of the last update to this file — check `git remote -v` for current state rather than trusting this line once a remote exists

## Features completed (genuinely working, live-verified)

- Google sign-in, session handling, protected-route gating (`proxy.ts`)
- 10-step onboarding wizard, persists to Supabase, generates and activates a real plan
- Deterministic workout generation engine (split selection, equipment/injury-filtered exercise selection with a progressive difficulty ceiling, goal-based prescription)
- 75-exercise library with instructions, common mistakes, and curated substitutions
- Dashboard: today's workout, weekly completion, streak, AI coach entry point, recent activity
- `/plan`: full week view, exercise swap dialog, move-day (via the `swap_workout_days` RPC)
- Workout execution: per-exercise flow, rest timer, set logging, finish → session + set_logs persisted
- Progress: real weight/volume/frequency data, real PR detection, honest empty states when there isn't enough data yet
- AI coach: streaming chat, condensed context retrieval, 14 tools (8 read/log execute immediately, 6 plan-editing only ever propose), Apply/Cancel confirmation UI, `applyPendingChange()` as the sole write path
- Settings: profile, goals, preferences, equipment, units, theme, account deletion (cascades correctly, verified)

## Features partially completed

- **Notifications** — `notifications`/`notification_preferences` tables and settings UI toggles exist; nothing sends a push or email yet (would need a scheduled job, e.g. a Cloudflare Cron Trigger, wired to a provider)
- **Historical confirmation-card state** — reloading a coach conversation shows Apply/Cancel on already-resolved proposals; clicking Apply again is a safe no-op (server-side status re-check), but the card itself doesn't visually reflect "already applied/cancelled" after a reload

## Known issues

- No rate limiting on `/api/coach` — an authenticated user could send unlimited requests, running up the Anthropic bill. Needs an external store (in-memory limits don't persist across serverless/Workers invocations) — e.g. Upstash Redis via `@upstash/ratelimit`, or a Supabase-backed counter.
- Cross-user RLS isolation has been live-tested for anonymous-vs-owner access (an anonymous write is rejected, an anonymous read returns nothing); it has not yet been tested with two distinct *authenticated* accounts against each other's data.
- No GitHub remote configured as of the last update to this file — verify current state before assuming.

## Technical debt

- No dependency/CVE audit has been run on a recurring basis (a one-off `npm audit` came back clean; worth making a habit, not a one-time check).
- The confirmation-card reload gap noted above is a small, contained UI fix (re-derive card state from the persisted `pending_plan_changes.status` on load) rather than architectural debt.

## Remaining production tasks

- Push the local git history to a GitHub remote (blocked on push credentials in whatever environment is doing the pushing — see `CHANGELOG.md`/session history for specifics, not restated here since it's a one-time operational step, not a standing fact).
- Decide on and implement rate limiting for `/api/coach` before treating this as fully production-hardened.
- Two-authenticated-account RLS cross-check.

## Future roadmap

Split by how committed the idea is — none of this is implemented; don't treat it as a spec.

**Intentionally deferred from v1 (documented, not forgotten):**
- Payments/billing (schema is structured to allow a Free/Pro split and Stripe later; no payment code exists)
- Push/email notification delivery
- A dedicated `create_workout` AI tool (currently: use `change_training_days` with an incremented count)
- Admin panel (no UI; exercises/plans are normal tables an admin surface could be built against)

**Nice-to-have ideas, not committed:**
- Rate limiting / cost controls on the AI coach
- Re-deriving confirmation-card visual state from persisted status on reload
- A second AI provider as a fallback if Anthropic has an outage (not currently planned — would need its own design discussion given the "no mock/fallback AI response" rule in `CLAUDE.md`)
