import type { Entry } from '../types'
import { roundCarbs, sumCarbs } from './carbs'

export interface DayTotal {
  date: string
  total: number
  /** Number of entries logged that day. */
  count: number
}

/**
 * Carb totals for each date in `days`, in the same order. Days with no entries
 * get a total of 0 and a count of 0, so charts have a value for every day.
 */
export function dailyTotals(entries: Entry[], days: string[]): DayTotal[] {
  const byDate = new Map<string, Entry[]>()
  for (const e of entries) {
    const list = byDate.get(e.entry_date)
    if (list) list.push(e)
    else byDate.set(e.entry_date, [e])
  }
  return days.map((date) => {
    const dayEntries = byDate.get(date) ?? []
    return { date, total: sumCarbs(dayEntries), count: dayEntries.length }
  })
}

/** Mean of a list of numbers, rounded to one decimal. 0 when empty. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return roundCarbs(values.reduce((a, b) => a + b, 0) / values.length)
}

/** Number of days that have at least one entry. */
export function loggedDayCount(daily: DayTotal[]): number {
  return daily.filter((d) => d.count > 0).length
}

/**
 * Average carbs across only the days that were actually logged. Days with no
 * entries are excluded so a few un-logged days don't deflate the average.
 */
export function averagePerLoggedDay(daily: DayTotal[]): number {
  const logged = daily.filter((d) => d.count > 0)
  return mean(logged.map((d) => d.total))
}

/** Count of logged days whose total exceeded the goal. */
export function daysOverGoal(daily: DayTotal[], goal: number): number {
  return daily.filter((d) => d.count > 0 && d.total > goal).length
}

/** Count of logged days whose total was at or under the goal. */
export function daysWithinGoal(daily: DayTotal[], goal: number): number {
  return daily.filter((d) => d.count > 0 && d.total <= goal).length
}

/** The logged day with the highest total, or null if nothing is logged. */
export function highestDay(daily: DayTotal[]): DayTotal | null {
  const logged = daily.filter((d) => d.count > 0)
  if (logged.length === 0) return null
  return logged.reduce((max, d) => (d.total > max.total ? d : max))
}
