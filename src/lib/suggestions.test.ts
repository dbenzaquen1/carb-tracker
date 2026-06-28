import { describe, it, expect } from 'vitest'
import { dedupePastFoods, filterPastFoods } from './suggestions'

describe('dedupePastFoods', () => {
  it('dedupes by name (case-insensitive) keeping the most recent carbs', () => {
    const foods = dedupePastFoods([
      { name: 'Banana', carbs: 25 },
      { name: 'Rice', carbs: 45 },
      { name: 'banana', carbs: 27 }, // newer, different casing/value
    ])
    // Newest first; Banana's carbs updated to 27, single entry.
    expect(foods).toEqual([
      { name: 'banana', carbs: 27 },
      { name: 'Rice', carbs: 45 },
    ])
  })

  it('ignores blank names and trims', () => {
    const foods = dedupePastFoods([
      { name: '   ', carbs: 10 },
      { name: '  Apple  ', carbs: 25 },
    ])
    expect(foods).toEqual([{ name: 'Apple', carbs: 25 }])
  })
})

describe('filterPastFoods', () => {
  const foods = [
    { name: 'Banana', carbs: 27 },
    { name: 'Bagel', carbs: 48 },
    { name: 'Rice', carbs: 45 },
    { name: 'Cuban bread', carbs: 20 },
  ]

  it('returns the most recent items (capped) for an empty query', () => {
    expect(filterPastFoods(foods, '', 2)).toEqual([
      { name: 'Banana', carbs: 27 },
      { name: 'Bagel', carbs: 48 },
    ])
  })

  it('ranks prefix matches above substring matches', () => {
    // "ba" prefixes Banana & Bagel; it's a substring of "Cuban bread".
    const names = filterPastFoods(foods, 'ba').map((f) => f.name)
    expect(names).toEqual(['Banana', 'Bagel', 'Cuban bread'])
  })

  it('is case-insensitive and respects the limit', () => {
    expect(filterPastFoods(foods, 'RICE').map((f) => f.name)).toEqual(['Rice'])
    expect(filterPastFoods(foods, 'ba', 1)).toHaveLength(1)
  })
})
