# Deployment

Production runs on **Cloudflare Workers**, built via the OpenNext adapter. No secret values appear in this file — names only. Real values live in `.env.local` (gitignored, local dev only) or as `wrangler secret`s (production).

## Services involved

| Service | What it's for |
|---|---|
| Supabase | Postgres database, Auth (incl. Google OAuth), storage |
| Google Cloud (OAuth client) | Identity provider for "Continue with Google" |
| Anthropic | Claude API for the AI coach |
| Cloudflare | Hosting (Workers), DNS + SSL for the custom domain |

## Why OpenNext, not `vinext`

Cloudflare's newer `vinext` (a Vite plugin reimplementing the Next.js API surface) is real but was **beta** at the time this was set up, and the sandboxed environment used to build this project declined to execute it as unvetted third-party code — itself a useful signal not to bet a first production deploy on it. `@opennextjs/cloudflare` runs Next's actual build output rather than reimplementing it, and is the more mature, still Cloudflare-co-maintained path. This app leans on Server Actions, streaming AI responses, and several Route Handlers — reasons to prefer the adapter that's closest to "just run what Next actually built."

## One-time project setup (already done, explained for context)

- `wrangler.jsonc` — Worker name `workoutmate`, `main: ".open-next/worker.js"`, `compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"]`, an `assets` binding, a `WORKER_SELF_REFERENCE` service binding OpenNext uses internally, a `COACH_RATE_LIMITER` Rate Limiting binding (`/api/coach` abuse protection — see `docs/AI_COACH.md`), and `"keep_names": false` (see the Windows bug below). Whenever a binding is added or changed here, re-run `npm run cf:typegen` before building — otherwise TypeScript won't know the new binding exists on `env`.
- `open-next.config.ts` — default config, no R2-backed ISR cache (this app is almost entirely dynamic/user-scoped, not statically revalidated).
- `next.config.ts` calls `initOpenNextCloudflareForDev()`, **gated behind `NODE_ENV === "development"`**. Do not remove that gate — calling it unconditionally makes `next build` start a local `workerd`/Miniflare instance from every parallel build worker, all racing to open the same local SQLite state file, which crashes the build (`SQLITE_CANTOPEN`/`SQLITE_BUSY`).

## Environment variables

| Variable | Public/Server | Where it's set |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public, build-time | `.env.local` before `next build` / `cf:deploy` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public, build-time | `.env.local` before `next build` / `cf:deploy` |
| `NEXT_PUBLIC_SITE_URL` | Public, build-time | `.env.local` — `https://workoutmate.rishabh.uk` for production builds |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only secret** | `wrangler secret put SUPABASE_SERVICE_ROLE_KEY` |
| `ANTHROPIC_API_KEY` | **Server-only secret** | `wrangler secret put ANTHROPIC_API_KEY` |
| `ANTHROPIC_MODEL` | Server-only, optional | `wrangler secret put ANTHROPIC_MODEL` if overriding the `claude-sonnet-5` default |
| `CLOUDFLARE_API_TOKEN` | Deploy-tooling only | Local shell env / CI secret — read by `wrangler`/`opennextjs-cloudflare` on the deploying machine, never by the running app |

The `NEXT_PUBLIC_*` group is inlined into the build by Next at `next build` time — changing one always means rebuild + redeploy, editing a dashboard value afterward does nothing. The server-only secrets are read at request time from the Worker's bindings — `wrangler secret put` takes effect without a rebuild.

## Build and deploy

```bash
npm run cf:deploy
```

Runs `opennextjs-cloudflare build` (which runs `next build` internally, then transforms the output for Workers) followed by `opennextjs-cloudflare deploy`.

### Windows-specific: the build/deploy split

`opennextjs-cloudflare deploy` — and a plain `wrangler deploy`, which auto-detects an OpenNext project and redirects to the same command — spins up a local Miniflare/`workerd` instance as part of its own deploy process, independent of the `next.config.ts` dev-only guard above. On Windows this can crash the same way (`SQLITE_CANTOPEN`), which the tooling itself warns about on every invocation ("OpenNext is not fully compatible with Windows"). If it happens, build and deploy as two steps, with autoconfig disabled on the second:

```bash
npx opennextjs-cloudflare build
npx wrangler deploy --autoconfig=false
```

This uploads the already-built `.open-next/worker.js` directly, skipping the local-proxy step that crashes — not a workaround for an app bug, just avoiding a Windows-only tooling gap outside WSL/Linux/macOS.

### The `__name is not defined` bug (fixed, keep this fix)

Every page threw an uncaught `ReferenceError: __name is not defined` in production. Cause: esbuild's `keep-names` transform (which `wrangler`/OpenNext's bundling enables by default) injects a `__name` helper, and `next-themes`' inline no-flash script (which gets converted to a string and `eval`'d at runtime to prevent a flash of the wrong theme on load) can't see that helper in its evaluation scope. Fix, already applied in `wrangler.jsonc`:

