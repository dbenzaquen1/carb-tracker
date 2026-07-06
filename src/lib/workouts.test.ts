import { describe, it, expect } from 'vitest'
import type { WorkoutSet } from '../types'
import {
  WORKOUT_TEMPLATES,
  formatSetSummary,
  getTemplate,
  groupSetsByExercise,
  inferTemplateId,
  lastSession,
} from './workouts'

let counter = 0
function makeSet(
  entry_date: string,
  exercise: string,
  weight: number,
  reps: number,
): WorkoutSet {
  counter += 1
  return {
    id: `set-${counter}`,
    user_id: 'u1',
    entry_date,
    exercise,
    weight,
    reps,
    created_at: `${entry_date}T10:00:${String(counter).padStart(2, '0')}Z`,
  }
}

describe('WORKOUT_TEMPLATES', () => {
  it('defines the 4-day split with unique ids', () => {
    expect(WORKOUT_TEMPLATES).toHaveLength(4)
    const ids = WORKOUT_TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(4)
    for (const template of WORKOUT_TEMPLATES) {
      expect(template.exercises.length).toBeGreaterThan(0)
    }
  })

  it('looks templates up by id', () => {
    expect(getTemplate('upper-push')?.label).toBe('Upper · push')
    expect(getTemplate('nope')).toBeUndefined()
  })
})

describe('groupSetsByExercise', () => {
  it('groups consecutive and non-consecutive sets, preserving order', () => {
    const sets = [
      makeSet('2026-07-06', 'Squats', 100, 8),
      makeSet('2026-07-06', 'Squats', 100, 8),
      makeSet('2026-07-06', 'Hip thrusts', 120, 12),
      makeSet('2026-07-06', 'Squats', 95, 10),
    ]
    const groups = groupSetsByExercise(sets)
    expect(groups.map((g) => g.exercise)).toEqual(['Squats', 'Hip thrusts'])
    expect(groups[0].sets).toHaveLength(3)
    expect(groups[0].sets[2].reps).toBe(10)
  })

  it('returns an empty list for no sets', () => {
    expect(groupSetsByExercise([])).toEqual([])
  })
})

describe('lastSession', () => {
  const history = [
    makeSet('2026-06-29', 'Squats', 95, 10),
    makeSet('2026-06-29', 'Squats', 95, 9),
    makeSet('2026-07-03', 'Squats', 100, 8),
    makeSet('2026-07-03', 'Hip thrusts', 120, 12),
    makeSet('2026-07-06', 'Squats', 105, 8),
  ]

  it('finds the most recent earlier day for the exercise', () => {
    const result = lastSession(history, 'Squats', '2026-07-06')
    expect(result?.date).toBe('2026-07-03')
    expect(result?.sets.map((s) => s.weight)).toEqual([100])
  })

  it('skips days on or after the given date', () => {
    const result = lastSession(history, 'Squats', '2026-06-29')
    expect(result).toBeNull()
  })

  it('returns null for an exercise never logged', () => {
    expect(lastSession(history, 'Leg press', '2026-07-06')).toBeNull()
  })
})

describe('formatSetSummary', () => {
  it('formats weighted sets as weight×reps', () => {
    expect(
      formatSetSummary([
        { weight: 50, reps: 10 },
        { weight: 47.5, reps: 9 },
      ]),
    ).toBe('50×10, 47.5×9')
  })

  it('shows bodyweight sets as plain reps', () => {
    expect(
      formatSetSummary([
        { weight: 0, reps: 12 },
        { weight: 0, reps: 10 },
      ]),
    ).toBe('12 reps, 10 reps')
  })
})

describe('inferTemplateId', () => {
  it('picks the template with the most matching exercises', () => {
    expect(inferTemplateId(['Squats', 'Walking lunges', 'Custom move'])).toBe(
      'lower',
    )
    expect(inferTemplateId(['Lat pulldown'])).toBe('upper-pull')
  })

  it('returns null when nothing matches', () => {
    expect(inferTemplateId(['Custom move'])).toBeNull()
    expect(inferTemplateId([])).toBeNull()
  })
})
