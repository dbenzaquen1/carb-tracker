import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface ExerciseState {
  /** Set of YYYY-MM-DD dates the user exercised, within the loaded window. */
  exercisedDates: Set<string>
  loading: boolean
  /** Toggle the exercise mark for a given day (optimistic). */
  toggle: (date: string) => Promise<void>
}

/**
 * Loads the user's exercise days between `fromIso` and `toIso` (inclusive) and
 * lets the UI toggle a day on/off. A day is "done" when a row exists for it.
 */
export function useExercise(
  userId: string | undefined,
  fromIso: string,
  toIso: string,
): ExerciseState {
  const [exercisedDates, setExercisedDates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('exercise_days')
      .select('entry_date')
      .eq('user_id', userId)
      .gte('entry_date', fromIso)
      .lte('entry_date', toIso)
    setExercisedDates(
      new Set((data ?? []).map((row) => row.entry_date as string)),
    )
    setLoading(false)
  }, [userId, fromIso, toIso])

  useEffect(() => {
    void reload()
  }, [reload])

  const toggle = useCallback(
    async (date: string) => {
      if (!supabase || !userId) return
      const wasDone = exercisedDates.has(date)

      // Optimistic update.
      setExercisedDates((prev) => {
        const next = new Set(prev)
        if (wasDone) next.delete(date)
        else next.add(date)
        return next
      })

      const { error } = wasDone
        ? await supabase
            .from('exercise_days')
            .delete()
            .eq('user_id', userId)
            .eq('entry_date', date)
        : await supabase
            .from('exercise_days')
            .insert({ user_id: userId, entry_date: date })

      if (error) {
        // Roll back on failure.
        setExercisedDates((prev) => {
          const next = new Set(prev)
          if (wasDone) next.add(date)
          else next.delete(date)
          return next
        })
      }
    },
    [userId, exercisedDates],
  )

  return { exercisedDates, loading, toggle }
}
