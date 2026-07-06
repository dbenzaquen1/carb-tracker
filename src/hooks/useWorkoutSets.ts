import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { NewWorkoutSet, WorkoutSet } from '../types'

export interface WorkoutSetsState {
  /** Every set the user has ever logged, oldest day first, in logged order. */
  sets: WorkoutSet[]
  loading: boolean
  error: string | null
  addSet: (set: NewWorkoutSet) => Promise<void>
  deleteSet: (id: string) => Promise<void>
}

/**
 * Loads the user's full workout history (it stays small — a handful of rows
 * per gym day) so the UI can show "last time" hints for any exercise, and
 * exposes optimistic add/delete mutators.
 */
export function useWorkoutSets(userId: string | undefined): WorkoutSetsState {
  const [sets, setSets] = useState<WorkoutSet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('workout_sets')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (queryError) {
      setError(queryError.message)
    } else {
      setSets((data ?? []) as WorkoutSet[])
      setError(null)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void reload()
  }, [reload])

  const addSet = useCallback(
    async (set: NewWorkoutSet) => {
      if (!supabase || !userId) return
      const { data, error: insertError } = await supabase
        .from('workout_sets')
        .insert({ ...set, user_id: userId })
        .select()
        .single()
      if (insertError) {
        setError(insertError.message)
        return
      }
      setSets((prev) => [...prev, data as WorkoutSet])
    },
    [userId],
  )

  const deleteSet = useCallback(
    async (id: string) => {
      if (!supabase) return
      const previous = sets
      setSets((prev) => prev.filter((s) => s.id !== id)) // optimistic
      const { error: deleteError } = await supabase
        .from('workout_sets')
        .delete()
        .eq('id', id)
      if (deleteError) {
        setError(deleteError.message)
        setSets(previous) // roll back
      }
    },
    [sets],
  )

  return { sets, loading, error, addSet, deleteSet }
}
