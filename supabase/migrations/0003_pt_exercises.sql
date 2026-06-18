-- Migration: PT (physical therapy) exercise tracking.
-- Run this once in the Supabase SQL editor on an existing project.
-- Safe to re-run.

-- Weekly PT goal (days per week) on the profile.
alter table public.profiles
  add column if not exists weekly_pt_goal integer not null default 7
    check (weekly_pt_goal > 0);

-- One row per day the user did their PT exercises; existence = "done that day".
create table if not exists public.pt_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, entry_date)
);

alter table public.pt_days enable row level security;

drop policy if exists "Users manage own pt days" on public.pt_days;
create policy "Users manage own pt days" on public.pt_days
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
