-- WorkoutMate — RPCs for operations that must be atomic across multiple rows.

-- Swaps which calendar weekday two of a user's workout_days fall on (e.g.
-- moving "Push" from Monday to Tuesday and "Pull" from Tuesday to Monday).
-- Runs as the caller (security invoker) so RLS still applies to the reads;
-- ownership is also checked explicitly before any write. The unique
-- (plan_id, day_of_week) constraint is deferred for this transaction only,
-- since the two-row swap is transiently non-unique until both updates land.
create or replace function public.swap_workout_days(day_id_a uuid, day_id_b uuid)
returns void
language plpgsql
security invoker
as $$
declare
  dow_a smallint;
  dow_b smallint;
  owner_a uuid;
  owner_b uuid;
  plan_a uuid;
  plan_b uuid;
begin
  set constraints public.workout_days_plan_dow_unique deferred;

  select day_of_week, profile_id, plan_id into dow_a, owner_a, plan_a
    from public.workout_days where id = day_id_a;
  select day_of_week, profile_id, plan_id into dow_b, owner_b, plan_b
    from public.workout_days where id = day_id_b;

  if owner_a is null or owner_b is null then
    raise exception 'Workout day not found';
  end if;

  if owner_a <> auth.uid() or owner_b <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  if plan_a <> plan_b then
    raise exception 'Workout days belong to different plans';
  end if;

  update public.workout_days set day_of_week = dow_b where id = day_id_a;
  update public.workout_days set day_of_week = dow_a where id = day_id_b;
end;
$$;

grant execute on function public.swap_workout_days(uuid, uuid) to authenticated;
