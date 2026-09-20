-- WorkoutMate — notifications and per-user notification preferences

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in (
    'workout_reminder', 'rest_day', 'weekly_review', 'streak', 'goal', 'system'
  )),
  title text not null,
  body text not null default '',
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_profile_idx on public.notifications (profile_id, created_at desc);
create index notifications_profile_unread_idx on public.notifications (profile_id) where read_at is null;

alter table public.notifications enable row level security;

create policy "notifications_all_own" on public.notifications
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ── preferences (1:1) ───────────────────────────────────────────────────

create table public.notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  workout_reminders boolean not null default true,
  rest_day_reminders boolean not null default true,
  weekly_review boolean not null default true,
  streak_reminders boolean not null default true,
  goal_reminders boolean not null default true,
  channels jsonb not null default '["in_app"]',
  quiet_hours_start smallint check (quiet_hours_start between 0 and 23),
  quiet_hours_end smallint check (quiet_hours_end between 0 and 23),
  updated_at timestamptz not null default now()
);

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

create policy "notification_preferences_all_own" on public.notification_preferences
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- default preferences row whenever a profile is created
create or replace function public.handle_new_profile_defaults()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notification_preferences (profile_id) values (new.id)
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

create trigger on_profile_created_notification_defaults
  after insert on public.profiles
  for each row execute function public.handle_new_profile_defaults();
