# PT Reminder Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send a push notification to the user's phone once she has gone more than two business days without marking PT done, repeating daily until she does.

**Architecture:** A framework-free decision module shared by Vitest and Deno decides whether a user is due. A Supabase Edge Function on a 15-minute `pg_cron` schedule runs that decision per subscribed user and sends Web Push via VAPID. The PWA gains a push handler in its service worker, a Settings section to subscribe this device, and a `push_subscriptions` table with per-user RLS.

**Tech Stack:** React 18 + TypeScript + Vite, `vite-plugin-pwa` (generateSW + `importScripts`), Supabase (Postgres, RLS, Edge Functions on Deno, `pg_cron`, `pg_net`, Vault), `web-push` npm package (Deno only), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-08-pt-reminder-push-design.md`

## Global Constraints

- Business days are Monday–Friday; holidays count as business days.
- Lapse rule: weekdays strictly after the anchor and strictly before today ≥ 2, and today has no PT row.
- Anchor: latest `pt_days.entry_date`, else `profiles.pt_reminders_enabled_on`.
- Once lapsed, remind every day including weekends, exactly once per local calendar day.
- Send window: local time ≥ `pt_reminder_time` and `pt_reminder_last_sent_on` < today's local date. Cron runs every 15 minutes.
- Default reminder time `09:00`. Time zone is the browser's IANA zone; `null` falls back to `UTC`.
- Notification title `PT exercises`; tag `pt-reminder`; icon `pwa-192x192.png` resolved against the service-worker scope.
- Body with a prior PT row: `It's been N business days since your last PT session. A few minutes today keeps you on track.` where N = weekdays strictly after anchor and before today, plus 1 if today is a weekday.
- Body with no prior PT row: `No PT logged yet — a few minutes today keeps you on track.`
- Toggle label: `Remind me when I've missed PT for 2 business days`. Status when on: `Reminders on for this device.`
- Error copy: `Notifications are blocked for this app in your phone settings`, `Install the app to your home screen first`, `Reminders are not configured for this deployment`.
- "Enabled" for a user = at least one `push_subscriptions` row. The toggle reflects this device only. No `pt_reminders_enabled` column.
- Edge Function requires `Authorization: Bearer <service role key>`; `?dry_run=1` is behind the same check.
- No new runtime dependencies in the web app. Keep working under the `/<repo>/` base path.
- Branch `feat/pt-reminder-push`; every task commits; PR coverage bar 80%.

## Review Focus

1. Anchor on a weekend (PT done Saturday): Monday and Tuesday are the two missed weekdays; nudge Wednesday, not earlier. Test in Task 1.
2. Reminder time stored by Postgres as `HH:MM:SS` while the UI saves `HH:MM`: both must parse. Test in Task 1.
3. Local midnight rollover: a user whose local date is still yesterday (UTC already today) must not be treated as a new day. Test in Task 1 via `localDateAndMinutes` with a zone west of UTC.
4. A push subscription whose endpoint was already stored (re-enable on the same device) must not create a duplicate row or re-anchor `pt_reminders_enabled_on`. Test in Task 5.
5. A stale browser subscription with no matching DB row (row deleted elsewhere): toggle shows off; enabling re-uses the browser subscription and writes the row. Test in Task 5.

---

### Task 1: Shared decision logic and coverage tooling

**Files:**

- Create: `supabase/functions/_shared/ptReminder.ts`
- Create: `supabase/functions/_shared/ptReminder.test.ts`
- Modify: `tsconfig.json` (`include` gains `"supabase/functions/_shared"`)
- Modify: `vite.config.ts` (`test.coverage` block)
- Modify: `package.json` (`test:coverage` script, `@vitest/coverage-v8` dev dependency pinned to the installed Vitest major, currently 2.x)

**Interfaces:**

- Produces (all exported, no imports in the file):
  - `isWeekday(iso: string): boolean`
  - `businessDaysBetween(anchorIso: string, dateIso: string): number` — weekdays d with anchor < d < date.
  - `missedBusinessDays(anchorIso: string, todayIso: string): number` — `businessDaysBetween` + 1 if today is a weekday.
  - `shouldRemind(anchorIso: string, todayIso: string): boolean` — `anchorIso !== todayIso && businessDaysBetween(anchorIso, todayIso) >= 2`.
  - `reminderBody(missed: number | null): string` — `null` means no prior PT row.
  - `parseTimeToMinutes(time: string): number` — accepts `HH:MM` and `HH:MM:SS`.
  - `localDateAndMinutes(now: Date, timezone: string | null): { dateIso: string; minutes: number }` — invalid or null zone → `UTC`.
  - `isSendWindow(input: { localMinutes: number; reminderTime: string; lastSentOn: string | null; todayIso: string }): boolean`
  - `type ReminderDecision = { send: boolean; reason: 'not-time' | 'already-sent' | 'not-lapsed' | 'send'; localDate: string; title?: string; body?: string }`
  - `decideForUser(input: { latestPtDate: string | null; enabledOn: string | null; reminderTime: string; timezone: string | null; lastSentOn: string | null; now: Date }): ReminderDecision` — anchor = `latestPtDate ?? enabledOn ?? localDate`; checks in order: local minutes < reminder time → `not-time`; `lastSentOn >= localDate` → `already-sent`; `!shouldRemind` → `not-lapsed`; else `send` with title `PT exercises` and body `reminderBody(latestPtDate ? missedBusinessDays(anchor, today) : null)`.

