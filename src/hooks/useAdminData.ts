import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  buildAdminUsers,
  type AdminProfileRow,
  type AdminUser,
  type DayRow,
} from '../lib/admin'
import type { Entry } from '../types'

export interface AdminDataState {
  users: AdminUser[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

/**
 * Loads every user's profile and their recent data — only when `enabled` (the
 * current user is an admin). Reads are permitted by the admin RLS policies;
 * non-admins simply never call this with `enabled = true`.
 */
export function useAdminData(
  enabled: boolean,
  fromIso: string,
  toIso: string,
): AdminDataState {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!supabase || !enabled) {
      setUsers([])
      return
    }
    setLoading(true)
    setError(null)

    const [profilesRes, entriesRes, exerciseRes, ptRes, skinCreamRes] =
      await Promise.all([
        supabase
          .from('profiles')
          .select(
            'id, email, daily_goal, weekly_exercise_goal, weekly_pt_goal, weekly_skin_cream_goal, is_admin',
          ),
        supabase
          .from('entries')
          .select('*')
          .gte('entry_date', fromIso)
          .lte('entry_date', toIso)
          .order('created_at', { ascending: true }),
        supabase
          .from('exercise_days')
          .select('user_id, entry_date')
          .gte('entry_date', fromIso)
          .lte('entry_date', toIso),
        supabase
          .from('pt_days')
          .select('user_id, entry_date')
          .gte('entry_date', fromIso)
          .lte('entry_date', toIso),
        supabase
          .from('skin_cream_days')
          .select('user_id, entry_date')
          .gte('entry_date', fromIso)
          .lte('entry_date', toIso),
      ])

    const firstError =
      profilesRes.error ||
      entriesRes.error ||
      exerciseRes.error ||
      ptRes.error ||
      skinCreamRes.error
    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    setUsers(
      buildAdminUsers(
        (profilesRes.data ?? []) as AdminProfileRow[],
        (entriesRes.data ?? []) as Entry[],
        (exerciseRes.data ?? []) as DayRow[],
        (ptRes.data ?? []) as DayRow[],
        (skinCreamRes.data ?? []) as DayRow[],
      ),
    )
    setLoading(false)
  }, [enabled, fromIso, toIso])

  useEffect(() => {
    void reload()
  }, [reload])

  return { users, loading, error, reload }
}
