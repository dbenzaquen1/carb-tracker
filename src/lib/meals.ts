import type { Meal } from '../types'

/**
 * Best-guess meal based on the time of day, used to pre-select the meal in the
 * add-entry form so logging is one tap faster.
 */
export function suggestedMeal(now: Date = new Date()): Meal {
  const hour = now.getHours()
  if (hour < 11) return 'breakfast'
  if (hour < 15) return 'lunch'
  if (hour < 21) return 'dinner'
  return 'snack'
}
