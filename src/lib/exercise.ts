/** How many of the given days were exercise days. */
export function countExercised(days: string[], exercised: Set<string>): number {
  return days.filter((day) => exercised.has(day)).length
}

/**
 * Average exercise days per week over the supplied window, rounded to one
 * decimal. e.g. 12 exercise days across 30 days ≈ 2.8 per week.
 */
export function weeklyAverage(days: string[], exercised: Set<string>): number {
  if (days.length === 0) return 0
  const perWeek = (countExercised(days, exercised) * 7) / days.length
  return Math.round(perWeek * 10) / 10
}

/**
 * Current run of consecutive exercise days ending at `today` (or `today - 1`,
 * so an as-yet-unlogged today doesn't break a streak). Walks backwards while
 * days are marked.
 */
export function currentStreak(
  today: string,
  exercised: Set<string>,
  addDays: (iso: string, n: number) => string,
): number {
  let streak = 0
  // Allow the streak to "hang" on today: start from today if done, else from
  // yesterday so the count reflects the run up to now.
  let cursor = exercised.has(today) ? today : addDays(today, -1)
  while (exercised.has(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}
