import type { WorkoutSet } from '../types'

/** One exercise slot in a workout template, with its target volume. */
export interface TemplateExercise {
  name: string
  /** Target number of sets. */
  sets: number
  /** Target reps as display text, e.g. "8-12" or "near failure". */
  reps: string
}

/** A named gym day (e.g. "Upper · push") and its planned exercises. */
export interface WorkoutTemplate {
  id: string
  label: string
  exercises: TemplateExercise[]
}

/** The 4-day upper/lower split the tracker ships with. */
export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'upper-push',
    label: 'Upper · push',
    exercises: [
      { name: 'Dumbbell bench press', sets: 3, reps: '8-12' },
      { name: 'Dips', sets: 3, reps: 'near failure' },
      { name: 'Machine row', sets: 3, reps: '10' },
      { name: 'Overhead press', sets: 3, reps: '8-10' },
      { name: 'Tricep pushdowns', sets: 2, reps: '12' },
    ],
  },
  {
    id: 'lower-core',
    label: 'Lower + core',
    exercises: [
      { name: 'Leg press', sets: 3, reps: '10-12' },
      { name: 'Romanian deadlift', sets: 3, reps: '10' },
      { name: 'Leg curls', sets: 3, reps: '12' },
      { name: 'Calf raises', sets: 3, reps: '15' },
      { name: 'Plank / cable crunches', sets: 3, reps: 'hold or 12' },
    ],
  },
  {
    id: 'upper-pull',
    label: 'Upper · pull',
    exercises: [
      { name: 'Lat pulldown', sets: 3, reps: '10' },
      { name: 'Incline dumbbell press', sets: 3, reps: '10' },
      { name: 'One-arm row', sets: 3, reps: '10 / side' },
      { name: 'Lateral raises', sets: 3, reps: '12-15' },
      { name: 'Bicep curls', sets: 2, reps: '12' },
    ],
  },
  {
    id: 'lower',
    label: 'Lower',
    exercises: [
      { name: 'Squats', sets: 3, reps: '8-10' },
      { name: 'Walking lunges', sets: 3, reps: '10 / leg' },
      { name: 'Leg extensions', sets: 2, reps: '12' },
      { name: 'Hip thrusts', sets: 3, reps: '12' },
    ],
  },
]

/** Look up a template by id. */
export function getTemplate(id: string): WorkoutTemplate | undefined {
  return WORKOUT_TEMPLATES.find((t) => t.id === id)
}

/**
 * Group one day's sets by exercise, preserving the order sets were logged in
 * (both across exercises and within each one).
 */
export function groupSetsByExercise(
  sets: WorkoutSet[],
): { exercise: string; sets: WorkoutSet[] }[] {
  const groups: { exercise: string; sets: WorkoutSet[] }[] = []
  for (const set of sets) {
    const group = groups.find((g) => g.exercise === set.exercise)
    if (group) group.sets.push(set)
    else groups.push({ exercise: set.exercise, sets: [set] })
  }
  return groups
}

/**
 * The most recent day strictly before `beforeDate` on which `exercise` was
 * logged, with that day's sets in logged order. Powers the "last time" hint.
 */
export function lastSession(
  allSets: WorkoutSet[],
  exercise: string,
  beforeDate: string,
): { date: string; sets: WorkoutSet[] } | null {
  let date: string | null = null
  for (const set of allSets) {
    if (set.exercise !== exercise || set.entry_date >= beforeDate) continue
    if (date === null || set.entry_date > date) date = set.entry_date
  }
  if (date === null) return null
  const found = date
  return {
    date: found,
    sets: allSets.filter(
      (s) => s.exercise === exercise && s.entry_date === found,
    ),
  }
}

/** Trim a numeric weight for display: 47.0 -> "47", 47.5 -> "47.5". */
function formatWeight(weight: number): string {
  return String(Number(weight.toFixed(1)))
}

/**
 * Compact one-line summary of a list of sets, e.g. "50×10, 50×9, 45×12".
 * Bodyweight sets (weight 0) show just the reps, e.g. "12 reps".
 */
export function formatSetSummary(
  sets: Pick<WorkoutSet, 'weight' | 'reps'>[],
): string {
  return sets
    .map((s) =>
      s.weight > 0 ? `${formatWeight(s.weight)}×${s.reps}` : `${s.reps} reps`,
    )
    .join(', ')
}

/**
 * Guess which template a day's logged exercises belong to: the template
 * sharing the most exercise names wins (ties go to the earlier template).
 * Returns null when nothing matches.
 */
export function inferTemplateId(exercises: string[]): string | null {
  let best: string | null = null
  let bestCount = 0
  for (const template of WORKOUT_TEMPLATES) {
    const names = new Set(template.exercises.map((e) => e.name))
    const count = exercises.filter((name) => names.has(name)).length
    if (count > bestCount) {
      best = template.id
      bestCount = count
    }
  }
  return best
}
