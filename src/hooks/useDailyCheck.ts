import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface DailyCheckState {
  /** Set of YYYY-MM-DD dates marked done, within the loaded window. */
  doneDates: Set<string>
  loading: boolean
  /** Toggle the mark for a given day (optimistic). */
  toggle: (date: string) => Promise<void>
}

/**
 * Generic per-day check-off backed by a table whose rows are `(user_id,
 * entry_date)` and whose existence means "done that day". Used for both
 * `exercise_days` and `pt_days`.
 */
export function useDailyCheck(
  userId: string | undefined,
  table: string,
  fromIso: string,
  toIso: string,
): DailyCheckState {
  const [doneDates, setDoneDates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from(table)
      .select('entry_date')
      .eq('user_id', userId)
      .gte('entry_date', fromIso)
      .lte('entry_date', toIso)
    setDoneDates(new Set((data ?? []).map((row) => row.entry_date as string)))
    setLoading(false)
  }, [userId, table, fromIso, toIso])

  useEffect(() => {
    void reload()
  }, [reload])

  const toggle = useCallback(
    async (date: string) => {
      if (!supabase || !userId) return
      const wasDone = doneDates.has(date)

      // Optimistic update.
      setDoneDates((prev) => {
        const next = new Set(prev)
        if (wasDone) next.delete(date)
        else next.add(date)
        return next
      })

      const { error } = wasDone
        ? await supabase
            .from(table)
            .delete()
            .eq('user_id', userId)
            .eq('entry_date', date)
        : await supabase
            .from(table)
            .insert({ user_id: userId, entry_date: date })

      if (error) {
        // Roll back on failure.
        setDoneDates((prev) => {
          const next = new Set(prev)
          if (wasDone) next.add(date)
          else next.delete(date)
          return next
        })
      }
    },
    [userId, table, doneDates],
  )

  return { doneDates, loading, toggle }
}
