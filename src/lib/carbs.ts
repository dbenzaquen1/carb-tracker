import type { Entry, Meal } from '../types'

/** Round grams to one decimal place to avoid floating-point noise. */
export function roundCarbs(grams: number): number {
  return Math.round(grams * 10) / 10
}

/** Total carbs (grams) across a list of entries. */
export function sumCarbs(entries: Pick<Entry, 'carbs'>[]): number {
  return roundCarbs(entries.reduce((total, e) => total + e.carbs, 0))
}

/**
 * Carbs left before hitting the goal. Negative means the goal was exceeded.
 */
export function remaining(goal: number, consumed: number): number {
  return roundCarbs(goal - consumed)
}

/** Whether consumed carbs are over the goal. */
export function isOverGoal(consumed: number, goal: number): boolean {
  return consumed > goal
}

/**
 * Raw percentage of the goal consumed (can exceed 100). Returns 0 when the
 * goal is 0 or negative to avoid division by zero.
 */
export function percentOfGoal(consumed: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.round((consumed / goal) * 100)
}

/** Percentage clamped to 0–100, suitable for a progress bar/ring. */
export function progressPercent(consumed: number, goal: number): number {
  return Math.min(100, Math.max(0, percentOfGoal(consumed, goal)))
}

/** Group entries by meal, preserving the canonical meal order. */
export function groupByMeal(entries: Entry[]): Record<Meal, Entry[]> {
  const groups: Record<Meal, Entry[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  }
  for (const entry of entries) {
    groups[entry.meal].push(entry)
  }
  return groups
}

/** Total carbs per meal. */
export function mealTotals(entries: Entry[]): Record<Meal, number> {
  const groups = groupByMeal(entries)
  return {
    breakfast: sumCarbs(groups.breakfast),
    lunch: sumCarbs(groups.lunch),
    dinner: sumCarbs(groups.dinner),
    snack: sumCarbs(groups.snack),
  }
}
