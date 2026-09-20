-- WorkoutMate — AI coach conversations, messages, and the confirmation
-- queue for programme changes the coach proposes but has not yet applied.

create table public.coach_conversations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New conversation',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index coach_conversations_profile_idx on public.coach_conversations (profile_id, updated_at desc);

create trigger coach_conversations_set_updated_at
  before update on public.coach_conversations
  for each row execute function public.set_updated_at();

alter table public.coach_conversations enable row level security;

create policy "coach_conversations_all_own" on public.coach_conversations
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ── messages ────────────────────────────────────────────────────────────

create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.coach_conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null default '',
  tool_calls jsonb,
  tool_call_id text,
  tool_name text,
  created_at timestamptz not null default now()
);

create index coach_messages_conversation_idx on public.coach_messages (conversation_id, created_at);

create or replace function public.coach_messages_set_profile_id()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  select profile_id into new.profile_id from public.coach_conversations where id = new.conversation_id;
  return new;
end;
$$;

create trigger coach_messages_populate_profile_id
  before insert on public.coach_messages
  for each row execute function public.coach_messages_set_profile_id();

alter table public.coach_messages enable row level security;

create policy "coach_messages_all_own" on public.coach_messages
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ── pending plan changes (the Apply / Cancel confirmation queue) ──────────
-- The AI never mutates a plan directly. A proposal lands here; the plan only
-- changes once the user clicks "Apply" and the server re-validates it.

create table public.pending_plan_changes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.coach_conversations(id) on delete set null,
  change_type text not null check (change_type in (
    'replace_exercise', 'update_workout', 'move_workout', 'adjust_duration',
    'change_training_days', 'create_workout', 'rebuild_plan', 'other'
  )),
  summary text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'applied', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index pending_plan_changes_profile_idx on public.pending_plan_changes (profile_id, status, created_at desc);

alter table public.pending_plan_changes enable row level security;

create policy "pending_plan_changes_all_own" on public.pending_plan_changes
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
