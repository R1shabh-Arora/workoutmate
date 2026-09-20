-- WorkoutMate — body measurements and personal records
-- personal_records is append-only: every PR-breaking event gets its own row,
-- so the UI can show both "current PR" (latest per exercise/type) and history.

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  weight_kg numeric(5,1) not null check (weight_kg > 0 and weight_kg < 500),
  body_fat_pct numeric(4,1) check (body_fat_pct is null or (body_fat_pct between 0 and 100)),
  measured_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  unique (profile_id, measured_at)
);

create index body_measurements_profile_date_idx on public.body_measurements (profile_id, measured_at desc);

alter table public.body_measurements enable row level security;

create policy "body_measurements_all_own" on public.body_measurements
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ── personal records ────────────────────────────────────────────────────

create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete restrict,
  record_type text not null check (record_type in (
    'max_weight', 'max_reps', 'est_1rm', 'max_volume_single_session',
    'longest_workout', 'longest_streak'
  )),
  value numeric(10,2) not null check (value >= 0),
  unit text not null check (unit in ('kg', 'lb', 'reps', 'seconds', 'minutes', 'days')),
  reps_at_weight smallint,
  session_id uuid references public.workout_sessions(id) on delete set null,
  achieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (
    (record_type in ('max_weight', 'max_reps', 'est_1rm') and exercise_id is not null)
    or (record_type in ('max_volume_single_session', 'longest_workout', 'longest_streak') and exercise_id is null)
  )
);

create index personal_records_profile_exercise_idx
  on public.personal_records (profile_id, exercise_id, record_type, achieved_at desc);

alter table public.personal_records enable row level security;

create policy "personal_records_all_own" on public.personal_records
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
