export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const

export type Meal = (typeof MEALS)[number]

export const MEAL_LABELS: Record<Meal, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

/** A single logged food item. `carbs` is grams of carbohydrate. */
export interface Entry {
  id: string
  user_id: string
  /** Local calendar date in YYYY-MM-DD form. */
  entry_date: string
  meal: Meal
  name: string
  carbs: number
  created_at: string
}

/** Fields supplied by the user when adding an entry. */
export type NewEntry = Pick<Entry, 'entry_date' | 'meal' | 'name' | 'carbs'>

export interface Profile {
  id: string
  /** Daily carb goal in grams. */
  daily_goal: number
  updated_at: string
}

export const DEFAULT_DAILY_GOAL = 150

/** Default number of days per week the user aims to exercise. */
export const DEFAULT_WEEKLY_EXERCISE_GOAL = 5
