import type { Entry } from '../types'

export interface PastFood {
  name: string
  carbs: number
}

/**
 * Distinct foods the user has logged before — one per name, carrying the most
 * recently used carb value — ordered newest first. Expects entries in
 * created-at-ascending order (as `useEntries` loads them), so the last
 * occurrence of a name wins.
 */
export function dedupePastFoods(
  entries: Pick<Entry, 'name' | 'carbs'>[],
): PastFood[] {
  const byName = new Map<
    string,
    { name: string; carbs: number; order: number }
  >()
  entries.forEach((entry, index) => {
    const key = entry.name.trim().toLowerCase()
    if (key === '') return
    byName.set(key, {
      name: entry.name.trim(),
      carbs: entry.carbs,
      order: index,
    })
  })
  return [...byName.values()]
    .sort((a, b) => b.order - a.order)
    .map(({ name, carbs }) => ({ name, carbs }))
}

/**
 * Suggestions for the add-food autocomplete. An empty query returns the most
 * recent foods; otherwise prefix matches rank above substring matches, keeping
 * recency order within each group.
 */
export function filterPastFoods(
  foods: PastFood[],
  query: string,
  limit = 6,
): PastFood[] {
  const q = query.trim().toLowerCase()
  if (q === '') return foods.slice(0, limit)

  const starts: PastFood[] = []
  const includes: PastFood[] = []
  for (const food of foods) {
    const name = food.name.toLowerCase()
    if (name.startsWith(q)) starts.push(food)
    else if (name.includes(q)) includes.push(food)
  }
  return [...starts, ...includes].slice(0, limit)
}
