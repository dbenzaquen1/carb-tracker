import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { decideForUser } from '../_shared/ptReminder.ts'
import type { ReminderDecision } from '../_shared/ptReminder.ts'

type Subscription = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

type UserResult = {
  userId: string
  decision: ReminderDecision
  delivered?: number
  removed?: number
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (
    !serviceKey ||
    req.headers.get('authorization') !== `Bearer ${serviceKey}`
  ) {
    return json({ error: 'unauthorized' }, 401)
  }
  const dryRun = new URL(req.url).searchParams.get('dry_run') === '1'

  const vapidSubject = Deno.env.get('VAPID_SUBJECT')
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!vapidSubject || !vapidPublic || !vapidPrivate) {
    return json({ error: 'VAPID not configured' }, 500)
  }
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, {
    auth: { persistSession: false },
  })

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
  if (subsError) return json({ error: subsError.message }, 500)

  const byUser = new Map<string, Subscription[]>()
  for (const sub of (subs ?? []) as Subscription[]) {
    byUser.set(sub.user_id, [...(byUser.get(sub.user_id) ?? []), sub])
  }
  const userIds = [...byUser.keys()]

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select(
      'id, pt_reminder_time, timezone, pt_reminders_enabled_on, pt_reminder_last_sent_on',
    )
    .in('id', userIds)
  if (profilesError) return json({ error: profilesError.message }, 500)

  const results: UserResult[] = []
  let sent = 0

  for (const profile of profiles ?? []) {
    const { data: latest } = await supabase
      .from('pt_days')
      .select('entry_date')
      .eq('user_id', profile.id)
      .order('entry_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    const decision = decideForUser({
      latestPtDate: latest?.entry_date ?? null,
      enabledOn: profile.pt_reminders_enabled_on,
      reminderTime: profile.pt_reminder_time,
      timezone: profile.timezone,
      lastSentOn: profile.pt_reminder_last_sent_on,
      now: new Date(),
    })
    const result: UserResult = { userId: profile.id, decision }
    let logLine = `pt-reminder user=${profile.id} reason=${decision.reason} localDate=${decision.localDate}`

    if (decision.send && !dryRun) {
      let delivered = 0
      let removed = 0
      const payload = JSON.stringify({
        title: decision.title,
        body: decision.body,
        tag: 'pt-reminder',
      })
      for (const sub of byUser.get(profile.id) ?? []) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          )
          delivered++
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
            removed++
          } else {
            console.error(`pt-reminder user=${profile.id} send failed`, err)
          }
        }
      }
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ pt_reminder_last_sent_on: decision.localDate })
        .eq('id', profile.id)
      if (updateError) {
        console.error(
          `pt-reminder user=${profile.id} update failed`,
          updateError,
        )
      }
      result.delivered = delivered
      result.removed = removed
      sent++
      logLine += ` delivered=${delivered} removed=${removed}`
    }

    console.log(logLine)
    results.push(result)
  }

  return json({ checked: results.length, sent, results })
})
