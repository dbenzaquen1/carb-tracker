# 🥖 Carb Tracker

A simple, installable web app for tracking daily carbohydrate intake against a
goal. Built as a PWA (works great on Android and desktop) with cloud sync, so
the same data shows up on every device.

## Features

- **Daily total vs. goal** — a progress ring shows carbs eaten and how many
  grams are left before hitting the day's goal (or how far over).
- **Meal categories** — log each item under Breakfast, Lunch, Dinner, or Snack,
  with per-meal subtotals.
- **Add / edit / delete** entries in a tap or two.
- **Trends** — 7- and 30-day averages (per logged day), on-target day counts,
  a 14-day bar chart, and your highest day.
- **Gym log** — a Workouts tab preloaded with a 4-day upper/lower split; log
  weight × reps per set and see what you lifted last time for each exercise.
- **Cloud sync** — data is stored in Supabase and synced across devices, behind
  a private login.
- **PT reminders** — opt-in push notification when PT exercises slip for more
  than two business days.
- **Installable** — "Add to Home Screen" on a phone for an app-like, offline-
  capable experience.

## Tech stack

| Area    | Choice                                |
| ------- | ------------------------------------- |
| UI      | React + TypeScript + Vite             |
| PWA     | `vite-plugin-pwa` (service worker)    |
| Backend | Supabase (Postgres + Auth, free tier) |
| Tests   | Vitest + Testing Library              |
| Quality | ESLint + Prettier + `tsc`             |
| CI/CD   | GitHub Actions → GitHub Pages         |

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a new project
   (the free tier is plenty).
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the
   `profiles` and `entries` tables, Row Level Security policies, and a trigger
   that gives every new user a profile.
3. In **Project Settings → API**, copy the **Project URL** and the **anon
   public** key.

> **Auth tip:** By default Supabase requires email confirmation. For a quick
> personal setup you can turn it off under **Authentication → Providers →
> Email → Confirm email**, so you can sign in immediately after signing up.

> **Already have a project from an earlier version?** Apply any new SQL in
> [`supabase/migrations/`](supabase/migrations) in the SQL editor (in order) to
> add later features. `schema.sql` always reflects the full, current schema for
> fresh setups.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Then fill in `.env.local`:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

The anon key is meant to be public — your data is protected by the Row Level
Security policies in the schema.

### 4. Run it

```bash
npm run dev
```

Open the printed URL. Create an account, set your daily goal in **Settings**,
and start logging.

## PT reminders (push notifications)

Users can opt in (Settings → PT reminders) to a push notification when they go
more than two business days without marking PT done. A Supabase Edge Function
([`supabase/functions/pt-reminder`](supabase/functions/pt-reminder)) runs every
15 minutes, decides per user, and sends Web Push. One-time owner setup:

1. Apply migration
   [`supabase/migrations/0007_pt_reminders.sql`](supabase/migrations/0007_pt_reminders.sql)
   in the SQL editor.
2. Generate a VAPID key pair: `npx web-push generate-vapid-keys`.
3. Put the public key in `.env.local` and in the GitHub Actions secrets as
   `VITE_VAPID_PUBLIC_KEY`, then redeploy the app.
4. Set the function secrets (the private key never goes in the app):

   ```bash
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com
   ```

5. Deploy the function: `supabase functions deploy pt-reminder`.
6. Schedule it: enable `pg_cron` and `pg_net`, store the service-role key in Vault, fill
   in your project URL, and run the `cron.schedule` call from the
   commented block at the bottom of the migration
   ([`0007_pt_reminders.sql`](supabase/migrations/0007_pt_reminders.sql)).

Check it without sending anything (`dry_run` reports each user's decision but
sends and writes nothing):

```bash
curl -H "Authorization: Bearer $SERVICE_ROLE_KEY" "https://<ref>.supabase.co/functions/v1/pt-reminder?dry_run=1"
```

On iPhone, push only works when the app is installed to the home screen
(iOS 16.4 or later).

## Available scripts

| Script                   | What it does                          |
| ------------------------ | ------------------------------------- |
| `npm run dev`            | Start the dev server                  |
| `npm run build`          | Production build to `dist/`           |
| `npm run preview`        | Preview the production build          |
| `npm test`               | Run unit/component tests once         |
| `npm run test:watch`     | Run tests in watch mode               |
| `npm run lint`           | ESLint                                |
| `npm run typecheck`      | TypeScript type checking              |
| `npm run format`         | Format with Prettier                  |
| `npm run format:check`   | Check formatting (used by CI)         |
| `npm run generate-icons` | Regenerate the PWA icons in `public/` |

## Deploying to GitHub Pages

The repo ships with two GitHub Actions workflows:

- **`.github/workflows/ci.yml`** — runs on every push/PR: format check, lint,
  type check, tests, and a build.
- **`.github/workflows/deploy.yml`** — builds and deploys to GitHub Pages on
  every push to `main`.

To enable deployment:

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
3. Add your Supabase values as repository secrets under
   **Settings → Secrets and variables → Actions → New repository secret**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Push to `main`. The app deploys to
   `https://<your-username>.github.io/<repo-name>/`.

The deploy workflow automatically sets Vite's `base` to `/<repo-name>/` so
assets resolve correctly on a project Pages site.

## Installing on a phone

Open the deployed URL in Chrome (Android) or Safari (iOS) and choose
**Add to Home Screen**. The app then launches fullscreen with its own icon and
works offline for viewing previously loaded data.

## Admin dashboard (optional)

An admin can see a read-only overview of every user (today's carbs vs. goal,
trends, exercise/PT compliance, and recent entries) with search by email.

Access is enforced entirely by Row Level Security — admins read all rows, but
everyone can still only write their own. **No service-role key is used in the
app.** To grant yourself access:

1. Make sure the [`supabase/migrations`](supabase/migrations) have been applied
   (they add the `is_admin` flag and admin read policies).
2. Sign in to the app once so your profile exists, then run in the SQL editor:

   ```sql
   update public.profiles set is_admin = true where email = 'you@example.com';
   ```

3. Reload the app — an **Admin** tab appears in the bottom nav.

## Project structure

```
src/
  lib/         Pure, well-tested logic (carb math, dates, metrics) + Supabase client
  hooks/       React hooks for auth, profile, and entries
  components/  UI components (Today, Metrics, Settings, forms, charts…)
  App.tsx      Routing between auth / tabs
supabase/
  schema.sql   Database schema + RLS policies
scripts/
  generate-icons.mjs  Dependency-free PWA icon generator
```
