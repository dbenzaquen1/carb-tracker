import { describe, it, expect } from 'vitest'
import {
  addDays,
  formatLong,
  lastNDays,
  parseISODate,
  relativeDayLabel,
  toISODate,
  todayISO,
  weekdayLabel,
  formatShort,
} from './dates'

describe('toISODate / parseISODate', () => {
  it('formats a local date as YYYY-MM-DD with zero padding', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toISODate(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('round-trips through parseISODate without timezone drift', () => {
    const iso = '2026-06-18'
    expect(toISODate(parseISODate(iso))).toBe(iso)
  })

  it('todayISO reflects the provided date', () => {
    expect(todayISO(new Date(2026, 5, 18))).toBe('2026-06-18')
  })
})

describe('addDays', () => {
  it('adds and subtracts days', () => {
    expect(addDays('2026-06-18', 1)).toBe('2026-06-19')
    expect(addDays('2026-06-18', -1)).toBe('2026-06-17')
  })

  it('rolls over month and year boundaries', () => {
    expect(addDays('2026-06-30', 1)).toBe('2026-07-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('handles leap years', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
  })
})

describe('lastNDays', () => {
  it('returns n days ending at the given day, oldest first', () => {
    expect(lastNDays(3, '2026-06-18')).toEqual([
      '2026-06-16',
      '2026-06-17',
      '2026-06-18',
    ])
  })

  it('returns a single day for n = 1', () => {
    expect(lastNDays(1, '2026-06-18')).toEqual(['2026-06-18'])
  })
})

describe('labels', () => {
  it('weekdayLabel returns the short weekday', () => {
    // 2026-06-18 is a Thursday.
    expect(weekdayLabel('2026-06-18')).toBe('Thu')
  })

  it('formatShort combines weekday and month/day', () => {
    expect(formatShort('2026-06-18')).toBe('Thu 6/18')
  })
})

describe('relativeDayLabel', () => {
  const today = '2026-06-18'

  it('labels the current day as Today', () => {
    expect(relativeDayLabel(today, today)).toBe('Today')
  })

  it('labels the previous day as Yesterday', () => {
    expect(relativeDayLabel('2026-06-17', today)).toBe('Yesterday')
  })

  it('falls back to the long date for older days', () => {
    expect(relativeDayLabel('2026-06-15', today)).toBe(formatLong('2026-06-15'))
  })
})
