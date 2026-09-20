# CLAUDE.md

Standing context and rules for Claude Code (or any future coding agent) working in this repository. Read this before making changes. Deeper technical detail lives in `docs/` — this file stays short enough to read in full.

## Project identity

- **Name:** WorkoutMate — "Your workout. Your goals. Your AI coach."
- **What it is:** An AI-powered personal fitness coaching web app — Google sign-in, guided onboarding, a deterministic workout-generation engine, a distraction-free workout execution/logging UI, real (never fabricated) progress tracking, and an AI coach that can *propose* plan changes but never apply one without explicit user confirmation.
- **Production URL:** https://workoutmate.rishabh.uk
- **Vision:** A premium, fast, mobile-first fitness SaaS that feels like a real shipped product, not a demo — every number on screen is either a fixed rule or a real calculation from the user's own data.

## Core architecture

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript, strict mode |
| UI | React 19, Tailwind CSS v4, hand-rolled shadcn-style components on Radix primitives |
| Database + Auth | Supabase (Postgres, Row Level Security, Google OAuth) |
| AI | Anthropic Claude (`claude-sonnet-5`) via the Vercel AI SDK (`ai` + `@ai-sdk/anthropic` + `@ai-sdk/react`) |
| Hosting | Cloudflare Workers, via the OpenNext adapter (`@opennextjs/cloudflare` + `wrangler`) |
| Charts | Recharts |
| Client state | Zustand (onboarding draft, active workout session only — everything else is server state) |
| Testing | Vitest |

This is the **actual current** stack, not the original plan — see `CHANGELOG.md` for what changed and why (most notably: OpenAI → Anthropic, and Vercel → Cloudflare Workers).

## Project structure

Only directories that actually exist:

```
app/            Next.js App Router. (app)/ is the authenticated shell (sidebar + bottom nav);
                onboarding/ and workout/[sessionId]/ have their own chrome-free layouts;
                api/coach/route.ts is the streaming AI endpoint.
components/     One folder per feature area (app-shell, auth, coach, dashboard, exercises,
                marketing, onboarding, plan, progress, settings, workout) plus ui/ for
                shadcn-style primitives.
lib/            actions/ (Server Actions), ai/ (coach system prompt, context, tools),
                data/ (server-only read queries; data/exercise-import/ is the pluggable
                ingestion pipeline for external exercise datasets), generation/ (the
                deterministic workout engine), progress/ (PR + progression logic,
                pure+tested), stores/ (Zustand), supabase/ (client/server/middleware
                clients), types/ (hand-written DB types + shared enums), validations/
                (Zod schemas).
supabase/migrations/   Numbered SQL migrations — schema, RLS, RPCs. See docs/DATABASE.md.
scripts/        seed-exercises.ts (idempotent hand-authored exercise seed) and
                import-exercises.ts (idempotent external-dataset ingestion — see
                docs/DATABASE.md for what's imported and why).
tests/          Vitest unit tests, mirroring lib/'s structure.
public/         Static assets, PWA manifest, service worker, Cloudflare _headers.
.claude/        settings.json (shared, committed) and launch.json (dev server config,
                committed) — settings.local.json is personal and gitignored.
docs/           Deeper technical docs — architecture, database, AI coach, deployment,
                current project status.
```

## Important application flows

```
Google Login → Supabase Auth → /auth/callback
  → new user  → /onboarding (10 steps) → completeOnboarding() Server Action:
       saves profile + goals + preferences + limitations
       → runs the deterministic generation engine → persists the plan
       → redirects to /dashboard
  → returning user with a completed profile → /dashboard directly

/dashboard → "Start Workout" (today's day only) → /workout/[sessionId]
  → log sets (weight/reps, rest timer) → "Finish Workout"
  → session + set_logs persisted, PR detection runs, streak/weekly stats update
  → back to /dashboard, now reflecting the completed session

/coach → user message → app/api/coach/route.ts → Claude with tool access
  → read tools (get_current_plan, get_progress, ...) execute immediately
  → plan-editing tools (replace_exercise, move_workout, ...) only ever INSERT a
    pending_plan_changes row and return a summary — never write to the plan
  → chat UI renders an Apply/Cancel confirmation card
  → user clicks Apply → applyPendingChange() Server Action → the ONLY code path
    that turns a proposal into a real mutation → /plan and /dashboard update
```

Full detail: `docs/ARCHITECTURE.md`.

## Database

19 tables, all RLS-scoped to `auth.uid() = profile_id` (or `= id` on `profiles`) except `exercises`/`exercise_alternatives`, which are intentionally public-read shared reference data. Full table-by-table explanation, relationships, RPCs, and migration conventions: `docs/DATABASE.md`. Don't copy migration SQL into other docs — reference the filename instead.

## AI architecture

The AI coach never has unrestricted database access. Every tool call goes through Zod-validated inputs; every plan-editing tool inserts a proposal (`pending_plan_changes`) instead of writing directly; `applyPendingChange()` is the only place a proposal becomes a real mutation, and it only runs from the user's own explicit "Apply Change" click. Full detail, the exact tool list, and how to add a new tool safely: `docs/AI_COACH.md`.

## Important business rules