- [ ] **Step 1: Install coverage tooling and add the script**

```bash
npm install --save-dev @vitest/coverage-v8@2
```

Add `"test:coverage": "vitest run --coverage"` to `package.json` scripts. In `vite.config.ts` `test` block add:

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'text-summary'],
  include: ['src/**/*.{ts,tsx}', 'supabase/functions/_shared/**/*.ts'],
  exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts', '**/*.d.ts'],
},
```

Run `npm run test:coverage` and note the baseline total line coverage in the commit message.

- [ ] **Step 2: Write the failing tests**

`supabase/functions/_shared/ptReminder.test.ts` (Vitest, same import style as `src/lib/dates.test.ts`). Dates: 2026-11-06 is a Friday.

```ts
describe('businessDaysBetween', () => {
  it('counts weekdays strictly between', () => {
    expect(businessDaysBetween('2026-11-06', '2026-11-11')).toBe(2) // Fri → Wed: Mon, Tue
    expect(businessDaysBetween('2026-11-06', '2026-11-10')).toBe(1) // Fri → Tue
    expect(businessDaysBetween('2026-11-06', '2026-11-09')).toBe(0) // Fri → Mon
    expect(businessDaysBetween('2026-11-04', '2026-11-09')).toBe(2) // Wed → Mon: Thu, Fri
    expect(businessDaysBetween('2026-11-07', '2026-11-11')).toBe(2) // Sat anchor → Wed
  })
})
describe('shouldRemind', () => {
  it('matches the spec examples', () => {
    expect(shouldRemind('2026-11-06', '2026-11-11')).toBe(true) // Fri → Wed
    expect(shouldRemind('2026-11-06', '2026-11-10')).toBe(false) // Fri → Tue
    expect(shouldRemind('2026-11-09', '2026-11-12')).toBe(true) // Mon → Thu
    expect(shouldRemind('2026-11-09', '2026-11-11')).toBe(false) // Mon → Wed
    expect(shouldRemind('2026-11-04', '2026-11-09')).toBe(true) // Wed → Mon
    expect(shouldRemind('2026-11-05', '2026-11-10')).toBe(true) // Thu → Tue
    expect(shouldRemind('2026-11-07', '2026-11-10')).toBe(false) // Sat → Tue (only Mon between)
    expect(shouldRemind('2026-11-07', '2026-11-11')).toBe(true) // Sat → Wed
  })
  it('keeps reminding through the weekend once lapsed', () => {
    expect(shouldRemind('2026-11-04', '2026-11-14')).toBe(true) // Saturday
    expect(shouldRemind('2026-11-04', '2026-11-15')).toBe(true) // Sunday
  })
  it('never reminds on the anchor day', () => {
    expect(shouldRemind('2026-11-11', '2026-11-11')).toBe(false)
  })
})
describe('reminderBody', () => {
  it('formats the count and the never-done case', () => {
    expect(reminderBody(3)).toBe(
      "It's been 3 business days since your last PT session. A few minutes today keeps you on track.",
    )
    expect(reminderBody(null)).toBe(
      'No PT logged yet — a few minutes today keeps you on track.',
    )
  })
})
describe('missedBusinessDays', () => {
  it('includes today when it is a weekday', () => {
    expect(missedBusinessDays('2026-11-06', '2026-11-11')).toBe(3)
    expect(missedBusinessDays('2026-11-06', '2026-11-14')).toBe(5) // Saturday: Mon–Fri
  })
})
describe('parseTimeToMinutes', () => {
  it('accepts HH:MM and HH:MM:SS', () => {
    expect(parseTimeToMinutes('09:00')).toBe(540)
    expect(parseTimeToMinutes('09:30:00')).toBe(570)
  })
})
describe('localDateAndMinutes', () => {
  it('converts to the given zone', () => {
    const now = new Date('2026-11-11T02:30:00Z')
    expect(localDateAndMinutes(now, 'America/New_York')).toEqual({
      dateIso: '2026-11-10',
      minutes: 21 * 60 + 30,
    })
    expect(localDateAndMinutes(now, 'Asia/Tokyo')).toEqual({
      dateIso: '2026-11-11',
      minutes: 11 * 60 + 30,
    })
  })
  it('falls back to UTC for null or bogus zones', () => {
    const now = new Date('2026-11-11T02:30:00Z')
    expect(localDateAndMinutes(now, null)).toEqual({
      dateIso: '2026-11-11',
      minutes: 150,
    })
    expect(localDateAndMinutes(now, 'Not/AZone')).toEqual({
      dateIso: '2026-11-11',
      minutes: 150,
    })
  })
  it('handles the US DST change day', () => {
    // 2026-11-01 02:30 EDT → clocks fall back; 06:30Z is 01:30 EST
    expect(
      localDateAndMinutes(new Date('2026-11-01T06:30:00Z'), 'America/New_York'),
    ).toEqual({ dateIso: '2026-11-01', minutes: 90 })
  })
})
describe('isSendWindow', () => {
  const base = { reminderTime: '09:00:00', todayIso: '2026-11-11' }
  it('is closed before the time, open at and after it', () => {
    expect(isSendWindow({ ...base, localMinutes: 539, lastSentOn: null })).toBe(
      false,
    )
    expect(isSendWindow({ ...base, localMinutes: 540, lastSentOn: null })).toBe(
      true,
    )
    expect(
      isSendWindow({ ...base, localMinutes: 1000, lastSentOn: '2026-11-10' }),
    ).toBe(true) // catch-up
  })
  it('is closed once sent today', () => {
    expect(
      isSendWindow({ ...base, localMinutes: 600, lastSentOn: '2026-11-11' }),
    ).toBe(false)
  })
})
describe('decideForUser', () => {
  const now = new Date('2026-11-11T14:05:00Z') // 09:05 New York, Wednesday
  const user = {
    reminderTime: '09:00:00',
    timezone: 'America/New_York',
    lastSentOn: null,
    enabledOn: '2026-11-02',
    now,
  }
  it('sends with the business-day body when lapsed', () => {
    expect(decideForUser({ ...user, latestPtDate: '2026-11-06' })).toEqual({
      send: true,
      reason: 'send',
      localDate: '2026-11-11',
      title: 'PT exercises',
      body: "It's been 3 business days since your last PT session. A few minutes today keeps you on track.",
    })
  })
  it('uses enabledOn and the never-done body when no PT row exists', () => {
    expect(decideForUser({ ...user, latestPtDate: null }).body).toBe(
      'No PT logged yet — a few minutes today keeps you on track.',
    )
    expect(
      decideForUser({ ...user, latestPtDate: null, enabledOn: '2026-11-10' })
        .reason,
    ).toBe('not-lapsed')
  })
  it('reports not-time, already-sent and not-lapsed', () => {
    expect(
      decideForUser({
        ...user,
        latestPtDate: '2026-11-06',
        now: new Date('2026-11-11T13:00:00Z'),
      }).reason,
    ).toBe('not-time')
    expect(
      decideForUser({
        ...user,
        latestPtDate: '2026-11-06',
        lastSentOn: '2026-11-11',
      }).reason,
    ).toBe('already-sent')
    expect(decideForUser({ ...user, latestPtDate: '2026-11-10' }).reason).toBe(
      'not-lapsed',
    )
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run supabase/functions/_shared`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement `supabase/functions/_shared/ptReminder.ts`**

Pure TypeScript, zero imports (Deno imports it too). Date math on `YYYY-MM-DD` strings via `Date.UTC` components, never `toISOString()` on local dates. `localDateAndMinutes` uses `Intl.DateTimeFormat(undefined, { timeZone, hourCycle: 'h23', year/month/day/hour/minute: '2-digit'/'numeric' }).formatToParts`, wrapped in try/catch that retries with `'UTC'`.

- [ ] **Step 5: Add the folder to type checking**

`tsconfig.json`: `"include": ["src", "supabase/functions/_shared"]`.

- [ ] **Step 6: Run tests, typecheck, lint**

Run: `npx vitest run supabase/functions/_shared && npm run typecheck && npm run lint`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/_shared tsconfig.json vite.config.ts package.json package-lock.json
git commit -m "Add shared PT reminder decision logic and coverage tooling"
```

---

### Task 2: Database migration and schema mirror

**Files:**

- Create: `supabase/migrations/0007_pt_reminders.sql`
- Modify: `supabase/schema.sql` (profiles columns, new table, RLS, commented cron block)

**Interfaces:**

- Produces: `profiles.pt_reminder_time time not null default '09:00'`, `profiles.timezone text`, `profiles.pt_reminders_enabled_on date`, `profiles.pt_reminder_last_sent_on date`; table `public.push_subscriptions (id uuid pk default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, endpoint text not null unique, p256dh text not null, auth text not null, created_at timestamptz not null default now())`; index `push_subscriptions_user_idx (user_id)`.
- No test: SQL run by hand in the Supabase editor; it is exercised by Tasks 5 and 7 against the real project. This is the "generated/config" exception from the working rules.

- [ ] **Step 1: Write the migration**

Same header style as `0006_workouts.sql` ("Safe to re-run"). `alter table ... add column if not exists` for the four profile columns. `create table if not exists public.push_subscriptions`, index, `enable row level security`, then `drop policy if exists` + `create policy` for `"Read own push subscriptions"` (select, `auth.uid() = user_id`), `"Insert own push subscriptions"` (insert with check), `"Delete own push subscriptions"` (delete). No update policy. No admin read.

Append a commented block, clearly labelled "run once per project, by hand":

```sql
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
```

- [ ] **Step 2: Mirror into `schema.sql`**

Add the four columns to the `create table public.profiles` definition and as `add column if not exists` lines in the upgrade block; add the table after `workout_sets`; add `enable row level security` and the three policies in the RLS section; append the same commented cron block at the end.

- [ ] **Step 3: Sanity-check the SQL parses**

Run: `npx prettier --check . && git diff --stat`
Expected: Prettier passes (it ignores `.sql`); the diff touches only the two files. Read both files once for unbalanced quotes or a missing semicolon.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0007_pt_reminders.sql supabase/schema.sql
git commit -m "Add push_subscriptions table and PT reminder profile columns"
```

---

### Task 3: Service-worker push handler and build config

**Files:**

- Create: `public/push-sw.js`
- Create: `src/sw/push-sw.test.ts`
- Modify: `vite.config.ts` (`VitePWA({ workbox: { importScripts: ['push-sw.js'] } })`)
- Modify: `eslint.config.js` (override for `public/push-sw.js` with `globals.serviceworker`; `files` pattern must include `.js` for that path)
- Modify: `src/vite-env.d.ts` (`readonly VITE_VAPID_PUBLIC_KEY?: string`)
- Modify: `.env.example` (`VITE_VAPID_PUBLIC_KEY=` with a comment pointing at `npx web-push generate-vapid-keys`)
- Modify: `.github/workflows/deploy.yml` (`VITE_VAPID_PUBLIC_KEY: ${{ secrets.VITE_VAPID_PUBLIC_KEY }}` in the build env block)

**Interfaces:**

- Consumes: push payload JSON `{ title: string; body: string; tag: string }` (sent by Task 7).
- Produces: a `push` listener calling `self.registration.showNotification(title, { body, tag, icon, data: { url } })` with `icon = new URL('pwa-192x192.png', self.registration.scope).href` and `url = self.registration.scope`; a `notificationclick` listener that closes the notification, focuses the first client from `clients.matchAll({ type: 'window', includeUncontrolled: true })` whose URL starts with the scope, else `clients.openWindow(url)`.

- [ ] **Step 1: Write the failing test**

`src/sw/push-sw.test.ts`: before importing, install fakes on `self`: `registration = { scope: 'https://example.test/carb/', showNotification: vi.fn().mockResolvedValue(undefined) }`, `clients = { matchAll: vi.fn(), openWindow: vi.fn() }`, and spy `self.addEventListener` so each registered listener lands in `const handlers = new Map<string, (e: unknown) => void>()`. Then `await import('../../public/push-sw.js')`.

```ts
it('shows a notification from the push payload', async () => {
  const waitUntil = vi.fn()
  handlers.get('push')!({ data: { json: () => ({ title: 'PT exercises', body: 'B', tag: 'pt-reminder' }) }, waitUntil })
  await waitUntil.mock.calls[0][0]
  expect(self.registration.showNotification).toHaveBeenCalledWith('PT exercises', {
    body: 'B', tag: 'pt-reminder',
    icon: 'https://example.test/carb/pwa-192x192.png',
    data: { url: 'https://example.test/carb/' },
  })
})
it('falls back to the default title when the payload is empty', ...) // data: null → title 'PT exercises'
it('focuses an open window on click, else opens one', async () => {
  const focus = vi.fn()
  clients.matchAll.mockResolvedValue([{ url: 'https://example.test/carb/', focus }])
  handlers.get('notificationclick')!({ notification: { close: vi.fn(), data: { url: 'https://example.test/carb/' } }, waitUntil })
  await waitUntil.mock.calls.at(-1)[0]
  expect(focus).toHaveBeenCalled()
  clients.matchAll.mockResolvedValue([])
  // dispatch again → expect(clients.openWindow).toHaveBeenCalledWith('https://example.test/carb/')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sw`
Expected: FAIL, cannot find `public/push-sw.js`.

- [ ] **Step 3: Implement `public/push-sw.js`**

Plain script, no imports/exports, two `self.addEventListener` calls as in Interfaces. `event.data` may be null; `json()` may throw, treat as `{}`.

- [ ] **Step 4: Wire the build and lint config**

`vite.config.ts`: add `workbox: { importScripts: ['push-sw.js'] }` inside `VitePWA({...})`. `eslint.config.js`: the main block only matches `**/*.{ts,tsx}`, so add a self-contained block `{ files: ['public/push-sw.js'], extends: [js.configs.recommended], languageOptions: { globals: globals.serviceworker } }` and confirm `npx eslint public/push-sw.js` lints it. Add the env typing, `.env.example` line and `deploy.yml` env line.

- [ ] **Step 5: Verify**

Run: `npx vitest run src/sw && npm run lint && npm run typecheck && npm run build && grep -c "push-sw.js" dist/sw.js`
Expected: tests PASS; build succeeds; grep prints `1` (the generated service worker imports the script).

- [ ] **Step 6: Commit**

```bash
git add public/push-sw.js src/sw vite.config.ts eslint.config.js src/vite-env.d.ts .env.example .github/workflows/deploy.yml
git commit -m "Add service-worker push handler and VAPID public key config"
```

Note: pushing `.github/workflows` from this machine needs `gh auth refresh -s workflow` (see memory). If the push is rejected, drop the workflow change from the commit and list it in the PR body as a one-line manual edit.

---

### Task 4: Browser push adapter

**Files:**

- Create: `src/lib/push.ts`
- Create: `src/lib/push.test.ts`

**Interfaces:**

- Produces:
  - `export const VAPID_PUBLIC_KEY: string | undefined` (from `import.meta.env.VITE_VAPID_PUBLIC_KEY`)
  - `isPushConfigured(): boolean`
  - `isPushSupported(): boolean` — `'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window`
  - `urlBase64ToUint8Array(base64: string): Uint8Array`
  - `type PushSubscriptionRow = { endpoint: string; p256dh: string; auth: string }`
  - `toSubscriptionRow(sub: PushSubscription): PushSubscriptionRow` — from `sub.toJSON()`; throws `Error('Subscription has no keys')` if keys missing.
  - `getCurrentPushSubscription(): Promise<PushSubscription | null>` — `navigator.serviceWorker.ready` → `pushManager.getSubscription()`.
  - `class PushPermissionDeniedError extends Error`
  - `subscribeToPush(publicKey: string): Promise<PushSubscription>` — `Notification.requestPermission()`; not `'granted'` → throw `PushPermissionDeniedError`; else `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })`.
  - `unsubscribeFromPush(): Promise<void>` — unsubscribe current subscription if any.

