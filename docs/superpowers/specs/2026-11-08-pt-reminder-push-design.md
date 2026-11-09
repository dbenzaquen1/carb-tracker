# PT reminder push notifications — design

Date: 2026-11-08
Status: draft, awaiting approval

## Intent

Carb Tracker already lets the user mark "PT exercises done" each day (the
`pt_days` table, one row per done day). The person using the app on her phone
sometimes lets PT slide for several days without noticing. This feature nudges
her with a push notification on her phone once she has gone more than two
business days without marking PT done, and keeps nudging daily until she does.

The notification must arrive even when the app is closed. The app itself is a
static PWA on GitHub Pages, so the sending side lives in Supabase, which the
app already uses for data and auth.

## Goals

- A push notification lands on her phone the morning after two full business
  days have passed with no PT done.
- It repeats every day after that, once per day, until a PT day is marked.
- She turns it on herself from the app's Settings screen; nobody else's phone
  is involved.
- Tapping the notification opens the app (installed from the home-screen icon)
  on the Today tab, where the PT check-off lives.
- Reminder logic is unit tested; the server piece shares that logic rather
  than reimplementing it.

## Non-goals

- Reminders for carbs, exercise, skin cream or gym workouts. The data model
  should not block adding these later, but nothing is built for them now.
- Notifying the admin (the other household member) about her PT. The admin
  view is unchanged.
- In-app banners or badges about the lapse. The push notification is the
  whole feature.
- Supporting the app in a plain browser tab on iPhone, where Web Push is not
  available. Home-screen install is the supported path.

## Anti-goals (what would make this a failure)

- Nagging on days PT has already been done, or sending more than one
  notification per day.
- Firing after a weekend-only gap (Friday done, Monday morning nudge).
- Silently never sending, with no way to tell why. Setup must be checkable.
- Leaking anyone's push subscription to another user.

## Behaviour

### What counts as a lapse

- Business days are Monday to Friday. Weekends and holidays are not
  distinguished; a holiday counts as a business day. (Builder's call: keep it
  simple, no holiday calendar.)
- The _anchor_ is the most recent `pt_days.entry_date` for the user. If she
  has never marked PT done, the anchor is the local date she enabled reminders.
- The lapse condition on a given local date D is: the number of business days
  strictly after the anchor and strictly before D is at least 2, and D itself
  has no PT row.
- Examples (anchor → first nudge):
  - Friday → Wednesday (Mon, Tue missed; Sat/Sun ignored).
  - Monday → Thursday (Tue, Wed missed).
  - Wednesday → Monday (Thu, Fri missed; weekend ignored).
  - Thursday → Tuesday (Fri, Mon missed).
- Once the condition holds, it holds every day (including Saturday and
  Sunday) until a new PT row appears. She asked for "once, then every day
  after", so weekend nudges are intentional. (My reading of her words; flag if
  weekends should be quiet.)

### When it arrives

- At a configurable local time, default 09:00, in her phone's time zone. The
  app records the IANA time zone from the browser whenever she saves reminder
  settings, so the server can convert.
