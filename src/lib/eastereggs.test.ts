import { describe, it, expect } from 'vitest'
import { foodReaction } from './eastereggs'

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

  it('returns null for foods with no reaction', () => {
    expect(foodReaction('Grilled chicken')).toBeNull()
    expect(foodReaction('')).toBeNull()
  })
})