- [ ] **Step 1: Write the failing tests**

```ts
it('decodes URL-safe base64 into bytes', () => {
  expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3])
  expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255]) // '-' '_' and padding
})
it('reports unsupported in a bare jsdom', () => {
  expect(isPushSupported()).toBe(false)
})
it('maps a subscription to a row', () => {
  const sub = {
    toJSON: () => ({
      endpoint: 'https://p/1',
      keys: { p256dh: 'K', auth: 'A' },
    }),
  } as unknown as PushSubscription
  expect(toSubscriptionRow(sub)).toEqual({
    endpoint: 'https://p/1',
    p256dh: 'K',
    auth: 'A',
  })
})
it('throws PushPermissionDeniedError when permission is denied', async () => {
  vi.stubGlobal('Notification', {
    requestPermission: vi.fn().mockResolvedValue('denied'),
  })
  await expect(subscribeToPush('AQID')).rejects.toBeInstanceOf(
    PushPermissionDeniedError,
  )
})
it('subscribes with the decoded VAPID key when granted', async () => {
  const subscribe = vi.fn().mockResolvedValue({ endpoint: 'e' })
  vi.stubGlobal('Notification', {
    requestPermission: vi.fn().mockResolvedValue('granted'),
  })
  vi.stubGlobal('navigator', {
    serviceWorker: { ready: Promise.resolve({ pushManager: { subscribe } }) },
  })
  await subscribeToPush('AQID')
  expect(subscribe).toHaveBeenCalledWith({
    userVisibleOnly: true,
    applicationServerKey: expect.any(Uint8Array),
  })
})
```

