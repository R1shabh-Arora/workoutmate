-- WorkoutMate — training programme structure: plans → days → exercises
--
-- profile_id is denormalized onto workout_days / workout_exercises (populated
-- by trigger from the parent row) so RLS stays a flat equality check instead
-- of a multi-table join on every row, which matters once plans have years of
-- history attached.

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active', 'archived', 'draft')),
  split_type text not null check (split_type in ('full_body', 'upper_lower', 'push_pull_legs', 'custom')),
  days_per_week smallint not null check (days_per_week between 1 and 7),
  primary_goal text,
  source text not null default 'system' check (source in ('system', 'ai', 'user')),
  version int not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one active plan per user at a time — "My Plan" always has a single answer.
create unique index workout_plans_one_active_per_profile
  on public.workout_plans (profile_id)
  where status = 'active';

create index workout_plans_profile_idx on public.workout_plans (profile_id);

create trigger workout_plans_set_updated_at
  before update on public.workout_plans
  for each row execute function public.set_updated_at();

alter table public.workout_plans enable row level security;

create policy "workout_plans_all_own" on public.workout_plans
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ── workout days ────────────────────────────────────────────────────────

create table public.workout_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  name text not null,
  is_rest_day boolean not null default false,
  focus_muscle_groups text[] not null default '{}',
  estimated_duration_minutes smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Deferrable: swap_workout_days() below flips two rows' day_of_week within
  -- one transaction, which transiently collides on this pair until commit.
  constraint workout_days_plan_dow_unique unique (plan_id, day_of_week) deferrable initially immediate
);

create index workout_days_plan_idx on public.workout_days (plan_id);
create index workout_days_profile_idx on public.workout_days (profile_id);

create or replace function public.workout_days_set_profile_id()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  select profile_id into new.profile_id from public.workout_plans where id = new.plan_id;
  return new;
end;
$$;

create trigger workout_days_populate_profile_id
  before insert on public.workout_days
  for each row execute function public.workout_days_set_profile_id();

create trigger workout_days_set_updated_at
  before update on public.workout_days
  for each row execute function public.set_updated_at();

alter table public.workout_days enable row level security;

create policy "workout_days_all_own" on public.workout_days
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ── exercises within a workout day ─────────────────────────────────────

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references public.workout_days(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  order_index smallint not null,
  is_warmup boolean not null default false,
  sets smallint not null check (sets > 0),
  reps_min smallint check (reps_min is null or reps_min > 0),
  reps_max smallint check (reps_max is null or reps_max >= reps_min),
  duration_seconds smallint check (duration_seconds is null or duration_seconds > 0),
  rest_seconds smallint not null default 60 check (rest_seconds >= 0),
  tempo text,
  intensity_guidance text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_day_id, order_index)
);

create index workout_exercises_day_idx on public.workout_exercises (workout_day_id);
create index workout_exercises_profile_idx on public.workout_exercises (profile_id);
create index workout_exercises_exercise_idx on public.workout_exercises (exercise_id);

create or replace function public.workout_exercises_set_profile_id()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  select profile_id into new.profile_id from public.workout_days where id = new.workout_day_id;
  return new;
end;
$$;

create trigger workout_exercises_populate_profile_id
  before insert on public.workout_exercises
  for each row execute function public.workout_exercises_set_profile_id();

create trigger workout_exercises_set_updated_at
  before update on public.workout_exercises
  for each row execute function public.set_updated_at();

alter table public.workout_exercises enable row level security;

create policy "workout_exercises_all_own" on public.workout_exercises
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
