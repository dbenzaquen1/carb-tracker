-- Carb Tracker database schema.
-- Run this once in your Supabase project's SQL editor (SQL Editor -> New query).
-- It is safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per user: their email (for admin lookup), carb/exercise/PT goals,
-- and an admin flag.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  daily_goal integer not null default 150 check (daily_goal > 0),
  weekly_exercise_goal integer not null default 5
    check (weekly_exercise_goal > 0),
  weekly_pt_goal integer not null default 7 check (weekly_pt_goal > 0),
  is_admin boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Add later columns if upgrading an older profiles table.
alter table public.profiles
  add column if not exists weekly_exercise_goal integer not null default 5
    check (weekly_exercise_goal > 0);
alter table public.profiles
  add column if not exists weekly_pt_goal integer not null default 7
    check (weekly_pt_goal > 0);
alter table public.profiles add column if not exists email text;
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- One row per logged food item.
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  name text not null check (char_length(name) between 1 and 200),
  carbs numeric(7, 1) not null check (carbs >= 0),
  created_at timestamptz not null default now()
);

create index if not exists entries_user_date_idx
  on public.entries (user_id, entry_date);

-- One row per day the user exercised; existence = "exercised that day".
create table if not exists public.exercise_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, entry_date)
);

-- Same idea for physical-therapy exercises (a separate daily check-off).
create table if not exists public.pt_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, entry_date)
);

-- ---------------------------------------------------------------------------
-- Admin helper: SECURITY DEFINER so policies can check admin status without
-- recursing through profiles' own RLS.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;
grant execute on function public.is_admin(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security: users manage their own rows; admins may READ all rows.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.entries enable row level security;
alter table public.exercise_days enable row level security;
alter table public.pt_days enable row level security;

-- profiles
drop policy if exists "Users manage own profile" on public.profiles;
drop policy if exists "Read own or admin profiles" on public.profiles;
drop policy if exists "Insert own profile" on public.profiles;
drop policy if exists "Update own profile" on public.profiles;
create policy "Read own or admin profiles" on public.profiles
  for select using (auth.uid() = id or public.is_admin(auth.uid()));
create policy "Insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- entries
drop policy if exists "Users manage own entries" on public.entries;
drop policy if exists "Read own or admin entries" on public.entries;
drop policy if exists "Insert own entries" on public.entries;
drop policy if exists "Update own entries" on public.entries;
drop policy if exists "Delete own entries" on public.entries;
create policy "Read own or admin entries" on public.entries
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "Insert own entries" on public.entries
  for insert with check (auth.uid() = user_id);
create policy "Update own entries" on public.entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Delete own entries" on public.entries
  for delete using (auth.uid() = user_id);

-- exercise_days
drop policy if exists "Users manage own exercise days" on public.exercise_days;
drop policy if exists "Read own or admin exercise days" on public.exercise_days;
drop policy if exists "Insert own exercise days" on public.exercise_days;
drop policy if exists "Delete own exercise days" on public.exercise_days;
create policy "Read own or admin exercise days" on public.exercise_days
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "Insert own exercise days" on public.exercise_days
  for insert with check (auth.uid() = user_id);
create policy "Delete own exercise days" on public.exercise_days
  for delete using (auth.uid() = user_id);

-- pt_days
drop policy if exists "Users manage own pt days" on public.pt_days;
drop policy if exists "Read own or admin pt days" on public.pt_days;
drop policy if exists "Insert own pt days" on public.pt_days;
drop policy if exists "Delete own pt days" on public.pt_days;
create policy "Read own or admin pt days" on public.pt_days
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "Insert own pt days" on public.pt_days
  for insert with check (auth.uid() = user_id);
create policy "Delete own pt days" on public.pt_days
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Automatically create a profile row (with email) when a new user signs up.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- To grant yourself admin access (read-only view of all users):
--   update public.profiles set is_admin = true where email = 'you@example.com';
