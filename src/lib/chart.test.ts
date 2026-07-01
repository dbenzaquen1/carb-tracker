import { describe, it, expect } from 'vitest'
import type { Entry } from '../types'
import { bucketModeFor, chartBars } from './chart'

let counter = 0
function entry(date: string, carbs: number): Entry {
  counter += 1
  return {
    id: `e${counter}`,
    user_id: 'u',
    entry_date: date,
    meal: 'snack',
    name: 'food',
    carbs,
    created_at: `${date}T00:00:00Z`,
  }
}

describe('bucketModeFor', () => {
  it('picks day / week / month by period length', () => {
    expect(bucketModeFor(30)).toBe('day')
    expect(bucketModeFor(31)).toBe('day')
    expect(bucketModeFor(32)).toBe('week')
    expect(bucketModeFor(90)).toBe('week')
    expect(bucketModeFor(100)).toBe('week')
    expect(bucketModeFor(101)).toBe('month')
    expect(bucketModeFor(365)).toBe('month')
  })
})

describe('chartBars (daily)', () => {
  it('returns one bar per day with totals and empty flags', () => {
    // 2026-06-28 is a Sunday.
    const bars = chartBars([entry('2026-06-27', 40)], 3, '2026-06-28')
    expect(bars).toHaveLength(3)
    expect(bars.map((b) => b.value)).toEqual([0, 40, 0])
    expect(bars[0].empty).toBe(true)
    expect(bars[1].empty).toBe(false)
    // Only the Sunday (2026-06-28) gets a label.
    expect(bars[2].label).toBe('6/28')
    expect(bars[0].label).toBe('')
  })
})

describe('chartBars (weekly)', () => {
  it('aggregates into fewer bars using average carbs/day per logged day', () => {
    // Two entries in the same Sun–Sat week (week of 2026-06-28).
    const bars = chartBars(
      [entry('2026-06-29', 100), entry('2026-06-30', 200)],
      32,
      '2026-06-30',
    )
    expect(bars.length).toBeLessThan(32)
    // That week's bar = (100 + 200) / 2 logged days = 150.
    expect(bars.some((b) => b.value === 150)).toBe(true)
  })
})
