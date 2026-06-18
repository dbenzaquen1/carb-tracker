-- Migration: exercise tracking.
-- Run this once in the Supabase SQL editor on an existing project (the full
-- schema.sql already includes everything below for fresh setups).
-- Safe to re-run.

-- Weekly exercise goal (days per week) on the profile.
alter table public.profiles
  add column if not exists weekly_exercise_goal integer not null default 5
    check (weekly_exercise_goal > 0);

-- One row per day the user exercised; existence = "exercised that day".
create table if not exists public.exercise_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, entry_date)
);

alter table public.exercise_days enable row level security;

drop policy if exists "Users manage own exercise days" on public.exercise_days;
create policy "Users manage own exercise days" on public.exercise_days
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