- The AI must never get unrestricted database access, and must never apply a plan change without the user explicitly confirming it through the UI.
- Every generated/proposed exercise must come from the exercise library (`exercises` table) — never an invented name.
- Exercise library content brought in from outside this project must be appropriately licensed, and the license must be verified (e.g. via the source's own repository/license file), never assumed from a dataset's description of itself. Record `source`/`license`/`license_url`/`attribution` on every imported row. Don't import an asset class (e.g. images) just because the surrounding data is cleanly licensed — check each asset type's own provenance. See `docs/DATABASE.md`.
- Workout numbers (sets/reps/rest, progress stats, PRs, streaks) are either deterministic rule output or real calculations from logged data — never fabricated or estimated for display.
- RLS must never be disabled to make something work. If a query fails because of RLS, fix the policy or the query — don't bypass it.
- Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `CLOUDFLARE_API_TOKEN`) stay server-side/deploy-tooling-only, never in a `NEXT_PUBLIC_*` var, never committed. `.claude/settings.json` denies the `Read` tool from opening `.env.local`/`.dev.vars` as a backstop.
- Inspect existing implementation before changing it. Don't rewrite working functionality to make a small change smaller to reason about.
- Don't add fake buttons, placeholder pages, or mock data in a flow that's supposed to be real.

## Development commands

From `package.json` — don't invent commands not listed here:

```bash
npm run dev          # start the Next.js dev server
npm run build         # production build (also runs TypeScript's own check)
npm run start          # run the production build
npm run lint            # ESLint
npm run typecheck        # tsc --noEmit
npm run test               # Vitest, once
npm run test:watch          # Vitest, watch mode
npm run db:seed              # seed/re-sync the exercise library (idempotent)
npm run cf:preview            # build for Workers, preview locally via wrangler
npm run cf:deploy              # build for Workers and deploy
npm run cf:typegen              # regenerate cloudflare-env.d.ts from wrangler.jsonc bindings
```

Migrations have no npm script — apply with `npx supabase db push` (needs `supabase link` first) or by pasting each file into the Supabase SQL Editor in filename order. See `docs/DATABASE.md`.

## Testing requirements

Run `typecheck`, `lint`, `test`, and `build` after any meaningful change — all four should be clean before calling something done, not just "it compiles." The critical end-to-end flow (Google login → onboarding → generated plan → dashboard → today's workout → log → complete → progress → AI coach → propose a change → confirm → verify the DB and UI both changed) should be sanity-checked in a real browser for anything that touches auth, the generation engine, workout execution, or the AI coach's write path — type-checking and unit tests don't catch a feature that's wired up wrong end-to-end.

## Deployment

Production runs on **Cloudflare Workers**, not Vercel (the stack table above is current, not aspirational). Worker name `workoutmate`, custom domain `workoutmate.rishabh.uk` attached via Cloudflare's Workers Custom Domains (not a manual CNAME). Built with `@opennextjs/cloudflare` (OpenNext), not Cloudflare's beta `vinext` — OpenNext runs Next's actual build output rather than reimplementing it, which matters given this app leans on Server Actions, streaming AI responses, and several Route Handlers.

Required environment variables (names only — real values live in `.env.local`, gitignored, or as `wrangler secret`s, never in a doc):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` — public, inlined at build time
- `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, optionally `ANTHROPIC_MODEL` — server-only, set via `wrangler secret put`
- `CLOUDFLARE_API_TOKEN` — deploy-tooling only, read by `wrangler`/`opennextjs-cloudflare` on the deploying machine, never by the app

Full walkthrough, including a real Windows-specific build/deploy gotcha and its fix: `docs/DEPLOYMENT.md`.

## Security

- Server-only secrets never reach a `NEXT_PUBLIC_*` var or a Client Component; the production build fails if that boundary is crossed (Next hard-blocks `next/headers` etc. from client bundles).
- RLS is the real enforcement boundary for cross-user data isolation — live-tested (not just inspected): an anonymous write against a user-scoped table is rejected with a genuine Postgres RLS policy violation, an anonymous read of a user-scoped table returns an empty result rather than an error or someone else's row, and two real authenticated accounts have been cross-checked against every user-owned table with the same result (see `docs/DATABASE.md`).
- The AI coach's plan-editing tools cannot write to the plan; only `applyPendingChange()`, triggered solely by the user's own confirmation click, can.
- `/api/coach` is rate-limited server-side, per authenticated user (Cloudflare Rate Limiting binding — see `docs/AI_COACH.md`), so it can't be hammered for unbounded Anthropic spend by one account.
- `.claude/settings.json` (committed) asks for confirmation before `git push --force`, `git reset --hard`, or a `DROP TABLE`/`DROP SCHEMA` pattern, and denies the `Read` tool on `.env.local`/`.dev.vars`. This is a backstop, not a substitute for judgment — treat any request to weaken RLS, force-push, or drop production data as something to stop and confirm regardless of what the permission layer allows.

## Git attribution

Commits in this repository must **not** include `Co-Authored-By: Claude` or any other Claude/Anthropic attribution line — this is configured via `.claude/settings.local.json` (`attribution: { commit: "", pr: "" }`), the current Claude Code mechanism for this. The three earliest commits originally carried that trailer before this was configured; history was later rewritten (`git commit-tree`, preserving every author/date/tree/message exactly except removing the trailer, then `push --force-with-lease`) specifically to remove it, since this is a solo repository the owner controls. Keep using the repository's own configured git author identity for everything new, and don't rewrite history again without the same explicit, deliberate request and safeguards.

## Keeping this file honest

When you change architecture, deployment, the database, the AI coach's tools, or a business rule listed above, update this file and the relevant `docs/*.md` in the same change — don't let them drift from what's actually deployed. `docs/PROJECT_STATUS.md` is the place for anything that's in-progress, partially done, or still on the roadmap; keep speculative/future work out of this file and out of the architecture docs.
