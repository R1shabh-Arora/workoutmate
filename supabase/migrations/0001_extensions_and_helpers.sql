-- WorkoutMate — extensions and shared helper functions
-- These are used across every later migration.

create extension if not exists "pgcrypto";

-- Generic updated_at trigger, attached per-table where needed.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Keeps an updated_at column current on every row update.';
