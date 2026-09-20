-- WorkoutMate — minimal, privacy-conscious product analytics.
-- Write-only from the client's perspective: users can record their own
-- events but never read them back (this is product telemetry, not a
-- user-facing feature). No free-text fields — only a fixed event vocabulary
-- and small structured properties, so nothing sensitive ends up here.

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  event_name text not null check (event_name in (
    'signup_completed', 'onboarding_completed', 'workout_started',
    'workout_completed', 'ai_coach_used', 'exercise_swapped', 'plan_updated'
  )),
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index analytics_events_profile_idx on public.analytics_events (profile_id, created_at desc);
create index analytics_events_name_idx on public.analytics_events (event_name, created_at desc);

alter table public.analytics_events enable row level security;

create policy "analytics_events_insert_own" on public.analytics_events
  for insert with check (auth.uid() = profile_id);
