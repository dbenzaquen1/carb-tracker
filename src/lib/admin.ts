import type { Entry } from '../types'

/** A profile row as read by the admin dashboard. */
export interface AdminProfileRow {
  id: string
  email: string | null
  daily_goal: number
  weekly_exercise_goal: number
  weekly_pt_goal: number
  weekly_skin_cream_goal: number
  is_admin: boolean
}

export interface DayRow {
  user_id: string
  entry_date: string
}

/** A user plus all of their loaded data, ready for the admin views. */
export interface AdminUser {
  id: string
  email: string | null
  dailyGoal: number
  weeklyExerciseGoal: number
  weeklyPtGoal: number
  weeklySkinCreamGoal: number
  isAdmin: boolean
  entries: Entry[]
  exercisedDates: Set<string>
  ptDates: Set<string>
  skinCreamDates: Set<string>
}

function datesByUser(rows: DayRow[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const row of rows) {
    const set = map.get(row.user_id) ?? new Set<string>()
    set.add(row.entry_date)
    map.set(row.user_id, set)
  }
  return map
}

/** Join the raw admin query results into one record per user. */
export function buildAdminUsers(
  profiles: AdminProfileRow[],
  entries: Entry[],
  exerciseRows: DayRow[],
  ptRows: DayRow[],
  skinCreamRows: DayRow[],
): AdminUser[] {
  const entriesByUser = new Map<string, Entry[]>()
  for (const entry of entries) {
    const list = entriesByUser.get(entry.user_id) ?? []
    list.push(entry)
    entriesByUser.set(entry.user_id, list)
  }
  const exercise = datesByUser(exerciseRows)
  const pt = datesByUser(ptRows)
  const skinCream = datesByUser(skinCreamRows)

  return profiles.map((p) => ({
    id: p.id,
    email: p.email,
    dailyGoal: p.daily_goal,
    weeklyExerciseGoal: p.weekly_exercise_goal,
    weeklyPtGoal: p.weekly_pt_goal,
    weeklySkinCreamGoal: p.weekly_skin_cream_goal,
    isAdmin: p.is_admin,
    entries: entriesByUser.get(p.id) ?? [],
    exercisedDates: exercise.get(p.id) ?? new Set<string>(),
    ptDates: pt.get(p.id) ?? new Set<string>(),
    skinCreamDates: skinCream.get(p.id) ?? new Set<string>(),
  }))
}

/** Filter users by a case-insensitive substring of their email. */
export function filterUsers(users: AdminUser[], query: string): AdminUser[] {
  const q = query.trim().toLowerCase()
  if (q.length === 0) return users
  return users.filter((u) => (u.email ?? '').toLowerCase().includes(q))
}
