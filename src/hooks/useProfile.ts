import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_DAILY_GOAL } from '../types'

export interface ProfileState {
  goal: number
  loading: boolean
  updateGoal: (newGoal: number) => Promise<void>
}

/** Loads and updates the user's daily carb goal. */
export function useProfile(userId: string | undefined): ProfileState {
  const [goal, setGoal] = useState(DEFAULT_DAILY_GOAL)
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
      .select('daily_goal')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        if (data) setGoal(data.daily_goal)
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

  return { goal, loading, updateGoal }
}
