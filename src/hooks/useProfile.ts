import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_DAILY_GOAL, DEFAULT_WEEKLY_EXERCISE_GOAL } from '../types'

export interface ProfileState {
  goal: number
  weeklyExerciseGoal: number
  loading: boolean
  updateGoal: (newGoal: number) => Promise<void>
  updateWeeklyExerciseGoal: (newGoal: number) => Promise<void>
}

/** Loads and updates the user's daily carb goal and weekly exercise goal. */
export function useProfile(userId: string | undefined): ProfileState {
  const [goal, setGoal] = useState(DEFAULT_DAILY_GOAL)
  const [weeklyExerciseGoal, setWeeklyExerciseGoal] = useState(
    DEFAULT_WEEKLY_EXERCISE_GOAL,
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    if (!supabase || !userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    supabase
      .from('profiles')
      .select('daily_goal, weekly_exercise_goal')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        if (data) {
          setGoal(data.daily_goal)
          if (data.weekly_exercise_goal != null) {
            setWeeklyExerciseGoal(data.weekly_exercise_goal)
          }
        }
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [userId])

  const updateGoal = useCallback(
    async (newGoal: number) => {
      setGoal(newGoal) // optimistic
      if (!supabase || !userId) return
      await supabase.from('profiles').upsert({
        id: userId,
        daily_goal: newGoal,
        updated_at: new Date().toISOString(),
      })
    },
    [userId],
  )

  const updateWeeklyExerciseGoal = useCallback(
    async (newGoal: number) => {
      setWeeklyExerciseGoal(newGoal) // optimistic
      if (!supabase || !userId) return
      await supabase.from('profiles').upsert({
        id: userId,
        weekly_exercise_goal: newGoal,
        updated_at: new Date().toISOString(),
      })
    },
    [userId],
  )

  return {
    goal,
    weeklyExerciseGoal,
    loading,
    updateGoal,
    updateWeeklyExerciseGoal,
  }
}
