# AI Coach

## Provider, model, SDK

- **Provider:** Anthropic Claude (migrated from OpenAI — see `CHANGELOG.md`)
- **Model:** `claude-sonnet-5`, overridable via the `ANTHROPIC_MODEL` env var
- **SDK:** Vercel AI SDK v7 (`ai`), with `@ai-sdk/anthropic` as the model provider and `@ai-sdk/react`'s `useChat` on the client
- **API key:** `ANTHROPIC_API_KEY`, server-only — read automatically by the default `anthropic` provider export, never referenced in client code, never committed. In production it's a Cloudflare Worker secret (`wrangler secret put ANTHROPIC_API_KEY`), not a build-time value.

## Where it's implemented

| Piece | File |
|---|---|
| API route (streaming, tool-calling loop) | `app/api/coach/route.ts` |
| Rate limiting | `lib/ai/rate-limit.ts` (binding declared in `wrangler.jsonc`) |
| System prompt | `lib/ai/system-prompt.ts` |
| Context retrieval | `lib/ai/context.ts` |
| Tool definitions | `lib/ai/tools.ts` |
| Proposal helper (the propose/confirm boundary) | `lib/ai/pending-change.ts` |
| Exercise/day name resolution for tools | `lib/ai/exercise-lookup.ts` |
| Apply-a-proposal Server Action | `lib/actions/coach.ts` (`applyPendingChange`, `cancelPendingChange`) |
| Chat UI, confirmation card | `components/coach/` |

## Context retrieval

`app/api/coach/route.ts` calls `buildCoachContext(supabase, userId)` on every request and passes the result as part of the system message, alongside `COACH_SYSTEM_PROMPT`. This is a **condensed, focused** context block — profile basics, current plan shape, and recent activity — not a dump of every table. The model reaches for a tool (`get_workout_history`, `get_exercise_history`, etc.) when it needs something more specific, rather than everything being pre-loaded on every turn. This keeps token cost bounded and matches the stated goal: "why was today's workout difficult?" should trigger a targeted history lookup, not a full profile re-fetch.

## Available tools

Defined in `buildCoachTools(supabase, profileId, conversationId)`, `lib/ai/tools.ts`. Every tool has a Zod `inputSchema` — the AI SDK enforces it before `execute` runs, so a malformed call never reaches application code.

**Read / log — execute immediately, no confirmation needed (read-only or purely additive):**

| Tool | Does |
|---|---|
| `get_user_profile` | Profile, goals, equipment, training preferences |
| `get_current_plan` | Full weekly plan: every day, focus, exercises, sets/reps |
| `get_today_workout` | Today's specific workout, or confirms it's a rest day |
| `get_workout_history` | Recent completed sessions |
| `get_exercise_history` | Logged sets for one specific exercise |
| `get_progress` | Body-weight trend, a volume insight, recent PRs |
| `recommend_progression` | Data-based increase/hold/deload suggestion for one exercise |
| `log_workout` | Logs a set the user reports verbally — additive, low-risk, so it executes immediately |

**Plan-editing — propose only, never write directly:**

