-- Migration: skin-cream daily check-off (mirrors exercise/PT).
-- Run once in the Supabase SQL editor on an existing project. Safe to re-run.

alter table public.profiles
  add column if not exists weekly_skin_cream_goal integer not null default 7
    check (weekly_skin_cream_goal > 0);

create table if not exists public.skin_cream_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, entry_date)
);

alter table public.skin_cream_days enable row level security;

-- Owners manage their own rows; admins may also read (mirrors the other checks).
drop policy if exists "Read own or admin skin cream days" on public.skin_cream_days;
drop policy if exists "Insert own skin cream days" on public.skin_cream_days;
drop policy if exists "Delete own skin cream days" on public.skin_cream_days;
create policy "Read own or admin skin cream days" on public.skin_cream_days
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "Insert own skin cream days" on public.skin_cream_days
  for insert with check (auth.uid() = user_id);
create policy "Delete own skin cream days" on public.skin_cream_days
  for delete using (auth.uid() = user_id);
