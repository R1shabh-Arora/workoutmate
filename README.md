# WorkoutMate

**Your workout. Your goals. Your AI coach.**

A production-ready AI fitness coaching platform: Google sign-in, a guided onboarding flow, a rules-based workout generation engine, a full workout-execution UI with rest timers, progress tracking with real calculated insights, and an AI coach with a controlled tool-calling architecture that never mutates your plan without an explicit confirmation.

Live: **https://workoutmate.rishabh.uk**

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript, strict mode |
| UI | React 19, Tailwind CSS v4, hand-rolled shadcn-style components (Radix primitives) |
| Auth + DB | Supabase (Postgres, Row Level Security, Google OAuth) |
| AI | Anthropic Claude via the Vercel AI SDK (`ai` + `@ai-sdk/anthropic` + `@ai-sdk/react`), tool-calling |
| Charts | Recharts, with a colorblind-safe validated palette |
| State | Zustand (client-only UI state: onboarding draft, active workout session) |
| Testing | Vitest |
| Hosting | Cloudflare Workers, via the [OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare` + `wrangler`) |
| Package manager | npm (`package-lock.json` is the lockfile of record — don't mix in pnpm/yarn) |

## Architecture at a glance

```
app/
  (marketing)          landing page — app/page.tsx
  login/                Google sign-in
  auth/callback/         OAuth code exchange → onboarding or dashboard
  onboarding/            10-step guided profile wizard (own layout, no nav chrome)
  (app)/                 the authenticated app shell (sidebar + bottom nav)
    dashboard/  plan/  progress/  coach/  exercises/  profile/  settings/
  workout/[sessionId]/   full-screen workout execution (own layout)
  api/coach/route.ts     streaming AI coach endpoint

lib/
  supabase/             browser / server / middleware / service-role clients
  types/                hand-written Database types + shared enums
  data/                 server-only read queries (RLS-scoped)
  actions/              "use server" mutations, called from client components
  generation/           the structured workout generation engine (no LLM involved)
  progress/             PR detection + progression-recommendation logic (pure + tested)
  ai/                    AI coach: system prompt, context builder, tool definitions
  stores/                Zustand stores (onboarding draft, active workout session)

supabase/migrations/     numbered SQL migrations — schema, RLS, one Postgres function
scripts/seed-exercises.ts  seeds the shared exercise library (idempotent)
tests/                   Vitest unit tests for the generation engine, substitutions,
                          progression/PR logic, and validation schemas
proxy.ts                 Next 16's middleware — session refresh + protected-route gating
```

### Why the workout generator isn't an LLM prompt

`lib/generation/engine.ts` is a deterministic system: it resolves a split template (full body / upper-lower / push-pull-legs) from the user's days-per-week and preferences, fills each day's exercise slots from the exercise library (filtered by equipment, experience ceiling, injuries/dislikes), and prescribes sets/reps/rest from goal + training style + experience. It's covered by `tests/generation/`. The AI coach can *propose* changes to this structure through tools, but the actual numbers always come from this engine, not from free-form model output.

### AI coach safety model

The model never writes to the database directly. Its tools fall into two kinds:

- **Read / log tools** (`get_user_profile`, `get_current_plan`, `get_today_workout`, `get_workout_history`, `get_exercise_history`, `get_progress`, `recommend_progression`, `log_workout`) execute immediately — they're read-only or purely additive.
- **Plan-editing tools** (`replace_exercise`, `update_workout`, `move_workout`, `adjust_workout_duration`, `change_training_days`, `rebuild_plan`) only ever **insert a row into `pending_plan_changes`** describing the proposed change. The chat UI renders that as a confirmation card with *Apply Change* / *Cancel*. Only clicking **Apply Change** — a direct server action, never something the model can trigger on its own — commits the change (`lib/actions/coach.ts#applyPendingChange`).

This means the model can't silently rewrite your programme, and it can't claim to have made a change that didn't happen — the UI only shows "Applied" after the server confirms the write. Every tool's input is a Zod schema (via the AI SDK's `tool({ inputSchema })`); the model cannot call a tool with malformed arguments.

### Security model, briefly

- Every user-owned table is Row-Level-Security-scoped to `auth.uid() = profile_id` (or `= id` for `profiles`) — see [Supabase setup](#supabase-setup) for how to verify this on a live project.
- The only non-scoped `select` policies are `exercises` (public read, `is_active = true`) and `exercise_alternatives` (public read) — both are shared reference data with no user information.
- `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) is read only in `lib/supabase/server.ts#createServiceRoleClient`, which is never imported from a Client Component — Next.js's `next/headers` boundary would fail the build if it were.
- `ANTHROPIC_API_KEY` is read only by the AI SDK's Anthropic provider inside `app/api/coach/route.ts`, a server-only Route Handler. It is never sent to the browser.
- The `swap_workout_days` RPC (used by both "My Plan" and the `move_workout` AI tool) runs `security invoker` — RLS still applies — and additionally checks `auth.uid()` ownership of both rows explicitly before writing.

---

## Local development

### 1. Prerequisites

- Node.js 20+
- npm (ships with Node)
- A [Supabase](https://supabase.com) account
- A [Google Cloud](https://console.cloud.google.com) account (for the OAuth client)
- An [Anthropic](https://console.anthropic.com) account

### 2. Clone and install dependencies

```bash
npm install
cp .env.example .env.local
```

### 3. Environment variables

All variables live in `.env.local` for local dev (gitignored — never commit it) and in the Vercel project's environment variable settings for production. `.env.example` documents every one of them with placeholder values only.

| Variable | Exposure | Required | Where it comes from |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Public** (bundled into client JS) | Yes | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Public** — safe to expose; every query it makes is still enforced by RLS | Yes | Supabase → Project Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only secret** — bypasses RLS entirely | Yes | Supabase → Project Settings → API → service_role key |
| `ANTHROPIC_API_KEY` | **Server-only secret** | Yes | console.anthropic.com/settings/keys |
| `ANTHROPIC_MODEL` | Server-only, optional | No (defaults to `claude-sonnet-5`) | Any current Claude model ID your account can access |
| `NEXT_PUBLIC_SITE_URL` | **Public** | Yes | `http://localhost:3000` locally, `https://workoutmate.rishabh.uk` in production |

"Public" here means `NEXT_PUBLIC_*` — Next.js inlines these into the client bundle at build time. They are safe to expose specifically because every Supabase call made with the anon key is still subject to Row Level Security; they are not a substitute for auth. Google's OAuth Client ID/Secret are **not** app environment variables at all — they're pasted directly into the Supabase dashboard (see [Google OAuth setup](#google-oauth-setup)).

### 4. Supabase setup

1. Create a project at [supabase.com](https://supabase.com/dashboard) (pick a region close to your users — this becomes part of your project's fixed URL).
2. **Project Settings → API**: copy the **Project URL**, **anon public key**, and **service_role key** into `.env.local`.
3. **Run the migrations, in order.** Every file in `supabase/migrations/` is numbered and must be applied `0001` → `0010` sequentially — never skip ahead or apply out of order, since later migrations assume earlier ones' tables/columns exist. There is no separate "just run the latest one" shortcut; a fresh project has none of this schema until all ten run, **including `0007_coach.sql`** (AI coach conversations, messages, and the `pending_plan_changes` confirmation queue — easy to forget since it was added after the first migrations, but required for `/coach` to work at all).

   **Option A — Supabase CLI (recommended):**
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   **Option B — SQL Editor in the dashboard:** open each file in `supabase/migrations/` in filename order and paste/run its contents in **SQL Editor → New query**, one file at a time, waiting for each to succeed before the next.

4. Seed the exercise library:
   ```bash
   npm run db:seed
   ```
   This upserts ~75 exercises and their curated substitution links using the service-role key (bypasses RLS on purpose, since it's system reference data, not user data). Safe to re-run — it's an upsert, not an insert.

5. **Verify the schema landed correctly** before moving on (Table Editor, or SQL Editor for the queries below):
   - **Tables**: 19 tables under `public` — `profiles`, `fitness_goals`, `training_preferences`, `physical_limitations`, `exercises`, `exercise_alternatives`, `workout_plans`, `workout_days`, `workout_exercises`, `workout_sessions`, `set_logs`, `body_measurements`, `personal_records`, `coach_conversations`, `coach_messages`, `pending_plan_changes`, `notifications`, `notification_preferences`, `analytics_events`.
   - **RLS**: Table Editor shows a padlock/"RLS enabled" badge on every one of the 19 tables above — if any shows "RLS disabled," the app will still appear to work for you as the table owner but will leak data cross-user. Never disable RLS to "fix" a permissions error — fix the policy or the query instead.
   - **RPC**: `select proname from pg_proc where proname = 'swap_workout_days';` should return one row. This powers both "move a workout day" in `/plan` and the AI coach's `move_workout` tool.
   - **Exercise data**: `select count(*) from exercises;` should return ~75 after seeding.
   - **Auto-provisioning**: `select tgname from pg_trigger where tgname = 'on_auth_user_created';` should return one row — this is what creates a `profiles` row automatically the moment someone signs in with Google for the first time.

### 5. Google OAuth setup

Google sign-in is configured **in Supabase's dashboard**, not in this app's code or its environment variables — do these in order, since step 2 needs your project ref from step 4 above:

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **Create Credentials → OAuth client ID** → Application type **Web application**.
2. **Authorized JavaScript origins**: add both
   - `http://localhost:3000` (local dev)
   - `https://workoutmate.rishabh.uk` (production)
3. **Authorized redirect URIs**: add exactly one URI, using the project ref from step 4 above:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`

   This is a **Supabase** URL, not a WorkoutMate URL — Google redirects to Supabase first, and Supabase then redirects into the app. Don't add `workoutmate.rishabh.uk` here; that goes in step 5 below instead.
4. Save, then copy the generated **Client ID** and **Client Secret**.
5. In the Supabase dashboard: **Authentication → Sign In / Providers → Google** — paste the Client ID and Client Secret, toggle the provider on, save.
6. In **Authentication → URL Configuration**, set:
   - **Site URL**: `https://workoutmate.rishabh.uk` (production) — this is the default redirect Supabase falls back to.
   - **Redirect URLs** (allow-list — add both, one per line):
     - `http://localhost:3000/auth/callback`
     - `https://workoutmate.rishabh.uk/auth/callback`

   These are WorkoutMate's own callback route (`app/auth/callback/route.ts`), which exchanges Supabase's auth code for a session and then routes the user to `/onboarding` (new user) or `/dashboard` (returning user with a completed profile) — see that file for the exact logic if you need to confirm it matches what's configured here.

/ verify: an incognito-window sign-in should land on Google's account chooser, then bounce through `<project-ref>.supabase.co/auth/v1/callback`, then land on `/auth/callback` on your own domain, then `/onboarding` or `/dashboard`. If it instead shows a Google "redirect_uri_mismatch" error, the URI in step 3 doesn't exactly match (check for trailing slashes and http vs https).

### 6. Anthropic setup

1. Create a key at [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys).
2. Set it as `ANTHROPIC_API_KEY` in `.env.local` (and later, as a `wrangler secret` for production — see [Deployment](#deployment-cloudflare-workers)).
3. Optionally set `ANTHROPIC_MODEL` to override the default (`claude-sonnet-5`) — left as an env var rather than hardcoded since it lets you upgrade without a code change.
4. No further Anthropic-side configuration is needed — tool-calling, streaming, and the propose/confirm gating are all implemented in this repo (`lib/ai/tools.ts`, `app/api/coach/route.ts`), not configured on Anthropic's side.

### 7. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`. New sign-ins land in onboarding; returning users with a completed profile land on the dashboard.

---

## Scripts

```bash
npm run dev         # start the dev server
npm run build        # production build (also runs TypeScript's own check)
npm run start         # run the production build
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run test           # run the Vitest suite once
npm run test:watch     # Vitest in watch mode
npm run db:seed        # seed/re-sync the exercise library
npm run cf:preview      # build for Workers and preview it locally via wrangler
npm run cf:deploy       # build for Workers and deploy (see Windows note below)
npm run cf:typegen      # regenerate cloudflare-env.d.ts from wrangler.jsonc bindings
```

## Testing

`npm run test` runs the Vitest suite (`tests/`): the generation engine's split/exercise-selection/prescription logic, exercise substitution matching, progression-recommendation and PR-detection logic, and Zod validation schemas. These are pure-function unit tests with no live Supabase/Anthropic dependency, so they run the same in CI as locally. `server-only`-guarded modules (anything that touches the DB directly) are kept thin wrappers around pure, tested logic specifically so the business logic itself stays testable — see `lib/progress/progression-logic.ts` vs `lib/progress/progression.ts` for the pattern.

## Production build

```bash
npm run build
```

Before shipping, all four of `typecheck`, `lint`, `test`, and `build` should be clean — that's the actual bar this project was held to during development, not just "it compiles."

---

## Deployment (Cloudflare Workers)

WorkoutMate deploys to Cloudflare Workers via the [OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare), which builds Next's real output (not a reimplementation of it) and transforms it to run on `workerd`. Cloudflare also has a newer, beta, Vite-based path (`vinext`) — this project intentionally uses OpenNext instead, since it's the more mature, still-supported option and this app leans on Server Actions, streaming AI SDK responses, and several Route Handlers that are safer to trust to the adapter that runs Next's actual build.

### 1. One-time setup

Already done in this repo — noted here so the pieces make sense:

- `wrangler.jsonc` — the Worker's config: `name: "workoutmate"`, `main: ".open-next/worker.js"`, `compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"]`, an `assets` binding for static files, and a `WORKER_SELF_REFERENCE` service binding OpenNext uses internally.
- `open-next.config.ts` — adapter config (default, no R2 incremental cache — this app is almost entirely dynamic/user-scoped rather than statically revalidated, so it isn't needed yet).
- `next.config.ts` calls `initOpenNextCloudflareForDev()`, **gated behind `NODE_ENV === "development"`**. Don't remove that gate: calling it unconditionally makes `next build` start a local `workerd` instance from every parallel build worker, all racing to open the same local SQLite state file — a real crash (`SQLITE_CANTOPEN`/`SQLITE_BUSY`), not a hypothetical one.

### 2. Build and deploy

```bash
npm run cf:deploy
```

This runs `opennextjs-cloudflare build` (which runs `next build` internally, then transforms the output for Workers) followed by `opennextjs-cloudflare deploy`.

**Windows-specific note:** `opennextjs-cloudflare deploy` (and a plain `wrangler deploy`, which auto-detects this as an OpenNext project and redirects to the same command) spins up a local Miniflare/`workerd` instance as part of its own deploy process, independent of the dev-mode guard above — and on Windows this instance can fail the same way (`SQLITE_CANTOPEN`), which the tooling itself warns about ("OpenNext is not fully compatible with Windows"). If you hit this, build separately and deploy with wrangler's autoconfig disabled, which uploads the already-built `.open-next/worker.js` directly without going through that local proxy step:
```bash
npx opennextjs-cloudflare build
npx wrangler deploy --autoconfig=false
```
This isn't a workaround for an app bug — it's the same deployment, just skipping a local-only bindings-resolution step this platform's tooling doesn't yet handle reliably outside WSL/Linux/macOS.

### 3. Environment variables and secrets

Two different mechanisms, because Workers isn't a Node process with a live `.env` file:

- **`NEXT_PUBLIC_*` variables** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`) are inlined into the build by Next.js at `next build` time — set them in `.env.local` **before** running `npm run cf:deploy`, not after. Changing one always means rebuild + redeploy, not just a dashboard edit.
- **Server-only secrets** (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, optionally `ANTHROPIC_MODEL`) are read at request time, not build time — set these with `wrangler secret put`, which stores them encrypted on Cloudflare and doesn't require a rebuild to change:
  ```bash
  npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
  npx wrangler secret put ANTHROPIC_API_KEY
  ```
  (Each prompts for the value interactively — nothing to type on the command line, so it never ends up in shell history.)

`CLOUDFLARE_API_TOKEN` is neither of these — it's read only by the `wrangler`/`opennextjs-cloudflare` CLIs on the machine doing the deploying, never by the app itself.

### 4. Custom domain

Prefer a **Workers Custom Domain** over a manually-managed CNAME — Cloudflare provisions the DNS record and the SSL certificate for you and keeps them in sync with the Worker:

```bash
# One-time, via the API (Workers & Pages → workoutmate → Settings → Domains & Routes
# in the dashboard does the same thing):
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/<account_id>/workers/domains" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
  -d '{"zone_id":"<zone_id>","hostname":"workoutmate.rishabh.uk","service":"workoutmate","environment":"production"}'
```

This creates a read-only, proxied DNS record pointing at the Worker and issues a dedicated certificate — don't also create a manual `CNAME`/`A` record for the same hostname, they'd conflict.

### 5. Google OAuth and Supabase redirect URLs

Same as local setup (see [Google OAuth setup](#5-google-oauth-setup)) — confirm `https://workoutmate.rishabh.uk/auth/callback` is in Supabase's **Authentication → URL Configuration** redirect allow-list. Easy to add only the localhost one during development and forget this step.

### Post-deploy checklist

Actually verify each of these against the live URL before calling the deployment done — don't assume:

- [ ] Landing page loads at the custom domain over HTTPS with a valid certificate
- [ ] "Continue with Google" completes and returns to the app
- [ ] A brand-new Google account lands in onboarding; a returning user lands on the dashboard
- [ ] Onboarding completes and a plan is visible on `/dashboard`
- [ ] Starting and logging a workout writes to Supabase (check the `workout_sessions` / `set_logs` tables)
- [ ] The AI coach responds and a plan-edit proposal shows an Apply/Cancel card that actually updates `/plan` when applied
- [ ] Protected routes (`/dashboard`, `/plan`, `/progress`, `/coach`, `/settings`, `/workout/[id]`) redirect to `/login` when signed out
- [ ] Signed-in users can navigate between all of the above without being bounced back to `/login`
- [ ] Mobile viewport: bottom nav, onboarding, and the workout screen are all usable one-handed
- [ ] A second test account cannot see the first account's plan/progress/coach history (RLS check — see the security model note above)

## What's intentionally out of scope for v1

Documented here rather than left as a silent gap:

- **Payments** — the schema and code are structured so a Free/Pro split and Stripe billing can be added later without rearchitecting (no payment code exists yet).
- **Push/email notifications** — the `notifications` and `notification_preferences` tables and the settings UI toggles exist; nothing currently sends a push or email, they'd need a scheduled job (e.g. a [Cloudflare Cron Trigger](https://developers.cloudflare.com/workers/configuration/cron-triggers/) on this Worker) wired to a provider.
- **`create_workout` AI tool** (converting a rest day into a training day) — the coach handles "add a day" via `change_training_days` with an incremented count instead of a dedicated tool.
- **Admin panel** — no UI exists, but exercises/plans are normal tables an admin surface could be built against later.
