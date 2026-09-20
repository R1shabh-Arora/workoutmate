-- WorkoutMate — workout execution: sessions and per-set logs

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid references public.workout_plans(id) on delete set null,
  workout_day_id uuid references public.workout_days(id) on delete set null,
  name text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'skipped')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_seconds int check (duration_seconds is null or duration_seconds >= 0),
  total_volume_kg numeric(10,1),
  notes text,
  created_at timestamptz not null default now()
);

create index workout_sessions_profile_started_idx on public.workout_sessions (profile_id, started_at desc);
create index workout_sessions_profile_status_idx on public.workout_sessions (profile_id, status);

alter table public.workout_sessions enable row level security;

create policy "workout_sessions_all_own" on public.workout_sessions
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ── individual set logs ─────────────────────────────────────────────────

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  workout_exercise_id uuid references public.workout_exercises(id) on delete set null,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  set_number smallint not null check (set_number > 0),
  reps smallint check (reps is null or reps >= 0),
  weight_kg numeric(6,2) check (weight_kg is null or weight_kg >= 0),
  duration_seconds smallint check (duration_seconds is null or duration_seconds >= 0),
  rpe numeric(3,1) check (rpe is null or (rpe between 1 and 10)),
  is_completed boolean not null default true,
  notes text,
  completed_at timestamptz not null default now()
);

create index set_logs_session_idx on public.set_logs (session_id);
create index set_logs_profile_exercise_idx on public.set_logs (profile_id, exercise_id, completed_at desc);

create or replace function public.set_logs_set_profile_id()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  select profile_id into new.profile_id from public.workout_sessions where id = new.session_id;
  return new;
end;
$$;

create trigger set_logs_populate_profile_id
  before insert on public.set_logs
  for each row execute function public.set_logs_set_profile_id();

alter table public.set_logs enable row level security;

create policy "set_logs_all_own" on public.set_logs
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
