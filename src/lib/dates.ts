/**
 * Date helpers that work in the user's *local* calendar.
 *
 * We deliberately avoid `Date.toISOString()` for calendar dates because it
 * converts to UTC and can shift the day across midnight. Instead we build and
 * parse `YYYY-MM-DD` strings from local date components.
 */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Format a Date as a local `YYYY-MM-DD` string. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Today's local calendar date as `YYYY-MM-DD`. */
export function todayISO(now: Date = new Date()): string {
  return toISODate(now)
}

/** Parse a `YYYY-MM-DD` string into a local Date at midnight. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Return the ISO date `days` away from `iso` (negative goes backwards). */
export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/**
 * The last `n` calendar days ending at `endIso` (inclusive), oldest first.
 * e.g. lastNDays(7) -> [6 days ago, ..., yesterday, today]
 */
export function lastNDays(n: number, endIso: string = todayISO()): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    out.push(addDays(endIso, -i))
  }
  return out
}

/** Short weekday label, e.g. "Mon". */
export function weekdayLabel(iso: string): string {
  return WEEKDAYS[parseISODate(iso).getDay()]
}

/** Compact label for charts/lists, e.g. "Mon 6/18". */
export function formatShort(iso: string): string {
  const d = parseISODate(iso)
  return `${WEEKDAYS[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`
}

/** Human friendly label, e.g. "Wednesday, June 18". Locale-aware. */
export function formatLong(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * "Today" / "Yesterday" for the two most recent days, otherwise the full
 * long-form date. Used as the heading when browsing days.
 */
export function relativeDayLabel(
  iso: string,
  today: string = todayISO(),
): string {
  if (iso === today) return 'Today'
  if (iso === addDays(today, -1)) return 'Yesterday'
  return formatLong(iso)
}
