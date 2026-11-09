import type { SupabaseClient } from '@supabase/supabase-js'
import type { PushSubscriptionRow } from './push'

const DEFAULT_TIME = '09:00'

function check(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

/** Reminder time (HH:MM) and whether this device's endpoint has a stored row. */
export async function loadPtReminderState(
  client: SupabaseClient,
  userId: string,
  endpoint: string | null,
): Promise<{ time: string; thisDeviceEnabled: boolean }> {
  const profile = await client
    .from('profiles')
    .select('pt_reminder_time')
    .eq('id', userId)
    .maybeSingle()
  check(profile.error)
  const time = profile.data?.pt_reminder_time?.slice(0, 5) ?? DEFAULT_TIME

  if (endpoint === null) return { time, thisDeviceEnabled: false }

  const sub = await client
    .from('push_subscriptions')
    .select('endpoint')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .maybeSingle()
  check(sub.error)
  return { time, thisDeviceEnabled: sub.data != null }
}

/** Store this device's subscription; the first one anchors the reminder start date. */
export async function addPushSubscription(
  client: SupabaseClient,
  userId: string,
  row: PushSubscriptionRow,
  timezone: string,
  todayIso: string,
): Promise<void> {
  const sub = await client
    .from('push_subscriptions')
    .upsert({ user_id: userId, ...row }, { onConflict: 'endpoint' })
  check(sub.error)

  const profile = await client
    .from('profiles')
    .upsert({ id: userId, timezone, updated_at: new Date().toISOString() })
  check(profile.error)

  const anchor = await client
    .from('profiles')
    .update({ pt_reminders_enabled_on: todayIso })
    .eq('id', userId)
    .is('pt_reminders_enabled_on', null)
  check(anchor.error)
}

/** Remove one device's subscription; clear the anchor when none remain. */
export async function removePushSubscription(
  client: SupabaseClient,
  userId: string,
  endpoint: string,
): Promise<void> {
  const del = await client
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
  check(del.error)

  const remaining = await client
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  check(remaining.error)

  if (remaining.count === 0) {
    const clear = await client
      .from('profiles')
      .update({ pt_reminders_enabled_on: null })
      .eq('id', userId)
    check(clear.error)
  }
}

/** Persist the preferred reminder time together with the device time zone. */
export async function savePtReminderTime(
  client: SupabaseClient,
  userId: string,
  time: string,
  timezone: string,
): Promise<void> {
  const { error } = await client.from('profiles').upsert({
    id: userId,
    pt_reminder_time: time,
    timezone,
    updated_at: new Date().toISOString(),
  })
  check(error)
}
