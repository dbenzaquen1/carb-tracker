import { describe, it, expect } from 'vitest'
import { suggestedMeal } from './meals'

function at(hour: number): Date {
  return new Date(2026, 5, 18, hour, 0, 0)
}

describe('suggestedMeal', () => {
  it('suggests breakfast in the morning', () => {
    expect(suggestedMeal(at(7))).toBe('breakfast')
    expect(suggestedMeal(at(10))).toBe('breakfast')
  })

  it('suggests lunch around midday', () => {
    expect(suggestedMeal(at(11))).toBe('lunch')
    expect(suggestedMeal(at(14))).toBe('lunch')
  })

  it('suggests dinner in the evening', () => {
    expect(suggestedMeal(at(15))).toBe('dinner')
    expect(suggestedMeal(at(20))).toBe('dinner')
  })

  it('suggests a snack late at night', () => {
    expect(suggestedMeal(at(21))).toBe('snack')
    expect(suggestedMeal(at(23))).toBe('snack')
  })
})
