import { describe, it, expect } from 'vitest'
import { addDays } from './dates'
import { countExercised, currentStreak, weeklyAverage } from './exercise'

describe('countExercised', () => {
  it('counts only days present in the set', () => {
    const exercised = new Set(['2026-06-16', '2026-06-18'])
    const days = ['2026-06-16', '2026-06-17', '2026-06-18']
    expect(countExercised(days, exercised)).toBe(2)
  })

  it('is 0 when nothing matches', () => {
    expect(countExercised(['2026-06-17'], new Set(['2026-06-10']))).toBe(0)
  })
})

describe('weeklyAverage', () => {
  it('returns 0 for an empty window', () => {
    expect(weeklyAverage([], new Set())).toBe(0)
  })

  it('scales the count to a per-week rate', () => {
    // 1 exercise day out of 7 days = 1.0 per week.
    const days = Array.from({ length: 7 }, (_, i) => addDays('2026-06-18', -i))
    expect(weeklyAverage(days, new Set(['2026-06-18']))).toBe(1)
  })

  it('rounds to one decimal over a 30-day window', () => {
    const days = Array.from({ length: 30 }, (_, i) => addDays('2026-06-18', -i))
    const exercised = new Set(days.slice(0, 12)) // 12 of 30 days
    // 12 * 7 / 30 = 2.8
    expect(weeklyAverage(days, exercised)).toBe(2.8)
  })
})

describe('currentStreak', () => {
  const today = '2026-06-18'

  it('counts consecutive days ending today', () => {
    const exercised = new Set(['2026-06-16', '2026-06-17', '2026-06-18'])
    expect(currentStreak(today, exercised, addDays)).toBe(3)
  })

  it('still counts the run ending yesterday when today is not yet done', () => {
    const exercised = new Set(['2026-06-16', '2026-06-17'])
    expect(currentStreak(today, exercised, addDays)).toBe(2)
  })

  it('is 0 when neither today nor yesterday is done', () => {
    const exercised = new Set(['2026-06-15'])
    expect(currentStreak(today, exercised, addDays)).toBe(0)
  })
})
