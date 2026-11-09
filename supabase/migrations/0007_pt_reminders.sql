-- Migration: PT reminder push notifications.
-- Run once in the Supabase SQL editor on an existing project. Safe to re-run.

-- Reminder preferences and bookkeeping on the user's profile.
alter table public.profiles
  add column if not exists pt_reminder_time time not null default '09:00';
alter table public.profiles add column if not exists timezone text;
alter table public.profiles
  add column if not exists pt_reminders_enabled_on date;
alter table public.profiles
  add column if not exists pt_reminder_last_sent_on date;

-- One row per browser/device push subscription. "Reminders enabled" means the
-- user has at least one row here.
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

alter table public.push_subscriptions enable row level security;

-- Owners manage their own rows; no update and no admin read.
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
