import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  DEFAULT_DAILY_GOAL,
  DEFAULT_WEEKLY_EXERCISE_GOAL,
  DEFAULT_WEEKLY_PT_GOAL,
  DEFAULT_WEEKLY_SKIN_CREAM_GOAL,
} from '../types'

export interface ProfileState {
  goal: number
  weeklyExerciseGoal: number
  weeklyPtGoal: number
  weeklySkinCreamGoal: number
  isAdmin: boolean
  loading: boolean
  updateGoal: (newGoal: number) => Promise<void>
  updateWeeklyExerciseGoal: (newGoal: number) => Promise<void>
  updateWeeklyPtGoal: (newGoal: number) => Promise<void>
  updateWeeklySkinCreamGoal: (newGoal: number) => Promise<void>
}

/** Loads and updates the user's daily carb goal and weekly exercise/PT goals. */
export function useProfile(userId: string | undefined): ProfileState {
  const [goal, setGoal] = useState(DEFAULT_DAILY_GOAL)
  const [weeklyExerciseGoal, setWeeklyExerciseGoal] = useState(
    DEFAULT_WEEKLY_EXERCISE_GOAL,
  )
  const [weeklyPtGoal, setWeeklyPtGoal] = useState(DEFAULT_WEEKLY_PT_GOAL)
  const [weeklySkinCreamGoal, setWeeklySkinCreamGoal] = useState(
    DEFAULT_WEEKLY_SKIN_CREAM_GOAL,
  )
  const [isAdmin, setIsAdmin] = useState(false)
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
      .select(
        'daily_goal, weekly_exercise_goal, weekly_pt_goal, weekly_skin_cream_goal, is_admin',
      )
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        if (data) {
          setGoal(data.daily_goal)
          if (data.weekly_exercise_goal != null) {
            setWeeklyExerciseGoal(data.weekly_exercise_goal)
          }
          if (data.weekly_pt_goal != null) {
            setWeeklyPtGoal(data.weekly_pt_goal)
          }
          if (data.weekly_skin_cream_goal != null) {
            setWeeklySkinCreamGoal(data.weekly_skin_cream_goal)
          }
          setIsAdmin(Boolean(data.is_admin))
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

  const updateWeeklyPtGoal = useCallback(
    async (newGoal: number) => {
      setWeeklyPtGoal(newGoal) // optimistic
      if (!supabase || !userId) return
      await supabase.from('profiles').upsert({
        id: userId,
        weekly_pt_goal: newGoal,
        updated_at: new Date().toISOString(),
      })
    },
    [userId],
  )

  const updateWeeklySkinCreamGoal = useCallback(
    async (newGoal: number) => {
      setWeeklySkinCreamGoal(newGoal) // optimistic
      if (!supabase || !userId) return
      await supabase.from('profiles').upsert({
        id: userId,
        weekly_skin_cream_goal: newGoal,
        updated_at: new Date().toISOString(),
      })
    },
    [userId],
  )

  return {
    goal,
    weeklyExerciseGoal,
    weeklyPtGoal,
    weeklySkinCreamGoal,
    isAdmin,
    loading,
    updateGoal,
    updateWeeklyExerciseGoal,
    updateWeeklyPtGoal,
    updateWeeklySkinCreamGoal,
  }
}
