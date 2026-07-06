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

/** A single logged strength-training set: an exercise done for weight × reps. */
export interface WorkoutSet {
  id: string
  user_id: string
  /** Local calendar date in YYYY-MM-DD form. */
  entry_date: string
  exercise: string
  /** Load used; 0 means a bodyweight movement (dips, plank…). */
  weight: number
  reps: number
  created_at: string
}

/** Fields supplied by the user when logging a set. */
export type NewWorkoutSet = Pick<
  WorkoutSet,
  'entry_date' | 'exercise' | 'weight' | 'reps'
>

export const DEFAULT_DAILY_GOAL = 150

/** Default number of days per week the user aims to exercise. */
export const DEFAULT_WEEKLY_EXERCISE_GOAL = 5

/** Default number of days per week the user aims to do PT exercises. */
export const DEFAULT_WEEKLY_PT_GOAL = 7

/** Default number of days per week the user aims to apply skin cream. */
export const DEFAULT_WEEKLY_SKIN_CREAM_GOAL = 7
