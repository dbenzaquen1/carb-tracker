-- Carb Tracker database schema.
-- Run this once in your Supabase project's SQL editor (SQL Editor -> New query).
-- It is safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per user holding their daily carb goal (grams) and weekly exercise
-- goal (number of days per week).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  daily_goal integer not null default 150 check (daily_goal > 0),
  weekly_exercise_goal integer not null default 5
    check (weekly_exercise_goal > 0),
  weekly_pt_goal integer not null default 7 check (weekly_pt_goal > 0),
  updated_at timestamptz not null default now()
);

-- If profiles already exists from an earlier version, add the new columns.
alter table public.profiles
  add column if not exists weekly_exercise_goal integer not null default 5
    check (weekly_exercise_goal > 0);
alter table public.profiles
  add column if not exists weekly_pt_goal integer not null default 7
    check (weekly_pt_goal > 0);

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

-- Fast lookups for "my entries between two dates".
create index if not exists entries_user_date_idx
  on public.entries (user_id, entry_date);

-- One row per day the user exercised. The row's existence = "exercised that
-- day"; toggling off deletes the row. The composite key keeps it to one per day.
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
-- Row Level Security: each user can only see and modify their own rows.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.entries enable row level security;
alter table public.exercise_days enable row level security;
alter table public.pt_days enable row level security;

drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile" on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users manage own entries" on public.entries;
create policy "Users manage own entries" on public.entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own exercise days" on public.exercise_days;
create policy "Users manage own exercise days" on public.exercise_days
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own pt days" on public.pt_days;
create policy "Users manage own pt days" on public.pt_days
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Automatically create a profile row when a new user signs up.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
