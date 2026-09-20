-- WorkoutMate — adds the "body_part" split (Chest/Triceps, Back/Biceps,
-- Shoulders/Abs, Legs, cycling) as a first-class split type, and the
-- "change_split" pending-change type for the AI coach's new change_split tool.
--
-- CHECK constraints can't be altered in place — drop and recreate each one,
-- using Postgres's default auto-generated name for an inline column
-- constraint ({table}_{column}_check).

alter table public.training_preferences drop constraint if exists training_preferences_split_type_check;
alter table public.training_preferences add constraint training_preferences_split_type_check
  check (split_type in ('full_body', 'upper_lower', 'push_pull_legs', 'body_part', 'custom'));

alter table public.workout_plans drop constraint if exists workout_plans_split_type_check;
alter table public.workout_plans add constraint workout_plans_split_type_check
  check (split_type in ('full_body', 'upper_lower', 'push_pull_legs', 'body_part', 'custom'));

alter table public.pending_plan_changes drop constraint if exists pending_plan_changes_change_type_check;
alter table public.pending_plan_changes add constraint pending_plan_changes_change_type_check
  check (change_type in (
    'replace_exercise', 'update_workout', 'move_workout', 'adjust_duration',
    'change_training_days', 'create_workout', 'rebuild_plan', 'change_split', 'other'
  ));
