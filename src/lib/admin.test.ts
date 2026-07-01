import { describe, it, expect } from 'vitest'
import type { Entry } from '../types'
import { buildAdminUsers, filterUsers, type AdminProfileRow } from './admin'

const profiles: AdminProfileRow[] = [
  {
    id: 'u1',
    email: 'ann@example.com',
    daily_goal: 150,
    weekly_exercise_goal: 5,
    weekly_pt_goal: 7,
    weekly_skin_cream_goal: 7,
    is_admin: false,
  },
  {
    id: 'u2',
    email: 'bob@example.com',
    daily_goal: 120,
    weekly_exercise_goal: 3,
    weekly_pt_goal: 7,
    weekly_skin_cream_goal: 7,
    is_admin: true,
  },
]

const entries: Entry[] = [
  {
    id: 'e1',
    user_id: 'u1',
    entry_date: '2026-06-18',
    meal: 'lunch',
    name: 'Rice',
    carbs: 45,
    created_at: '2026-06-18T00:00:00Z',
  },
]

describe('buildAdminUsers', () => {
  it('attaches each user their own entries and check-off dates', () => {
    const users = buildAdminUsers(
      profiles,
      entries,
      [{ user_id: 'u1', entry_date: '2026-06-18' }],
      [{ user_id: 'u2', entry_date: '2026-06-17' }],
      [{ user_id: 'u1', entry_date: '2026-06-18' }],
    )

    const ann = users.find((u) => u.id === 'u1')!
    const bob = users.find((u) => u.id === 'u2')!

    expect(ann.email).toBe('ann@example.com')
    expect(ann.entries).toHaveLength(1)
    expect(ann.exercisedDates.has('2026-06-18')).toBe(true)
    expect(ann.ptDates.size).toBe(0)
    expect(ann.skinCreamDates.has('2026-06-18')).toBe(true)

    expect(bob.isAdmin).toBe(true)
    expect(bob.entries).toHaveLength(0)
    expect(bob.ptDates.has('2026-06-17')).toBe(true)
    expect(bob.skinCreamDates.size).toBe(0)
  })
})

describe('filterUsers', () => {
  const users = buildAdminUsers(profiles, [], [], [], [])

  it('returns all users for an empty query', () => {
    expect(filterUsers(users, '  ')).toHaveLength(2)
  })

  it('filters by email substring, case-insensitively', () => {
    expect(filterUsers(users, 'BOB').map((u) => u.id)).toEqual(['u2'])
  })
})