Use `afterEach(() => vi.unstubAllGlobals())`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/push`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/push.ts`** per Interfaces.

- [ ] **Step 4: Run tests, lint, typecheck**

Run: `npx vitest run src/lib/push && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/push.ts src/lib/push.test.ts
git commit -m "Add browser push subscription adapter"
```

---

### Task 5: Reminder store (Supabase access) and `usePtReminders` hook

**Files:**

- Create: `src/lib/ptReminderStore.ts`
- Create: `src/lib/ptReminderStore.test.ts`
- Create: `src/hooks/usePtReminders.ts`
- Create: `src/hooks/usePtReminders.test.ts`

**Interfaces:**

- Consumes: Task 4's `push.ts` exports; `supabase` from `src/lib/supabase.ts`; `todayISO` from `src/lib/dates.ts`.
- Produces (store, every function takes `client: SupabaseClient` first):
  - `loadPtReminderState(client, userId: string, endpoint: string | null): Promise<{ time: string; thisDeviceEnabled: boolean }>` — `time` from `profiles.pt_reminder_time` trimmed to `HH:MM`, default `'09:00'` when the profile row or column is null; `thisDeviceEnabled` true when a `push_subscriptions` row with that endpoint exists for the user.
  - `addPushSubscription(client, userId, row: PushSubscriptionRow, timezone: string, todayIso: string): Promise<void>` — `upsert({ user_id, ...row }, { onConflict: 'endpoint' })`; then `upsert` `profiles` with `{ id: userId, timezone, updated_at }`; then `update({ pt_reminders_enabled_on: todayIso }).eq('id', userId).is('pt_reminders_enabled_on', null)` so only the first subscription anchors and a re-enable on the same device never re-anchors.
  - `removePushSubscription(client, userId, endpoint: string): Promise<void>` — delete by `user_id` and `endpoint`; if the user's remaining count is 0, set `pt_reminders_enabled_on: null`.
  - `savePtReminderTime(client, userId, time: string, timezone: string): Promise<void>` — upsert `profiles` with `pt_reminder_time: time, timezone, updated_at`.
