import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { todayISO } from '../lib/dates'
import {
  PushPermissionDeniedError,
  VAPID_PUBLIC_KEY,
  getCurrentPushSubscription,
  isPushConfigured,
  isPushSupported,
  subscribeToPush,
  toSubscriptionRow,
  unsubscribeFromPush,
} from '../lib/push'
import {
  addPushSubscription,
  loadPtReminderState,
  removePushSubscription,
  savePtReminderTime,
} from '../lib/ptReminderStore'

export type PtRemindersState = {
  supported: boolean
  configured: boolean
  /** True when this device has a stored push subscription. */
  enabled: boolean
  time: string
  loading: boolean
  busy: boolean
  error: string | null
  enable: () => Promise<void>
  disable: () => Promise<void>
  saveTime: (time: string) => Promise<void>
}

const DEFAULT_TIME = '09:00'

function errorMessage(e: unknown): string {
  if (e instanceof PushPermissionDeniedError) {
    return 'Notifications are blocked for this app in your phone settings'
  }
  return e instanceof Error ? e.message : String(e)
}

async function currentEndpoint(): Promise<string | null> {
  try {
    return (await getCurrentPushSubscription())?.endpoint ?? null
  } catch {
    return null
  }
}

/** PT reminder push settings for this device plus the user's reminder time. */
export function usePtReminders(userId: string | undefined): PtRemindersState {
  const supported = isPushSupported()
  const configured = isPushConfigured()
  const [enabled, setEnabled] = useState(false)
  const [time, setTime] = useState(DEFAULT_TIME)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!supabase || !userId) {
      setLoading(false)
      return
    }
    const client = supabase
    setLoading(true)
    ;(async () => {
      const endpoint = supported ? await currentEndpoint() : null
      try {
        const state = await loadPtReminderState(client, userId, endpoint)
        if (!active) return
        setTime(state.time)
        setEnabled(state.thisDeviceEnabled)
      } catch (e) {
        if (active) setError(errorMessage(e))
      }
      if (active) setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [userId, supported])

  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }, [])

  const enable = useCallback(async () => {
    if (!configured) {
      setError('Reminders are not configured for this deployment')
      return
    }
    if (!supported) {
      setError('Install the app to your home screen first')
      return
    }
    if (!supabase || !userId) return
    const client = supabase
    await run(async () => {
      const sub = await subscribeToPush(VAPID_PUBLIC_KEY!)
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
      await addPushSubscription(
        client,
        userId,
        toSubscriptionRow(sub),
        zone,
        todayISO(),
      )
      setEnabled(true)
      setError(null)
    })
  }, [configured, supported, userId, run])

  const disable = useCallback(async () => {
    if (!supabase || !userId) return
    const client = supabase
    await run(async () => {
      const endpoint = await currentEndpoint()
      await unsubscribeFromPush()
      if (endpoint) await removePushSubscription(client, userId, endpoint)
      setEnabled(false)
      setError(null)
    })
  }, [userId, run])

  const saveTime = useCallback(
    async (newTime: string) => {
      setTime(newTime) // optimistic
      if (!supabase || !userId) return
      const client = supabase
      await run(async () => {
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
        await savePtReminderTime(client, userId, newTime, zone)
      })
    },
    [userId, run],
  )

  return {
    supported,
    configured,
    enabled,
    time,
    loading,
    busy,
    error,
    enable,
    disable,
    saveTime,
  }
}
