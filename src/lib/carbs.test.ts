import { describe, it, expect } from 'vitest'
import type { Entry, Meal } from '../types'
import {
  groupByMeal,
  isOverGoal,
  mealTotals,
  percentOfGoal,
  progressPercent,
  remaining,
  roundCarbs,
  sumCarbs,
} from './carbs'

function entry(meal: Meal, carbs: number, name = 'food'): Entry {
  return {
    id: `${meal}-${name}-${carbs}`,
    user_id: 'u1',
    entry_date: '2026-06-18',
    meal,
    name,
    carbs,
    created_at: '2026-06-18T00:00:00Z',
  }
}

describe('roundCarbs', () => {
  it('rounds to one decimal place', () => {
    expect(roundCarbs(10.04)).toBe(10)
    expect(roundCarbs(10.05)).toBe(10.1)
    expect(roundCarbs(0.1 + 0.2)).toBe(0.3)
  })
})

describe('sumCarbs', () => {
  it('returns 0 for no entries', () => {
    expect(sumCarbs([])).toBe(0)
  })

  it('sums carbs and avoids floating point noise', () => {
    expect(sumCarbs([{ carbs: 0.1 }, { carbs: 0.2 }])).toBe(0.3)
    expect(sumCarbs([{ carbs: 30 }, { carbs: 45.5 }, { carbs: 12 }])).toBe(87.5)
  })
})

describe('remaining', () => {
  it('reports carbs left under the goal', () => {
    expect(remaining(150, 90)).toBe(60)
  })

  it('goes negative when the goal is exceeded', () => {
    expect(remaining(150, 175)).toBe(-25)
  })
})

describe('isOverGoal', () => {
  it('is false at or under the goal, true above it', () => {
    expect(isOverGoal(150, 150)).toBe(false)
    expect(isOverGoal(149.9, 150)).toBe(false)
    expect(isOverGoal(150.1, 150)).toBe(true)
  })
})

describe('percentOfGoal', () => {
  it('computes the percentage consumed', () => {
    expect(percentOfGoal(75, 150)).toBe(50)
    expect(percentOfGoal(150, 150)).toBe(100)
    expect(percentOfGoal(225, 150)).toBe(150)
  })

  it('guards against a zero or negative goal', () => {
    expect(percentOfGoal(50, 0)).toBe(0)
    expect(percentOfGoal(50, -10)).toBe(0)
  })
})

describe('progressPercent', () => {
  it('clamps to the 0–100 range', () => {
    expect(progressPercent(0, 150)).toBe(0)
    expect(progressPercent(75, 150)).toBe(50)
    expect(progressPercent(300, 150)).toBe(100)
  })
})

describe('groupByMeal', () => {
  it('buckets entries by meal in canonical order with empty arrays', () => {
    const groups = groupByMeal([entry('dinner', 40), entry('breakfast', 20)])
    expect(Object.keys(groups)).toEqual([
      'breakfast',
      'lunch',
      'dinner',
      'snack',
    ])
    expect(groups.breakfast).toHaveLength(1)
    expect(groups.lunch).toHaveLength(0)
    expect(groups.dinner).toHaveLength(1)
  })
})

describe('mealTotals', () => {
  it('totals carbs per meal', () => {
    const totals = mealTotals([
      entry('breakfast', 20),
      entry('breakfast', 10),
      entry('snack', 15),
    ])
    expect(totals.breakfast).toBe(30)
    expect(totals.lunch).toBe(0)
    expect(totals.snack).toBe(15)
  })
})
