-- WorkoutMate — user profile, goals, training preferences, physical limitations
-- One row per auth.users row, created automatically on sign-up.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  date_of_birth date,
  sex text check (sex in ('male', 'female', 'other', 'prefer_not_to_say')),
  height_cm numeric(5,1) check (height_cm is null or (height_cm > 0 and height_cm < 300)),
  weight_kg numeric(5,1) check (weight_kg is null or (weight_kg > 0 and weight_kg < 500)),
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced')),
  activity_level text check (activity_level in ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active')),
  sleep_hours numeric(3,1) check (sleep_hours is null or (sleep_hours >= 0 and sleep_hours <= 24)),
  avatar_url text,
  timezone text not null default 'UTC',
  onboarding_step int not null default 0,
  onboarding_completed_at timestamptz,
  ai_coach_tone text not null default 'balanced' check (ai_coach_tone in ('balanced', 'encouraging', 'direct')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per user, extends auth.users with fitness profile data.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- No insert/delete policy for the authenticated role: rows are created by
-- handle_new_user() below (SECURITY DEFINER) and removed by cascading from
-- auth.users when an account is deleted via the service-role admin API.

-- ── fitness goals (many per profile, one marked primary) ──────────────────

create table public.fitness_goals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  goal text not null check (goal in (
    'build_muscle', 'lose_fat', 'lose_weight', 'gain_weight',
    'improve_strength', 'improve_endurance', 'improve_cardio',
    'improve_mobility', 'improve_general_fitness', 'maintain_fitness',
    'athletic_performance'
  )),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (profile_id, goal)
);

create unique index fitness_goals_one_primary_per_profile
  on public.fitness_goals (profile_id)
  where is_primary;

alter table public.fitness_goals enable row level security;

create policy "fitness_goals_all_own" on public.fitness_goals
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ── training preferences (schedule, equipment, style — 1:1 with profile) ──

create table public.training_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  days_per_week smallint check (days_per_week between 1 and 7),
  preferred_days smallint[] not null default '{}', -- 0 = Sunday .. 6 = Saturday
  workout_duration text check (workout_duration in ('15_30', '30_45', '45_60', '60_90', '90_plus')),
  preferred_time text check (preferred_time in ('morning', 'afternoon', 'evening', 'flexible')),
  split_type text check (split_type in ('full_body', 'upper_lower', 'push_pull_legs', 'custom')),
  location text check (location in ('home', 'gym', 'both')),
  equipment jsonb not null default '[]', -- e.g. ["dumbbells", "bench", "other:sandbag"]
  preferred_exercises text[] not null default '{}',
  disliked_exercises text[] not null default '{}',
  training_style text check (training_style in ('strength', 'hypertrophy', 'circuit', 'hiit', 'endurance', 'mixed')),
  cardio_preference text check (cardio_preference in ('none', 'light', 'moderate', 'high')),
  updated_at timestamptz not null default now()
);

create trigger training_preferences_set_updated_at
  before update on public.training_preferences
  for each row execute function public.set_updated_at();

alter table public.training_preferences enable row level security;

create policy "training_preferences_all_own" on public.training_preferences
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ── physical limitations (informational only — never used to diagnose) ────

create table public.physical_limitations (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  injuries text,
  limitations text,
  avoid_exercises text[] not null default '{}',
  notes text,
  updated_at timestamptz not null default now()
);

create trigger physical_limitations_set_updated_at
  before update on public.physical_limitations
  for each row execute function public.set_updated_at();

alter table public.physical_limitations enable row level security;

create policy "physical_limitations_all_own" on public.physical_limitations
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ── auto-provision a profile row whenever a new auth user is created ───────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1),
      'there'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
