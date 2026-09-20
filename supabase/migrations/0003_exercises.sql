-- WorkoutMate — shared exercise library (read-only for regular users)

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  category text not null check (category in (
    'chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full_body', 'cardio'
  )),
  primary_muscle text not null check (primary_muscle in (
    'chest', 'lats', 'upper_back', 'lower_back', 'shoulders', 'biceps', 'triceps',
    'forearms', 'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques',
    'full_body', 'cardio'
  )),
  secondary_muscles text[] not null default '{}',
  equipment text[] not null default '{}',
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  movement_type text not null check (movement_type in ('compound', 'isolation', 'cardio', 'mobility')),
  instructions text[] not null default '{}',
  common_mistakes text[] not null default '{}',
  video_url text,
  image_url text,
  is_unilateral boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exercises_category_idx on public.exercises (category) where is_active;
create index exercises_primary_muscle_idx on public.exercises (primary_muscle) where is_active;
create index exercises_equipment_idx on public.exercises using gin (equipment);
create index exercises_difficulty_idx on public.exercises (difficulty) where is_active;

create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

alter table public.exercises enable row level security;

-- Exercise library is shared, read-only reference data. Writes happen only
-- through the service role (seed script / future admin tooling).
create policy "exercises_public_read" on public.exercises
  for select to anon, authenticated
  using (is_active = true);

-- ── curated substitutions (used by the substitution engine + AI coach) ────

create table public.exercise_alternatives (
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  alternative_exercise_id uuid not null references public.exercises(id) on delete cascade,
  reason text not null default 'equipment',
  priority smallint not null default 0,
  primary key (exercise_id, alternative_exercise_id),
  check (exercise_id <> alternative_exercise_id)
);

create index exercise_alternatives_lookup_idx on public.exercise_alternatives (exercise_id, priority);

alter table public.exercise_alternatives enable row level security;

create policy "exercise_alternatives_public_read" on public.exercise_alternatives
  for select to anon, authenticated
  using (true);
