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
| `change_training_days` | Rebuild the weekly split around a new days-per-week count |
| `rebuild_plan` | Fully regenerate the plan from current profile/preferences |

Every plan-editing tool calls `proposeChange()` instead of writing to `workout_plans`/`workout_days`/`workout_exercises`. `change_training_days` and `rebuild_plan` call the real deterministic generation engine (`lib/generation/engine.ts`) to produce the candidate plan — the model supplies validated scalar inputs (a day count, a reason string), never the plan structure itself, so a plan-shaped proposal is never raw model output.

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
5. Both card states persist in `coach_messages`/`pending_plan_changes`, so the audit trail (`applied` vs `cancelled`, with a timestamp) survives a page reload. `getConversationUIMessages()` (`lib/data/coach.ts`) re-derives this on every load: it collects every `pendingChangeId` referenced by a `proposed: true` tool output in the conversation's history, batch-fetches those rows' current `status` from `pending_plan_changes`, and stamps a `currentStatus` field onto each tool output before handing messages to the client. `ConfirmationCard` (`components/coach/confirmation-card.tsx`) takes that as its `initialStatus` prop instead of always assuming `pending`, so a reloaded conversation shows **Applied**/**Cancelled**/**Expired** immediately for already-resolved proposals — only a genuinely still-pending proposal renders the Apply/Cancel buttons.

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
- Personality: friendly, concise, adapts to real life (e.g. missed workouts get a matter-of-fact reschedule suggestion, not guilt).

## How to add a new AI tool

1. Add it to `buildCoachTools()` in `lib/ai/tools.ts` with a Zod `inputSchema` and a `description` precise enough for the model to pick it correctly.
2. If it **reads or logs**, have `execute` query/write directly (still through the RLS-scoped `supabase` client passed in).
3. If it **edits the plan**, `execute` must call `proposeChange()` — never write to plan tables directly. Add the new `change_type` to `PENDING_CHANGE_TYPES` in `lib/types/enums.ts` and to the `change_type` CHECK constraint in `supabase/migrations/0007_coach.sql` (safe to edit directly only before that migration has been applied anywhere live — otherwise add a new migration).
4. Add a `case` for the new `change_type` in `applyPendingChange()` (`lib/actions/coach.ts`).
5. Add the tool's name to `PROPOSE_TOOLS` in `components/coach/message-bubble.tsx` so it renders a confirmation card instead of a plain response.
6. Mention it in `lib/ai/system-prompt.ts` if the model needs guidance on when to use it over an existing tool.
7. Update the tool table above.

## How to test AI changes

- Unit-testable logic (generation engine, progression/PR detection, validation schemas) has Vitest coverage in `tests/` and needs no live API key.
- The coach loop itself (real Claude call, real tool execution, real confirm/apply) can only be verified live, against a real `ANTHROPIC_API_KEY` and a real Supabase project. There is no mock-AI fallback path in this codebase by design (see `CLAUDE.md`'s business rules) — don't add one to make testing easier.
- A safe way to test end-to-end without touching a real user's data: create a throwaway user via the Supabase Admin API (`auth.admin.createUser`), sign in via a password grant to get a session, drive the actual UI, then delete the test user (`auth.admin.deleteUser`, which cascades). This is how the propose → confirm → apply → cancel flow and the workout execution/logging/progress flow were verified against production for this project.
- Before/after direct database queries (not just the UI) are the only way to be sure a tool's write actually happened and matches what the confirmation card said — check the relevant table by ID before proposing, again while the proposal is pending, and again after confirming.