- Produces (hook):
  - `type PtRemindersState = { supported: boolean; configured: boolean; enabled: boolean; time: string; loading: boolean; busy: boolean; error: string | null; enable: () => Promise<void>; disable: () => Promise<void>; saveTime: (time: string) => Promise<void> }`
  - `usePtReminders(userId: string | undefined): PtRemindersState`
  - Error copy from Global Constraints: `!configured` → `Reminders are not configured for this deployment`; `!supported` → `Install the app to your home screen first`; `PushPermissionDeniedError` → `Notifications are blocked for this app in your phone settings`; anything else → `error.message`.
  - Time zone: `Intl.DateTimeFormat().resolvedOptions().timeZone`.

- [ ] **Step 1: Write the failing store tests**

Build a small chainable fake in the test file: `fakeClient(responses)` whose `from(table)` returns an object where `select/eq/upsert/update/delete/maybeSingle/limit` each record the call and return the chain, and which is thenable, resolving to the next queued `{ data, error, count }` for that table. Assert on the recorded calls.

```ts
it('loads time and this-device state', async () => {
  /* profile pt_reminder_time '09:30:00', endpoint row present → { time: '09:30', thisDeviceEnabled: true } */
})
it('defaults the time and reports disabled without an endpoint', async () => {
  /* null profile, endpoint null → { time: '09:00', thisDeviceEnabled: false }, no push_subscriptions query */
})
it('anchors enabled_on only where it is still null', async () => {
  /* update called with { pt_reminders_enabled_on: '2026-11-11' } followed by .eq('id', userId) and .is('pt_reminders_enabled_on', null); profiles upsert carries timezone */
})
it('upserts on endpoint so re-enabling the same device is idempotent', async () => {
  /* push_subscriptions upsert called with { user_id, endpoint, p256dh, auth } and { onConflict: 'endpoint' } */
})
it('clears enabled_on when the last subscription is removed', async () => {
  /* delete then count 0 → update pt_reminders_enabled_on null; count 1 → no update */
})
it('saves the reminder time with the zone', async () => {
  /* upsert { id, pt_reminder_time: '08:15', timezone: 'Europe/London', updated_at: any } */
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/lib/ptReminderStore`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/ptReminderStore.ts`** per Interfaces; `select('*', { count: 'exact', head: true })` for counts.

- [ ] **Step 4: Run store tests to verify they pass**

Run: `npx vitest run src/lib/ptReminderStore`
Expected: PASS.

- [ ] **Step 5: Write the failing hook tests**

`vi.mock('../lib/supabase', () => ({ supabase: {} }))`, `vi.mock('../lib/push')`, `vi.mock('../lib/ptReminderStore')`. Use `renderHook` + `act` + `waitFor` from Testing Library.

```ts
it('reports unsupported and unconfigured without touching the store', ...) // isPushSupported → false, VAPID_PUBLIC_KEY undefined
it('loads state for the current device subscription', ...) // getCurrentPushSubscription → { toJSON } with endpoint 'e1'; loadPtReminderState → { time: '09:30', thisDeviceEnabled: true }; expect enabled true, time '09:30'
it('enable subscribes, stores the row and flips enabled', ...) // subscribeToPush resolves; addPushSubscription called with userId, row, zone, todayISO(); enabled true; error null
it('enable with denied permission leaves enabled false with the blocked message', ...) // subscribeToPush rejects PushPermissionDeniedError
it('enable when unsupported sets the home-screen message', ...)
it('enable when unconfigured sets the not-configured message', ...)
it('disable unsubscribes and removes only this device row', ...) // removePushSubscription called with 'e1'; enabled false
it('saveTime persists and updates state', ...) // savePtReminderTime called with '08:15' and the zone; time becomes '08:15'
it('a browser subscription with no DB row shows disabled, and enable writes the row', ...) // loadPtReminderState → thisDeviceEnabled false; enable → subscribeToPush still called, addPushSubscription called
```

- [ ] **Step 6: Run to verify they fail**

Run: `npx vitest run src/hooks/usePtReminders`
Expected: FAIL, module not found.

- [ ] **Step 7: Implement `src/hooks/usePtReminders.ts`**

Load effect keyed on `userId` (skip when `!supabase || !userId`, set `loading` false). `enable`/`disable`/`saveTime` set `busy` around the awaited store call and translate errors as in Interfaces. Guard `supabase` null the same way `useProfile` does.

- [ ] **Step 8: Run all tests, lint, typecheck**

Run: `npm test && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/ptReminderStore.ts src/lib/ptReminderStore.test.ts src/hooks/usePtReminders.ts src/hooks/usePtReminders.test.ts
git commit -m "Add PT reminder store and usePtReminders hook"
```

---

### Task 6: Settings section and App wiring

**Files:**

- Create: `src/components/PtReminderSettings.tsx`
- Create: `src/components/PtReminderSettings.test.tsx`
- Modify: `src/components/Settings.tsx` (new prop `ptReminders: PtRemindersState`; render `<PtReminderSettings {...ptReminders} />` directly after the "Weekly PT exercises goal" section)
- Modify: `src/App.tsx:~96` (call `usePtReminders(userId)`; pass `ptReminders` to `<Settings>` at `src/App.tsx:~304`)
- Modify: `src/index.css` (only if a new class is needed; reuse `settings__section`, `field`, `settings__hint`)

**Interfaces:**

- Consumes: `PtRemindersState` from Task 5.
- Produces: `PtReminderSettings(props: PtRemindersState)` rendering a `<section className="settings__section">` with `<h3>PT reminders</h3>`.

- [ ] **Step 1: Write the failing component tests**

Render with a `makeState(overrides)` helper defaulting to `{ supported: true, configured: true, enabled: false, time: '09:00', loading: false, busy: false, error: null, enable: vi.fn(), disable: vi.fn(), saveTime: vi.fn() }`.

```ts
it('renders the toggle unchecked with no time input when off', () => {
  // getByRole('checkbox', { name: "Remind me when I've missed PT for 2 business days" }) not checked
  // queryByLabelText('Reminder time') is null
})
it('calls enable when the toggle is switched on', async () => { /* click → enable called once */ })
it('shows status, time input and calls disable when on', async () => {
  // enabled true → text 'Reminders on for this device.'; getByLabelText('Reminder time') has value '09:00'; click toggle → disable called
})
it('saves a changed time on blur/change', async () => { /* fireEvent.change to '08:15' → saveTime('08:15') */ })
it('shows the error message under the toggle', () => { /* error 'Install the app to your home screen first' visible */ })
it('shows the not-configured message and disables the toggle when unconfigured', () => { /* configured false → text 'Reminders are not configured for this deployment'; checkbox disabled */ })
it('disables the toggle while busy', ...)
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/components/PtReminderSettings`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `PtReminderSettings.tsx`**

Checkbox `<input type="checkbox">` inside a `<label className="field">` so the label text is its accessible name. Time input `<input type="time" step="900">` labelled `Reminder time`, shown only when `enabled`; `onChange` calls `saveTime(e.target.value)` when the value is non-empty. Error in `<p className="settings__hint" role="alert">`.

- [ ] **Step 4: Wire `Settings.tsx` and `App.tsx`**

Add the prop and render; in `App.tsx` call the hook next to the other hooks and pass it down. Update any existing Settings render in tests if one exists (none today).

- [ ] **Step 5: Run everything and look at it**

Run: `npm test && npm run lint && npm run typecheck && npm run build`
Expected: PASS. Then `npm run dev`, open Settings, confirm the section sits under the PT goal and the toggle shows "Reminders are not configured for this deployment" when `.env.local` has no VAPID key.

- [ ] **Step 6: Commit**

```bash
git add src/components/PtReminderSettings.tsx src/components/PtReminderSettings.test.tsx src/components/Settings.tsx src/App.tsx src/index.css
git commit -m "Add PT reminders section to Settings"
```

---

### Task 7: Edge Function, Supabase project config and README

**Files:**

- Create: `supabase/functions/pt-reminder/index.ts`
- Create: `supabase/config.toml`
- Modify: `eslint.config.js` (override `files: ['supabase/functions/**/*.ts']` adding `globals: { Deno: 'readonly' }`)
- Modify: `README.md` (new section "PT reminders (push notifications)" after "Features"/setup; add a Features bullet)

**Interfaces:**

- Consumes: `decideForUser`, `ReminderDecision` from `../_shared/ptReminder.ts` (import with the `.ts` extension for Deno).
- Produces: HTTP handler via `Deno.serve`. Response JSON `{ checked: number; sent: number; results: Array<{ userId: string; decision: ReminderDecision; delivered?: number; removed?: number }> }`. In `dry_run` mode nothing is sent or written.
- Not unit tested in Vitest (Deno runtime, network). The decision logic it calls is covered by Task 1; the function is kept to I/O. Manual check in Step 4.

- [ ] **Step 1: Write `index.ts`**

```ts
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { decideForUser } from '../_shared/ptReminder.ts'
```

Flow per spec: read the `authorization` header; unless it equals the string `Bearer ` followed by `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`, respond 401 and stop. `webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)`. Query `push_subscriptions` for all rows, group by `user_id`; load those users' `profiles` (`id, pt_reminder_time, timezone, pt_reminders_enabled_on, pt_reminder_last_sent_on`); for each, latest `pt_days.entry_date` (`order desc, limit 1`); `decideForUser`. When `send` and not dry run: `sendNotification(subscription, JSON.stringify({ title, body, tag: 'pt-reminder' }))` per row; on `statusCode` 404/410 delete that row; then update `pt_reminder_last_sent_on = decision.localDate`. Log one line per user with `reason`.

- [ ] **Step 2: Add `supabase/config.toml`**

```toml
project_id = "carb-tracker"

