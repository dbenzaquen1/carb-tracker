-- Migration: workout tracking (one row per logged set).
-- Run once in the Supabase SQL editor on an existing project. Safe to re-run.

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  exercise text not null check (char_length(exercise) between 1 and 100),
  weight numeric(6, 1) not null check (weight >= 0),
  reps integer not null check (reps between 1 and 999),
  created_at timestamptz not null default now()
);

create index if not exists workout_sets_user_date_idx
  on public.workout_sets (user_id, entry_date);

alter table public.workout_sets enable row level security;

-- Owners manage their own rows; admins may also read (mirrors entries).
drop policy if exists "Read own or admin workout sets" on public.workout_sets;
drop policy if exists "Insert own workout sets" on public.workout_sets;
drop policy if exists "Delete own workout sets" on public.workout_sets;
create policy "Read own or admin workout sets" on public.workout_sets
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "Insert own workout sets" on public.workout_sets
  for insert with check (auth.uid() = user_id);
create policy "Delete own workout sets" on public.workout_sets
  for delete using (auth.uid() = user_id);
