import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Entry, NewEntry } from '../types'

export interface EntriesState {
  entries: Entry[]
  loading: boolean
  error: string | null
  addEntry: (entry: NewEntry) => Promise<void>
  updateEntry: (
    id: string,
    patch: Partial<Pick<Entry, 'name' | 'carbs' | 'meal'>>,
  ) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  reload: () => Promise<void>
}

/**
 * Loads the user's entries between `fromIso` and `toIso` (inclusive) and
 * exposes optimistic add/update/delete mutators that keep local state and the
 * database in sync.
 */
export function useEntries(
  userId: string | undefined,
  fromIso: string,
  toIso: string,
): EntriesState {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .gte('entry_date', fromIso)
      .lte('entry_date', toIso)
      .order('created_at', { ascending: true })

    if (queryError) {
      setError(queryError.message)
    } else {
      setEntries((data ?? []) as Entry[])
      setError(null)
    }
    setLoading(false)
  }, [userId, fromIso, toIso])

  useEffect(() => {
    void reload()
  }, [reload])

  const addEntry = useCallback(
    async (entry: NewEntry) => {
      if (!supabase || !userId) return
      const { data, error: insertError } = await supabase
        .from('entries')
        .insert({ ...entry, user_id: userId })
        .select()
        .single()
      if (insertError) {
        setError(insertError.message)
        return
      }
      setEntries((prev) => [...prev, data as Entry])
    },
    [userId],
  )

  const updateEntry = useCallback(
    async (
      id: string,
      patch: Partial<Pick<Entry, 'name' | 'carbs' | 'meal'>>,
    ) => {
      if (!supabase) return
      const { data, error: updateError } = await supabase
        .from('entries')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (updateError) {
        setError(updateError.message)
        return
      }
      setEntries((prev) => prev.map((e) => (e.id === id ? (data as Entry) : e)))
    },
    [],
  )

  const deleteEntry = useCallback(
    async (id: string) => {
      if (!supabase) return
      const previous = entries
      setEntries((prev) => prev.filter((e) => e.id !== id)) // optimistic
      const { error: deleteError } = await supabase
        .from('entries')
        .delete()
        .eq('id', id)
      if (deleteError) {
        setError(deleteError.message)
        setEntries(previous) // roll back
      }
    },
    [entries],
  )

  return {
    entries,
    loading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    reload,
  }
}