```jsonc
{
  "keep_names": false
}
```

Requires wrangler `4.13.0+` (this project uses `4.135.0`). Verify the fix with a genuinely fresh browser tab (not a reused one — console history from before a fix can look identical to a live error) and check for zero console errors on load.

### Cloudflare Error 1102 on `/api/coach` (fixed, keep this fix)

This Cloudflare account is on the **Workers Free plan** — a hard 10ms CPU-time limit per invocation (not wall-clock time; only actual synchronous JS execution counts, not time spent awaiting a subrequest). A real production request hit this limit and got Cloudflare's 1102 error page. Root cause and fix are documented in full in `docs/ARCHITECTURE.md`'s "A production incident" section — short version: several `lib/data/*.ts` functions the coach route depends on were redundantly re-authenticating (constructing a new Supabase client and re-verifying the session over the network) instead of reusing the client `route.ts` already had, and all 14 AI tool schemas were being rebuilt on every request instead of once per Worker isolate. Both were fixed without removing any functionality. If `/api/coach` (or any future Route Handler doing meaningful work) starts throwing 1102 again, check Workers Observability for the failing Ray ID's `$workers.outcome`/`cpuTimeMs` first (see `docs/AI_COACH.md`'s testing section for the exact API call) rather than reaching for a bigger Cloudflare plan — the Free plan's limit can't be raised by config, and the underlying "am I doing redundant synchronous work on every request" question is worth asking regardless of plan.

## Custom domain

`workoutmate.rishabh.uk` is attached as a **Cloudflare Workers Custom Domain**, not a manual CNAME — Cloudflare provisions both the DNS record and the SSL certificate and keeps them in sync with the Worker automatically:

```bash
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/<account_id>/workers/domains" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
  -d '{"zone_id":"<zone_id>","hostname":"workoutmate.rishabh.uk","service":"workoutmate","environment":"production"}'
```

(Equivalently: Cloudflare dashboard → Workers & Pages → `workoutmate` → Settings → Domains & Routes.) This creates a read-only, proxied DNS record pointing at the Worker — don't also create a manual `CNAME`/`A` record for the same hostname; they'd conflict.

## Google OAuth (configured in Supabase, not in app code)

1. Google Cloud Console → OAuth 2.0 Client ID, Web application.
2. Authorized JavaScript origins: `https://workoutmate.rishabh.uk` (and `http://localhost:3000` for local dev).
3. Authorized redirect URI: `https://<supabase-project-ref>.supabase.co/auth/v1/callback` — a Supabase URL, not a WorkoutMate one.
4. Paste the resulting Client ID/Secret into the Supabase dashboard: Authentication → Providers → Google.
5. Supabase dashboard → Authentication → URL Configuration: Site URL `https://workoutmate.rishabh.uk`, and add both `http://localhost:3000/auth/callback` and `https://workoutmate.rishabh.uk/auth/callback` to the redirect allow-list.

## Verification process

After any deploy, actually check the live URL — don't assume:

- [ ] Landing page loads over HTTPS with a valid certificate
- [ ] `http://` redirects to `https://`
- [ ] A fresh browser tab shows zero console errors
- [ ] Protected routes (`/dashboard`, `/plan`, `/progress`, `/coach`, `/settings`, `/workout/[id]`) redirect to `/login` when signed out
- [ ] `POST /api/coach` without a session returns `401`, not a 500
- [ ] `/opengraph-image` and `/icon` return real images (both are `next/og` `ImageResponse` routes — a known Workers-runtime risk area, since confirmed working)
- [ ] Sign in, complete onboarding, confirm a plan is generated and visible on `/dashboard`
- [ ] Start today's workout, log a set, finish it, confirm it shows up on `/progress` (weekly count, streak, and — on a first workout — a PR)
- [ ] Ask the AI coach an actionable question, confirm a proposal card appears, confirm nothing changes in the database until you click Apply, confirm it does change after
- [ ] Ask the AI coach to switch to the body-part split by name; confirm it calls `change_split` (not just replying in text), the card shows a pending proposal, and the model's own text never claims the change already happened
- [ ] Reload `/coach` after an Apply and after a Cancel; confirm the card shows the real persisted state (Applied / Cancelled), not the Apply/Cancel buttons again

## Rollback considerations

`wrangler deploy` uploads a new Version; Cloudflare keeps prior versions retrievable from the dashboard (Workers & Pages → `workoutmate` → Deployments), so reverting doesn't require a new build from an older git commit — `wrangler rollback` (or the dashboard's "Rollback to this version") points traffic at a previous Version ID directly. Database migrations are forward-only in this project (no down-migrations are written) — a schema rollback would need a new, hand-written migration, not a Worker-level rollback.
