-- Migration: read-only admin access.
-- Admins (profiles.is_admin = true) may READ every user's data; everyone can
-- still only write their own. Enforced entirely by Row Level Security — no
-- service-role key is ever used in the app.
-- Run once in the Supabase SQL editor. Safe to re-run.

-- Admin flag + email (for identifying/looking up users) on the profile.
alter table public.profiles
  add column if not exists is_admin boolean not null default false;
alter table public.profiles
  add column if not exists email text;

-- Backfill email from auth for existing profiles.
update public.profiles p
  set email = u.email
  from auth.users u
  where u.id = p.id and p.email is distinct from u.email;

-- Keep email populated when new users sign up.
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

-- Admin check used inside policies. SECURITY DEFINER so it reads profiles
-- without re-triggering profiles' own RLS (which would recurse).
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

-- Rebuild policies: owners manage their own rows; admins may also READ all.

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

-- Finally, make yourself an admin (replace with your login email):
--   update public.profiles set is_admin = true where email = 'you@example.com';
