// Pure decision logic for PT reminder pushes. Shared by Vitest and the Deno
// Edge Function, so it must have no imports and use only standard ECMAScript
// plus Intl. Dates are YYYY-MM-DD strings.

function utcDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

const DAY_MS = 86_400_000

export function isWeekday(iso: string): boolean {
  const dow = new Date(utcDay(iso)).getUTCDay()
  return dow !== 0 && dow !== 6
}

/** Weekdays d with anchor < d < date. */
export function businessDaysBetween(
  anchorIso: string,
  dateIso: string,
): number {
  const start = utcDay(anchorIso)
  const end = utcDay(dateIso)
  let count = 0
  for (let t = start + DAY_MS; t < end; t += DAY_MS) {
    const dow = new Date(t).getUTCDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return count
}

/** Business days since the anchor, counting today when it is a weekday. */
export function missedBusinessDays(
  anchorIso: string,
  todayIso: string,
): number {
  return (
    businessDaysBetween(anchorIso, todayIso) + (isWeekday(todayIso) ? 1 : 0)
  )
}

export function shouldRemind(anchorIso: string, todayIso: string): boolean {
  return anchorIso !== todayIso && businessDaysBetween(anchorIso, todayIso) >= 2
}

/** `null` means there is no prior PT row. */
export function reminderBody(missed: number | null): string {
  if (missed === null) {
    return 'No PT logged yet — a few minutes today keeps you on track.'
  }
  return `It's been ${missed} business days since your last PT session. A few minutes today keeps you on track.`
}

/** Accepts `HH:MM` and `HH:MM:SS`; anything malformed becomes 09:00. */
export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 540
  return h * 60 + m
}

function formatParts(now: Date, timeZone: string): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(now)
}

/** Local date and minutes-since-midnight in `timezone` (null/invalid → UTC). */
export function localDateAndMinutes(
  now: Date,
  timezone: string | null,
): { dateIso: string; minutes: number } {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = formatParts(now, timezone ?? 'UTC')
  } catch {
    parts = formatParts(now, 'UTC')
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0'
  // Some engines report midnight as hour 24 even with h23; normalise to 0.
  const hour = Number(get('hour')) % 24
  return {
    dateIso: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: hour * 60 + Number(get('minute')),
  }
}

export type ReminderDecision = {
  send: boolean
  reason: 'not-time' | 'already-sent' | 'not-lapsed' | 'no-anchor' | 'send'
  localDate: string
  title?: string
  body?: string
}

export function decideForUser(input: {
  latestPtDate: string | null
  enabledOn: string | null
  reminderTime: string
  timezone: string | null
  lastSentOn: string | null
  now: Date
}): ReminderDecision {
  const { dateIso: localDate, minutes } = localDateAndMinutes(
    input.now,
    input.timezone,
  )
  if (minutes < parseTimeToMinutes(input.reminderTime)) {
    return { send: false, reason: 'not-time', localDate }
  }
  if (input.lastSentOn !== null && input.lastSentOn >= localDate) {
    return { send: false, reason: 'already-sent', localDate }
  }
  const anchor = input.latestPtDate ?? input.enabledOn
  if (anchor === null) {
    return { send: false, reason: 'no-anchor', localDate }
  }
  if (!shouldRemind(anchor, localDate)) {
    return { send: false, reason: 'not-lapsed', localDate }
  }
  return {
    send: true,
    reason: 'send',
    localDate,
    title: 'PT exercises',
    body: reminderBody(
      input.latestPtDate ? missedBusinessDays(anchor, localDate) : null,
    ),
  }
}
