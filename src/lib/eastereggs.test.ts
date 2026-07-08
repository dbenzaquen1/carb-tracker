import { describe, it, expect } from 'vitest'
import {
  foodReaction,
  holidayReaction,
  isLateNight,
  isNewRecord,
  streakCheer,
} from './eastereggs'
import type { WorkoutSet } from '../types'

describe('foodReaction', () => {
  it('returns an emoji for a matching fun food', () => {
    expect(foodReaction('Pizza')).toBe('🍕')
    expect(foodReaction('birthday cake')).toBe('🎂')
    expect(foodReaction('iced coffee')).toBe('☕')
  })

  it('is case-insensitive and matches substrings', () => {
    expect(foodReaction('CHEESE PIZZA')).toBe('🍕')
    expect(foodReaction('chocolate chip cookie')).toBe('🍪') // "cookie" matches first
  })

  it('prefers specific names over their substrings', () => {
    expect(foodReaction('cupcake')).toBe('🧁') // not 🎂
    expect(foodReaction('blueberry pancakes')).toBe('🥞') // not 🎂
    expect(foodReaction('pineapple chunks')).toBe('🍍') // not 🍎
    expect(foodReaction('popcorn')).toBe('🍿') // not 🌽
  })

  it('matches newly added foods', () => {
    expect(foodReaction('everything bagel')).toBe('🥯')
    expect(foodReaction('chicken caesar salad')).toBe('🥗')
    expect(foodReaction('strawberries')).toBe('🍓')
    expect(foodReaction('mac and cheese')).toBe('🧀')
  })

  it('returns null for foods with no reaction', () => {
    expect(foodReaction('Grilled chicken')).toBeNull()
    expect(foodReaction('')).toBeNull()
  })
})

describe('streakCheer', () => {
  it('cheers at milestone streaks', () => {
    expect(streakCheer(3)).toBe('3-day exercise streak! 🔥')
    expect(streakCheer(7)).toBe('7-day exercise streak! 🔥')
    expect(streakCheer(30)).toBe('30-day exercise streak! 🔥')
  })

  it('stays quiet between milestones', () => {
    expect(streakCheer(0)).toBeNull()
    expect(streakCheer(1)).toBeNull()
    expect(streakCheer(4)).toBeNull()
    expect(streakCheer(8)).toBeNull()
  })
})

describe('isLateNight', () => {
  it('covers late evening through the small hours', () => {
    expect(isLateNight(22)).toBe(true)
    expect(isLateNight(23)).toBe(true)
    expect(isLateNight(0)).toBe(true)
    expect(isLateNight(3)).toBe(true)
  })

  it('excludes daytime', () => {
    expect(isLateNight(4)).toBe(false)
    expect(isLateNight(12)).toBe(false)
    expect(isLateNight(21)).toBe(false)
  })
})

function set(exercise: string, weight: number): WorkoutSet {
  return {
    id: 'x',
    user_id: 'u',
    entry_date: '2026-07-01',
    exercise,
    weight,
    reps: 8,
    created_at: '',
  }
}

describe('isNewRecord', () => {
  const history = [set('Bench Press', 95), set('Bench Press', 100), set('Squat', 135)]

  it('detects a heavier set of the same exercise', () => {
    expect(
      isNewRecord(history, {
        entry_date: '2026-07-06',
        exercise: 'bench press',
        weight: 105,
        reps: 5,
      }),
    ).toBe(true)
  })

  it('ignores ties, lighter sets, and other exercises', () => {
    const base = { entry_date: '2026-07-06', reps: 5 }
    expect(isNewRecord(history, { ...base, exercise: 'Bench Press', weight: 100 })).toBe(false)
    expect(isNewRecord(history, { ...base, exercise: 'Bench Press', weight: 90 })).toBe(false)
  })

  it('needs a prior record to beat', () => {
    expect(
      isNewRecord(history, {
        entry_date: '2026-07-06',
        exercise: 'Deadlift',
        weight: 200,
        reps: 5,
      }),
    ).toBe(false)
  })

  it('never fires for bodyweight sets', () => {
    expect(
      isNewRecord([set('Plank', 0)], {
        entry_date: '2026-07-06',
        exercise: 'Plank',
        weight: 0,
        reps: 1,
      }),
    ).toBe(false)
  })
})

describe('holidayReaction', () => {
  it('celebrates fixed-date holidays in any year', () => {
    expect(holidayReaction('2026-10-31')?.message).toContain('Halloween')
    expect(holidayReaction('2027-12-25')?.message).toContain('Christmas')
    expect(holidayReaction('2026-02-14')?.message).toContain("Valentine's")
  })

  it('celebrates Jewish holidays on their Hebrew calendar dates', () => {
    expect(holidayReaction('2025-09-23')?.message).toContain('Shana Tova') // 1 Tishri 5786
    expect(holidayReaction('2025-10-07')?.message).toContain('Sukkot') // 15 Tishri
    expect(holidayReaction('2026-03-03')?.message).toContain('Purim') // 14 Adar
    expect(holidayReaction('2026-04-02')?.message).toContain('Passover') // 15 Nisan
    expect(holidayReaction('2026-05-22')?.message).toContain('Shavuot') // 6 Sivan
  })

  it('finds Purim in Hebrew leap years (Adar II)', () => {
    expect(holidayReaction('2027-03-23')?.message).toContain('Purim')
  })

  it('covers all eight days of Hanukkah and no more', () => {
    expect(holidayReaction('2025-12-15')?.message).toContain('Hanukkah') // day 1 (25 Kislev)
    expect(holidayReaction('2025-12-22')?.message).toContain('Hanukkah') // day 8
    expect(holidayReaction('2025-12-14')).toBeNull() // erev
    expect(holidayReaction('2025-12-23')).toBeNull() // day after
  })

  it('stays quiet on Yom Kippur — no food confetti on a fast day', () => {
    expect(holidayReaction('2025-10-02')).toBeNull() // 10 Tishri 5786
  })

  it('returns null on ordinary days', () => {
    expect(holidayReaction('2026-07-06')).toBeNull()
  })
})
