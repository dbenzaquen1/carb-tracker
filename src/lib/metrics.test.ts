import { describe, it, expect } from 'vitest'
import type { Entry, Meal } from '../types'
import {
  averagePerLoggedDay,
  dailyTotals,
  daysOverGoal,
  daysWithinGoal,
  highestDay,
  loggedDayCount,
  mean,
} from './metrics'

let counter = 0
function entry(date: string, carbs: number, meal: Meal = 'snack'): Entry {
  counter += 1
  return {
    id: `e${counter}`,
    user_id: 'u1',
    entry_date: date,
    meal,
    name: 'food',
    carbs,
    created_at: `${date}T00:00:00Z`,
  }
}

const DAYS = ['2026-06-16', '2026-06-17', '2026-06-18']

describe('dailyTotals', () => {
  it('produces a total for every requested day in order', () => {
    const entries = [
      entry('2026-06-16', 50),
      entry('2026-06-16', 25),
      entry('2026-06-18', 100),
    ]
    expect(dailyTotals(entries, DAYS)).toEqual([
      { date: '2026-06-16', total: 75, count: 2 },
      { date: '2026-06-17', total: 0, count: 0 },
      { date: '2026-06-18', total: 100, count: 1 },
    ])
  })

  it('ignores entries outside the requested window', () => {
    const entries = [entry('2026-01-01', 999), entry('2026-06-17', 30)]
    const totals = dailyTotals(entries, DAYS)
    expect(totals.map((d) => d.total)).toEqual([0, 30, 0])
  })
})

describe('mean', () => {
  it('returns 0 for an empty list', () => {
    expect(mean([])).toBe(0)
  })

  it('averages and rounds to one decimal', () => {
    expect(mean([10, 20, 30])).toBe(20)
    expect(mean([10, 11])).toBe(10.5)
    expect(mean([1, 1, 2])).toBe(1.3)
  })
})

describe('logged-day aggregates', () => {
  const daily = dailyTotals(
    [entry('2026-06-16', 100), entry('2026-06-18', 200)],
    DAYS,
  )

  it('counts only days with entries', () => {
    expect(loggedDayCount(daily)).toBe(2)
  })

  it('averages only over logged days (skips the empty middle day)', () => {
    // (100 + 200) / 2 logged days = 150, not /3.
    expect(averagePerLoggedDay(daily)).toBe(150)
  })

  it('returns 0 average when nothing is logged', () => {
    expect(averagePerLoggedDay(dailyTotals([], DAYS))).toBe(0)
  })
})

describe('goal comparisons', () => {
  const daily = dailyTotals(
    [
      entry('2026-06-16', 120),
      entry('2026-06-17', 150),
      entry('2026-06-18', 200),
    ],
    DAYS,
  )

  it('counts days over the goal', () => {
    expect(daysOverGoal(daily, 150)).toBe(1)
  })

  it('counts days at or within the goal', () => {
    expect(daysWithinGoal(daily, 150)).toBe(2)
  })
})

describe('highestDay', () => {
  it('returns the logged day with the most carbs', () => {
    const daily = dailyTotals(
      [entry('2026-06-16', 120), entry('2026-06-18', 200)],
      DAYS,
    )
    expect(highestDay(daily)).toEqual({
      date: '2026-06-18',
      total: 200,
      count: 1,
    })
  })

  it('returns null when nothing is logged', () => {
    expect(highestDay(dailyTotals([], DAYS))).toBeNull()
  })
})