| Tool | Proposes |
|---|---|
| `replace_exercise` | Swap one exercise for a suitable alternative |
| `update_workout` | Change sets/rep range/rest for one exercise |
| `move_workout` | Move a workout day to a different weekday (swaps with whatever's currently there, training day or rest) |
| `adjust_workout_duration` | Trim or extend one day to fit a target time |
| `change_training_days` | Rebuild the weekly split around a new days-per-week count (same split type, different day count) |
| `rebuild_plan` | Fully regenerate the plan from current profile/preferences (same split type, everything else refreshed) |
| `change_split` | Switch the weekly split structure itself — e.g. "switch me to a body-part split", "chest/triceps, back/biceps, shoulders/abs, legs", "go back to full body". Same days-per-week, different day-to-day structure. |

Every plan-editing tool calls `proposeChange()` instead of writing to `workout_plans`/`workout_days`/`workout_exercises`. `change_training_days`, `rebuild_plan`, and `change_split` all call the real deterministic generation engine (`lib/generation/engine.ts`) to produce the candidate plan — the model supplies validated scalar inputs (a day count, a split type, a reason string), never the plan structure itself, so a plan-shaped proposal is never raw model output. `change_split` accepts any value from `SPLIT_TYPES` (`lib/types/enums.ts`) — `full_body`, `upper_lower`, `push_pull_legs`, `body_part`, or `custom` — and is the tool to reach for when the user names a specific split; `change_training_days`/`rebuild_plan` keep whatever split is already active.

There is deliberately no `create_workout` tool (turning a rest day into a training day) — `change_training_days` with an incremented count covers that case instead of adding a redundant tool.

## Tool input/output validation

- **Input:** every tool's `inputSchema` is a Zod schema; the AI SDK rejects a call that doesn't match before `execute` ever runs.
- **Output going to the model:** plain data assembled from typed Supabase query results — not user-editable, not a validation concern in the same sense.
- **Output going to the database:** the only tools that write are `log_workout` (append-only) and, indirectly, `applyPendingChange()`. Plan-editing tool payloads are either scalars re-validated at apply time, or full plans produced by the generation engine (which is itself deterministic and tested) — never raw model JSON written straight to a table.

## Confirmation mechanism / pending changes

1. A plan-editing tool call inserts a row into `pending_plan_changes` (`status: 'pending'`, a human-readable `summary`, and a `payload` with exactly what's needed to apply it).
2. The chat UI's `ToolPart` renderer (`components/coach/message-bubble.tsx`) recognizes plan-editing tool names (the `PROPOSE_TOOLS` set — keep this in sync with `lib/ai/tools.ts` if you add a tool) and renders `ConfirmationCard` instead of a plain text response.
3. **Apply Change** → `applyPendingChange(pendingChangeId)` (`lib/actions/coach.ts`): re-fetches the row scoped to `status = 'pending'` **and** the caller's own `profile_id`, switches on `change_type`, performs the real write, then marks the row `applied`. Clicking Apply on an already-resolved row is a safe no-op ("this proposal is no longer available") — the status re-check, not client state, is what prevents a double-apply.
4. **Cancel** → `cancelPendingChange(pendingChangeId)`: marks the row `cancelled`, writes nothing else.
5. Both card states persist in `coach_messages`/`pending_plan_changes`, so the audit trail (`applied` vs `cancelled`, with a timestamp) survives a page reload. `getConversationUIMessages()` (`lib/data/coach.ts`) re-derives this on every load: it collects every `pendingChangeId` referenced by a `proposed: true` tool output in the conversation's history, batch-fetches those rows' current `status` from `pending_plan_changes`, and stamps a `currentStatus` field onto each tool output before handing messages to the client. `ConfirmationCard` (`components/coach/confirmation-card.tsx`) takes that as its `initialStatus` prop instead of always assuming `pending`, so a reloaded conversation shows **Applied**/**Cancelled**/**Expired** immediately for already-resolved proposals — only a genuinely still-pending proposal renders the Apply/Cancel buttons. A sixth, client-only state, **Failed**, covers an `applyPendingChange()` call that threw (network error, a since-changed precondition, etc.) — the underlying row is still `pending` in that case, so the card shows the error inline and offers "Try Again" rather than a dead end; `failed` is never written to the database and so never survives a reload (a reload after a failed attempt correctly shows `pending` again, since that's what's actually true).

This has been live-verified against production, not just read from source: a proposal sitting unconfirmed leaves the underlying tables untouched; clicking Cancel leaves them untouched and marks the row `cancelled`; clicking Apply is the only path that changes them, and the change is visible in the same request cycle on `/plan` and the dashboard. The status re-derivation on reload is a **display-only** fix — `applyPendingChange()`/`cancelPendingChange()` already re-checked `status = 'pending'` server-side before this fix and still do; the UI could never actually cause a double-apply even before, it could just misleadingly *look* actionable after a reload.

## Rate limiting

`POST /api/coach` is rate-limited server-side by Cloudflare's Workers [Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) (`wrangler.jsonc`: `COACH_RATE_LIMITER`, 20 requests per 60-second window, keyed by the authenticated user's id). The check (`lib/ai/rate-limit.ts`, `checkCoachRateLimit()`) runs immediately after the auth check and before any model call, context build, or database write — a request that's about to be rejected does no other work. An exceeded limit returns `429` with a plain-text, non-technical message and a `Retry-After: 60` header; the client (`components/coach/chat-shell.tsx`) surfaces that message directly instead of a generic error, so the user sees "you're sending messages a bit fast" rather than an opaque failure.

Why this shape:
- **Workers-native, not a new dependency.** The binding is provisioned entirely through `wrangler.jsonc` (no KV/D1 namespace to create, no third-party service like Upstash to wire up) and costs nothing extra to run.
- **Per-user, not per-IP.** Keyed by `user.id`, so it can't be reset by switching networks and doesn't depend on any client-side throttling (which the requirements explicitly rule out as the sole protection).
- **Fails open, loudly.** If the binding is missing or the call throws, `checkCoachRateLimit()` logs the error server-side and allows the request rather than taking down the AI Coach over an infrastructure hiccup. A silent, permanent bypass would defeat the point, but a transient failure shouldn't become a full outage of the flagship feature either.
- **Known limitation, accepted deliberately:** Cloudflare's Simple rate limiter is "eventually consistent... not an accurate accounting system," and its counters are local to the Cloudflare location the Worker runs in — a user whose requests land on different PoPs could see a slightly higher effective ceiling than 20/60s. That's an acceptable trade for zero added latency and zero added infrastructure; it is not intended as a precise billing-grade quota. If a hard, exact cap is ever needed, the next step would be a Supabase-backed counter (RPC + table), not a bigger Cloudflare limit.
- **20/60s was chosen, not derived from usage data** — generous enough that no real back-and-forth conversation should ever hit it (a human isn't typing faster than roughly one message every 3 seconds sustained), tight enough to stop a scripted loop from running up the Anthropic bill.

## Error handling

- `app/api/coach/route.ts` returns `401` before any model call if there's no authenticated user.
- `streamText`'s `onError` logs server-side; the client (`components/coach/chat-shell.tsx`) surfaces `useChat`'s `error` state as an inline message, not a mock/fallback response — if the model call fails, the user sees that it failed.
- A tool that can't find what it's looking for (e.g. an exercise name that doesn't exist in the current plan) returns `{ proposed: false, reason: "..." }` rather than throwing; the model relays that reason and, in practice, often retries with a corrected argument (observed live: an ambiguous exercise name on multiple days triggered exactly this retry).

## Safety rules (system prompt, `lib/ai/system-prompt.ts`)

- Never positions itself as a doctor; never diagnoses or claims to treat an injury or medical condition.
- Acknowledges pain/injury/medical mentions, avoids aggravating exercises, and points to a qualified professional — even if the user asks to push through it.
- Never encourages unsafe load/volume/intensity for the stated experience level, or extreme deficits/crash diets.
- Distinguishes conversation from action explicitly: an action request must go through a tool call; the model is instructed never to claim a change happened unless a tool call actually confirms it.
- **Never claims a plan-editing tool's result means the plan is now applied, saved, updated, or live** — a dedicated, explicit section of the prompt (added 2026-09-20 after a real incident where the model's own text said "Applied — your plan has been updated" right after a proposal, with the plan still unchanged) bans past-tense completion language after a plan-editing tool call, gives worked wrong/right examples, and requires present/future framing ("I've prepared...", "This would...") that points the user at the confirmation card. The tool's own result also now includes an explicit `"status": "pending"` field (`lib/ai/tools.ts`), not just `"proposed": true`, so the signal reaching the model is as unambiguous as the prompt language. Live-verified: asking the coach to switch to a body-part split, its actual streamed text was *"I've prepared that switch — ... Take a look at the card below and hit Apply Change to make it your active plan."*
- Personality: friendly, concise, adapts to real life (e.g. missed workouts get a matter-of-fact reschedule suggestion, not guilt).

## How to add a new AI tool

1. Add it to `buildCoachTools()` in `lib/ai/tools.ts`. Define its `inputSchema` as a **module-level constant** (next to the other `*Schema` constants near the top of the file), not inline inside `buildCoachTools()` — that function runs on every single `/api/coach` request, so an inline `z.object({...})` gets rebuilt (and re-converted to JSON Schema for Anthropic) on every request instead of once per Worker isolate. This matters: a version of this file that didn't do this contributed to a real Cloudflare CPU-limit production incident — see `docs/ARCHITECTURE.md`'s "A production incident" section. Write a `description` precise enough for the model to pick the tool correctly.
2. If it needs plan/session/progress data, call the `*ForUser(supabase, profileId, ...)` variant of the relevant `lib/data/*.ts` function (e.g. `getActivePlanForUser`, not `getActivePlan`) — never the self-authenticating original from coach code. The original calls `requireUser()` internally, which builds a new Supabase client and makes a fresh network round-trip to re-verify the session; `route.ts` has already authenticated once, so that's pure waste that compounds fast across a multi-tool-call turn. If the data function you need doesn't have a `ForUser` variant yet, add one following the existing pattern (thin self-authenticating wrapper delegates to an explicit-client version) rather than calling `requireUser()` from a new call site.
3. If it **reads or logs**, have `execute` query/write directly (still through the RLS-scoped `supabase` client passed in).
4. If it **edits the plan**, `execute` must call `proposeChange()` — never write to plan tables directly — and its return value must include `"proposed": true, "status": "pending"` (not just `proposed`) so the model has an unambiguous, structured signal that nothing happened yet. Add the new `change_type` to `PENDING_CHANGE_TYPES` in `lib/types/enums.ts` and to the `change_type` CHECK constraint (add a new migration — every migration through `0011` has already been applied live, so never edit an applied one).
5. Add a `case` for the new `change_type` in `applyPendingChange()` (`lib/actions/coach.ts`).
6. Add the tool's name to `PROPOSE_TOOLS` in `components/coach/message-bubble.tsx` so it renders a confirmation card instead of a plain response.
7. Mention it in `lib/ai/system-prompt.ts` if the model needs guidance on when to use it over an existing tool — and if it's a plan-editing tool, no extra prompt work should be needed to stop it claiming "applied," since that rule is already general-purpose (see Safety rules above).
8. Update the tool table above.

## How to test AI changes

- Unit-testable logic (generation engine, progression/PR detection, validation schemas) has Vitest coverage in `tests/` and needs no live API key.
- The coach loop itself (real Claude call, real tool execution, real confirm/apply) can only be verified live, against a real `ANTHROPIC_API_KEY` and a real Supabase project. There is no mock-AI fallback path in this codebase by design (see `CLAUDE.md`'s business rules) — don't add one to make testing easier.
- A safe way to test end-to-end without touching a real user's data: create a throwaway user via the Supabase Admin API (`auth.admin.createUser`), sign in via a password grant to get a session, drive the actual UI, then delete the test user (`auth.admin.deleteUser`, which cascades). This is how the propose → confirm → apply → cancel flow and the workout execution/logging/progress flow were verified against production for this project.
- A variant that doesn't need a browser at all: use `@supabase/ssr`'s `createServerClient` with a cookie-capturing adapter (`setAll` just pushes into an array instead of writing real cookies) to get the exact `sb-<project-ref>-auth-token` cookie value a real sign-in would produce, then send it as a `Cookie` header on a plain server-to-server `fetch()` straight to `https://<production-url>/api/coach`. This drives the real deployed Worker, the real Claude model, and the real database — useful for confirming actual model behavior (e.g. that it doesn't say "Applied" prematurely) or measuring actual production resource usage, without needing an interactive browser session for an automated test account.
- Before/after direct database queries (not just the UI) are the only way to be sure a tool's write actually happened and matches what the confirmation card said — check the relevant table by ID before proposing, again while the proposal is pending, and again after confirming.
- To inspect a specific request's actual Cloudflare-side CPU/wall time or error classification (not guess from symptoms), query Workers Observability directly: `POST /accounts/{account_id}/workers/observability/telemetry/query` with `view: "invocations"` and a tight `timeframe` window, using the Cloudflare API token. The response includes `$workers.cpuTimeMs`, `$workers.wallTimeMs`, `$workers.outcome` (`"ok"`, `"exceededCpu"`, `"exceededMemory"`, etc.), and `$metadata.rayId` — this is how the 2026-09-20 Cloudflare 1102 incident was actually diagnosed (see `docs/ARCHITECTURE.md`) rather than assumed.