[functions.pt-reminder]
verify_jwt = true
```

- [ ] **Step 3: Lint config and README**

ESLint override as in Files. README section with the six owner steps from the spec, the `cron.schedule` note pointing at the commented block in migration 0007, the secrets to set (`supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:...`), and the manual check:

```bash
curl -H "Authorization: Bearer $SERVICE_ROLE_KEY" "https://<ref>.supabase.co/functions/v1/pt-reminder?dry_run=1"
```

Add a Features bullet: "**PT reminders** — opt-in push notification when PT exercises slip for more than two business days."

- [ ] **Step 4: Verify**

Run: `npm run lint && npm run typecheck && npx prettier --check .`
Expected: PASS (the function file is linted, not type-checked by `tsc`, since Deno specifiers are not resolvable there). If `deno` is installed: `deno check supabase/functions/pt-reminder/index.ts` should pass; if not, note that in the PR body.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/pt-reminder supabase/config.toml eslint.config.js README.md
git commit -m "Add pt-reminder Edge Function and setup docs"
```

---

### Task 8: Coverage, PR and review passes

**Files:** none new.

- [ ] **Step 1: Full verification**

Run: `npm run format:check && npm run lint && npm run typecheck && npm run test:coverage && npm run build`
Expected: all PASS. Record the total line coverage. If below 80%, add tests to the lowest-covered new file before continuing; if the shortfall is in pre-existing files, say so explicitly in the PR body with the number.

- [ ] **Step 2: Push and open the PR**

Write the PR body to a file in the scratchpad directory, then:

```bash
git push -u origin feat/pt-reminder-push
gh pr create --title "Add PT reminder push notifications" --body-file <path-to-body>
```

Body: what it does, the one-time owner setup checklist (link README section), the coverage number, the Deno typecheck note, and whether the workflow file change had to be left out.

- [ ] **Step 3: Review passes per working rules**

Run `/code-review`, `/security-review`, report coverage, and the Karen check against the spec's Goals list, citing file:line for each. Report every finding; fix correctness findings on the branch before calling the PR ready.
