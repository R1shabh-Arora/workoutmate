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
- **Git:** Pushed to GitHub at `github.com/R1shabh-Arora/workoutmate` (`main` branch) — check `git remote -v` for current state rather than trusting this line

## Features completed (genuinely working, live-verified)

- Google sign-in, session handling, protected-route gating (`proxy.ts`)
- 10-step onboarding wizard, persists to Supabase, generates and activates a real plan
- Deterministic workout generation engine (split selection, equipment/injury-filtered exercise selection with a progressive difficulty ceiling, goal-based prescription)
- 75-exercise library with instructions, common mistakes, and curated substitutions
- Dashboard: today's workout, weekly completion, streak, AI coach entry point, recent activity
- `/plan`: full week view, exercise swap dialog, move-day (via the `swap_workout_days` RPC)
- Workout execution: per-exercise flow, rest timer, set logging, finish → session + set_logs persisted
- Progress: real weight/volume/frequency data, real PR detection, honest empty states when there isn't enough data yet
- AI coach: streaming chat, condensed context retrieval, 14 tools (8 read/log execute immediately, 6 plan-editing only ever propose), Apply/Cancel confirmation UI that accurately reflects Pending/Applied/Cancelled/Expired on reload, `applyPendingChange()` as the sole write path, per-user server-side rate limiting on `/api/coach`
- Settings: profile, goals, preferences, equipment, units, theme, account deletion (cascades correctly, verified)

## Features partially completed

- **Notifications** — `notifications`/`notification_preferences` tables and settings UI toggles exist; nothing sends a push or email yet (would need a scheduled job, e.g. a Cloudflare Cron Trigger, wired to a provider)

## Known issues

- Cloudflare's Rate Limiting binding is "eventually consistent" and its counters are local to the Cloudflare PoP a request lands on (per Cloudflare's own docs) — not a precise billing-grade quota. Accepted trade-off for zero added latency/infrastructure; see `docs/AI_COACH.md`'s rate limiting section for when a Supabase-backed exact counter would be worth the extra complexity.
- Full production smoke test (Google login → onboarding → workout generation → dashboard → execution → logging → progress → AI Coach conversation/confirm/apply/cancel/reload) has not been re-verified end-to-end since the 2026-09-20 hardening pass specifically — that pass could only verify the unauthenticated surface (landing page, protected-route redirects, `/api/coach` 401, `/opengraph-image`/`/icon`) live; the authenticated flows were last directly verified during the AI Coach production test earlier the same day (see `CHANGELOG.md`) and re-checked at the code level for this pass, but not re-driven live end-to-end afterward. Worth a real pass next time someone is signed in with the real Google account.

## Technical debt

- No dependency/CVE audit has been run on a recurring basis (a one-off `npm audit` came back clean; worth making a habit, not a one-time check).

## Remaining production tasks

None blocking as of the last update to this file — rate limiting, the confirmation-card reload fix, the two-authenticated-account RLS cross-check, and the GitHub push are all done (see `CHANGELOG.md`). The live end-to-end authenticated smoke test noted above is the one item worth doing when convenient, not because anything is known to be broken.

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
