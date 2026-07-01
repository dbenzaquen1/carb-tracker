import { roundCarbs } from './carbs'
import { lastNDays, parseISODate, startOfWeekSunday } from './dates'
import { dailyTotals } from './metrics'
import type { Entry } from '../types'

export interface ChartBar {
  key: string
  /** X-axis label; may be '' to skip (keeps dense daily charts readable). */
  label: string
  /** Carbs (g) — a daily total, or an average carbs/day for week/month buckets. */
  value: number
  /** True when the bucket has no logged days. */
  empty: boolean
  tooltip: string
}

export type BucketMode = 'day' | 'week' | 'month'

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function monthDay(iso: string): string {
  const d = parseISODate(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** Bar granularity for a period: daily short-term, weekly/monthly for longer. */
export function bucketModeFor(periodDays: number): BucketMode {
  if (periodDays <= 31) return 'day'
  if (periodDays <= 100) return 'week'
  return 'month'
}

/**
 * Build chart bars for the given period. Short periods show daily totals; longer
 * ones aggregate into weekly or monthly buckets whose value is the average
 * carbs per logged day (so it stays comparable to the daily goal line).
 */
export function chartBars(
  entries: Entry[],
  periodDays: number,
  today: string,
): ChartBar[] {
  const daily = dailyTotals(entries, lastNDays(periodDays, today))
  const mode = bucketModeFor(periodDays)

  if (mode === 'day') {
    return daily.map((d) => ({
      key: d.date,
      // Only label week starts (Sundays) so many bars don't collide.
      label: parseISODate(d.date).getDay() === 0 ? monthDay(d.date) : '',
      value: d.total,
      empty: d.count === 0,
      tooltip: `${d.date}: ${d.total} g`,
    }))
  }

  const buckets = new Map<
    string,
    { start: string; sum: number; logged: number; order: number }
  >()
  let order = 0
  for (const d of daily) {
    const key = mode === 'week' ? startOfWeekSunday(d.date) : d.date.slice(0, 7)
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = {
        start: mode === 'week' ? key : `${key}-01`,
        sum: 0,
        logged: 0,
        order: order++,
      }
      buckets.set(key, bucket)
    }
    bucket.sum += d.total
    if (d.count > 0) bucket.logged += 1
  }

  return [...buckets.values()]
    .sort((a, b) => a.order - b.order)
    .map((bucket) => {
      const value =
        bucket.logged > 0 ? roundCarbs(bucket.sum / bucket.logged) : 0
      const monthName = MONTHS[parseISODate(bucket.start).getMonth()]
      const label = mode === 'week' ? monthDay(bucket.start) : monthName
      const tooltip =
        mode === 'week'
          ? `Week of ${monthDay(bucket.start)}: ${value} g/day avg`
          : `${monthName}: ${value} g/day avg`
      return {
        key: bucket.start,
        label,
        value,
        empty: bucket.logged === 0,
        tooltip,
      }
    })
}