- The server checks every 15 minutes and sends on the first check where her
  local time is at or past the reminder time and nothing has been sent for
  today's local date yet. So a 09:30 setting lands between 09:30 and 09:45,
  and a missed or delayed run is caught up on the next one rather than lost.
  (Builder's call: catch-up semantics beat exact-hour matching.)
- Exactly one notification per local calendar day. The server records the
  last local date it sent for, and will not send twice for the same date.
- Marking PT done after the day's notification has already been sent does
  nothing further that day; the next day's check sees the new anchor and
  stays quiet.

### Notification content

- Title: `PT exercises`
- Body: `It's been N business days since your last PT session. A few minutes
today keeps you on track.` where N is the business days missed so far
  (counts the current day if it is a weekday). When there is no prior PT row
  the body reads `No PT logged yet — a few minutes today keeps you on track.`
- Icon: the existing 192px PWA icon. Tag: `pt-reminder` so a new day's
  notification replaces an unread older one rather than stacking.
- Tap: focus an open app window if there is one, otherwise open the app's
  start URL. Today is the default tab, so nothing more is needed.

### Enabling it (Settings screen)

A new "PT reminders" section in Settings, below the weekly PT goal:

- A toggle, "Remind me when I've missed PT for 2 business days".
- A time input, default 09:00, shown when the toggle is on.
- Turning the toggle on: ask for notification permission, subscribe this
  device to push, store the subscription, set the profile flag. Any failure
  (permission denied, push unsupported, network) turns the toggle back off and
  shows a one-line reason under it, e.g. "Notifications are blocked for this
  app in your phone settings" or "Install the app to your home screen first".
- Turning it off: delete this device's subscription only.
- The toggle reflects **this device**: it is on when the browser's current
  push subscription matches a stored row. "Reminders on" for the user as a
  whole simply means at least one subscription row exists; there is no
  separate flag column. (Builder's call; resolves the two-device case.)
- If she enables it on two devices, both get the notification. Each device
  has its own subscription row, and turning one off leaves the other alone.
- Status line under the toggle when on: "Reminders on for this device."

## Architecture

```
phone (PWA)                    Supabase
┌──────────────┐   subscribe   ┌──────────────────┐
│ Settings UI  │──────────────▶│ push_subscriptions│
│ service wkr  │               │ profiles (flags)  │
│  push handler│◀──────────────│ Edge Function     │◀── pg_cron, every 15 min
└──────────────┘  Web Push     │  pt-reminder      │
                  (VAPID)      └──────────────────┘
```

### Database (migration `0007_pt_reminders.sql`, mirrored in `schema.sql`)

`profiles` gains:

| column                     | type          | default | meaning                      |
| -------------------------- | ------------- | ------- | ---------------------------- |
| `pt_reminder_time`         | time not null | '09:00' | local send time              |
| `timezone`                 | text          | null    | IANA zone from the browser   |
| `pt_reminders_enabled_on`  | date          | null    | anchor when no PT rows exist |
| `pt_reminder_last_sent_on` | date          | null    | local date of last send      |

"Reminders enabled" is derived: a user is enabled when they have at least one
`push_subscriptions` row. `pt_reminders_enabled_on` is set when the first
subscription is created and cleared when the last one is deleted, so a
re-enable starts a fresh anchor.

New table `push_subscriptions`:

| column       | type                                                  |
| ------------ | ----------------------------------------------------- |
| `id`         | uuid primary key default gen_random_uuid()            |
| `user_id`    | uuid not null references auth.users on delete cascade |
| `endpoint`   | text not null unique                                  |
| `p256dh`     | text not null                                         |
| `auth`       | text not null                                         |
| `created_at` | timestamptz not null default now()                    |

RLS: users select/insert/update/delete their own rows only (update is needed
for the upsert-on-endpoint re-enable path). The Edge Function uses
the service role key and bypasses RLS.

### Edge Function `supabase/functions/pt-reminder/index.ts` (Deno)

Runs every 15 minutes via `pg_cron` + `pg_net` (the standard Supabase
scheduling recipe; the migration includes the `cron.schedule` call,
commented, with the project URL to fill in).

**Authentication.** The function keeps Supabase's default JWT verification on.
The cron job sends `Authorization: Bearer <service role key>`, read from
Supabase Vault (`vault.decrypted_secrets`) inside the SQL so the key is never
pasted into a migration. The function additionally checks that the bearer is
the service role key (compare against `SUPABASE_SERVICE_ROLE_KEY`) and returns
401 otherwise; `?dry_run=1` is behind the same check. The README's manual
check therefore uses `curl` with the service role key (or the dashboard's
"Invoke" panel), not an open URL. (Builder's call: no public endpoint, no
user data exposed.)

On each run:

1. Load all profiles that have at least one `push_subscriptions` row.
2. For each, compute the user's current local date and time-of-day from
   `timezone` (null falls back to UTC). Skip unless local time is at or past
   `pt_reminder_time` and `pt_reminder_last_sent_on` is before today's local
   date.
3. Load the user's latest `pt_days.entry_date`. Decide with the shared
   `shouldRemind` function (below). Skip if not due.
4. Send a Web Push to every subscription for that user using VAPID. On a
   404 or 410 response, delete that subscription row.
5. Set `pt_reminder_last_sent_on` to today's local date (even if every
   subscription had expired, so we don't retry hourly).

Secrets (Edge Function environment): `VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (a `mailto:`). `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are provided by the platform.

Web Push library: the `web-push` npm package via Deno's `npm:` specifier.
(Builder's call; any maintained VAPID-capable library is fine.)

### Shared pure logic `supabase/functions/_shared/ptReminder.ts`

Framework-free TypeScript with no imports, so Vitest can test it from the
repo root and Deno can import it from the function:

- `businessDaysBetween(anchorIso, dateIso)`: weekdays strictly after anchor
  and strictly before date.
- `shouldRemind({ anchorIso, todayIso, doneToday })`: the lapse rule above.
- `reminderBody(missedBusinessDays)`: the notification text.
- `localDateAndMinutes(nowUtc, timezone)`: local `YYYY-MM-DD` and minutes
  since midnight, via `Intl.DateTimeFormat`, which both runtimes have.
- `isSendWindow({ localMinutes, reminderTime, lastSentOn, todayIso })`: the
  "at or past the time, not yet sent today" rule.

The Vitest config gains `supabase/functions/_shared/**/*.test.ts` to its
include list, and `tsconfig.json` includes that folder for type checking.

### Client

- **Service worker.** The project uses `vite-plugin-pwa` in `generateSW` mode.
  Rather than switch strategies, add `public/push-sw.js` and reference it via
  `workbox.importScripts`. It handles `push` (show the notification from the
  JSON payload) and `notificationclick` (focus or open
  `self.registration.scope`). Plain JS, no bundling.
- **VAPID public key** is a build-time env var `VITE_VAPID_PUBLIC_KEY`, added
  to `.env.example`, to the deploy workflow's env block (from a repository
  secret), and read alongside the Supabase config. When unset, the Settings
  section shows "Reminders are not configured for this deployment".
- **Hook `usePtReminders(userId)`** in `src/hooks/`: exposes `enabled`,
  `time`, `supported`, `error`, `enable()`, `disable()`, `setTime()`.
  `enable()` runs the permission → subscribe → upsert → profile update
  sequence. The browser APIs (`Notification`, `navigator.serviceWorker`,
  `PushManager`) are accessed through a tiny adapter module so tests can
  stub them.
- **Settings section** wires the hook to the UI described above.
- **`useProfile`** does not change; the reminder fields are owned by the new
  hook to keep the profile hook focused.

### Deploy and setup (README section "PT reminders")

Documented steps the project owner runs once:

1. `npx web-push generate-vapid-keys`.
2. Add `VITE_VAPID_PUBLIC_KEY` as a GitHub Actions secret.
3. Run migration 0007 in the SQL editor.
4. `supabase functions deploy pt-reminder` and set the three VAPID secrets.
5. Store the service role key in Supabase Vault under the name the migration
   expects, then uncomment and run the `cron.schedule` block with the project
   URL.
6. On her phone: open the installed app → Settings → turn on PT reminders.

A "Send test notification" button is **not** included (non-goal), but the
Edge Function accepts `?dry_run=1` which returns the per-user decision as JSON
without sending, so the owner can verify the schedule and logic from the
Supabase dashboard.

## Testing

- `ptReminder.test.ts`: the four anchor examples above plus never-done,
  weekend repetition, done-today suppression, the send-window rule (before
  time, at time, already sent today, catch-up later in the day), and a
  DST-crossing `localDateAndMinutes` case.
- `usePtReminders.test.ts`: enable happy path writes the subscription row and
  sets `pt_reminders_enabled_on` when it is the first; permission denied
  leaves the toggle off with a message; unsupported browser reports
  `supported: false`; disable removes only this device's row; a second device
  with no local subscription shows the toggle off even though another row
  exists.
- `Settings.test.tsx` (or a new section test): toggle and time input render
  and call the hook.
- The Edge Function's orchestration is not unit tested in Vitest (Deno
  runtime); the `dry_run` mode is the manual check. Keep orchestration thin so
  the tested logic carries the behaviour.
- Coverage bar stays at 80% for the PR.

## Constraints

- No new runtime dependencies in the web app; `web-push` is used only inside
  the Edge Function.
- Must keep working on GitHub Pages under the `/<repo>/` base path, so the
  service worker script and icon URLs are resolved relative to the SW scope.
- Follow the repo's branch/PR/test-first rules.

## Calls made after the builder check

A reviewer read this document cold and raised three points. None change what
the user sees, so they were settled here rather than asked:

1. **Send timing**: 15-minute cron with "at or past the time, once per day"
   semantics instead of hourly exact-hour matching, so a 09:30 setting is
   honoured and a missed run is caught up.
2. **Function security**: JWT verification stays on; the cron passes the
   service role key from Vault; `dry_run` is behind the same check.
3. **Two-device state**: the toggle is per device; "enabled" for the user is
   derived from having any subscription row; the `pt_reminders_enabled`
   column was dropped.

Also decided while answering: `supabase/functions/**` and `public/push-sw.js`
are excluded from the Vitest coverage report, ESLint gets a Deno/service-worker
globals override for those paths, and `supabase/config.toml` is added so
`supabase functions deploy` works from the repo.

## Left to the builder

- Exact CSS for the new Settings section (reuse `settings__section` styles).
- Whether `web-push` or another Deno-compatible VAPID library is used.
- Logging detail inside the Edge Function.
- How the time input degrades on browsers without `<input type="time">`
  (any reasonable fallback).
