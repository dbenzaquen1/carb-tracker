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
  weekly_skin_cream_goal integer not null default 7
    check (weekly_skin_cream_goal > 0),
  is_admin boolean not null default false,
  pt_reminder_time time not null default '09:00',
  timezone text,
  pt_reminders_enabled_on date,
  pt_reminder_last_sent_on date,
  updated_at timestamptz not null default now()
);

-- Add later columns if upgrading an older profiles table.
alter table public.profiles
  add column if not exists weekly_exercise_goal integer not null default 5
    check (weekly_exercise_goal > 0);
alter table public.profiles
  add column if not exists weekly_pt_goal integer not null default 7
    check (weekly_pt_goal > 0);
alter table public.profiles
  add column if not exists weekly_skin_cream_goal integer not null default 7
    check (weekly_skin_cream_goal > 0);
alter table public.profiles add column if not exists email text;
alter table public.profiles
  add column if not exists is_admin boolean not null default false;
alter table public.profiles
  add column if not exists pt_reminder_time time not null default '09:00';
alter table public.profiles add column if not exists timezone text;
alter table public.profiles
  add column if not exists pt_reminders_enabled_on date;
alter table public.profiles
  add column if not exists pt_reminder_last_sent_on date;

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

-- ...and for applying skin cream.
create table if not exists public.skin_cream_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, entry_date)
);

-- One row per logged strength-training set (weight × reps of an exercise).
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

-- One row per browser/device push subscription. "PT reminders enabled" means
-- the user has at least one row here.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

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
alter table public.skin_cream_days enable row level security;
alter table public.workout_sets enable row level security;
alter table public.push_subscriptions enable row level security;

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

-- skin_cream_days
drop policy if exists "Read own or admin skin cream days" on public.skin_cream_days;
drop policy if exists "Insert own skin cream days" on public.skin_cream_days;
drop policy if exists "Delete own skin cream days" on public.skin_cream_days;
create policy "Read own or admin skin cream days" on public.skin_cream_days
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "Insert own skin cream days" on public.skin_cream_days
  for insert with check (auth.uid() = user_id);
create policy "Delete own skin cream days" on public.skin_cream_days
  for delete using (auth.uid() = user_id);

-- workout_sets
drop policy if exists "Read own or admin workout sets" on public.workout_sets;
drop policy if exists "Insert own workout sets" on public.workout_sets;
drop policy if exists "Delete own workout sets" on public.workout_sets;
create policy "Read own or admin workout sets" on public.workout_sets
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "Insert own workout sets" on public.workout_sets
  for insert with check (auth.uid() = user_id);
create policy "Delete own workout sets" on public.workout_sets
  for delete using (auth.uid() = user_id);

-- push_subscriptions (owner only: no update, no admin read)
drop policy if exists "Read own push subscriptions" on public.push_subscriptions;
drop policy if exists "Insert own push subscriptions" on public.push_subscriptions;
drop policy if exists "Delete own push subscriptions" on public.push_subscriptions;
create policy "Read own push subscriptions" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "Insert own push subscriptions" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "Delete own push subscriptions" on public.push_subscriptions
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

-- ---------------------------------------------------------------------------
-- Scheduler: run once per project, by hand (not part of this migration).
-- Fill in the placeholders, uncomment, and run in the SQL editor.
-- ---------------------------------------------------------------------------
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
-- select vault.create_secret('<service-role-key>', 'service_role_key');
-- select cron.schedule('pt-reminder', '*/15 * * * *', $$
--   select net.http_post(
--     url := 'https://<project-ref>.supabase.co/functions/v1/pt-reminder',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || (
--         select decrypted_secret from vault.decrypted_secrets
--         where name = 'service_role_key')),
--     body := '{}'::jsonb);
-- $$);
