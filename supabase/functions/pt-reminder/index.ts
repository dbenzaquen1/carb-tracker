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
  decision?: ReminderDecision
  error?: string
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
    const userId: string = profile.id
    try {
      const { data: latest, error: latestError } = await supabase
        .from('pt_days')
        .select('entry_date')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestError) {
        console.error(
          `pt-reminder user=${userId} pt_days query failed: ${latestError.message}`,
        )
        results.push({ userId, error: latestError.message })
        continue
      }

      const decision = decideForUser({
        latestPtDate: latest?.entry_date ?? null,
        enabledOn: profile.pt_reminders_enabled_on,
        reminderTime: profile.pt_reminder_time,
        timezone: profile.timezone,
        lastSentOn: profile.pt_reminder_last_sent_on,
        now: new Date(),
      })
      const result: UserResult = { userId, decision }
      let logLine = `pt-reminder user=${userId} reason=${decision.reason} localDate=${decision.localDate}`

      if (decision.send && !dryRun) {
        // Claim today's send slot before sending, so a failed bookkeeping
        // write or an overlapping run cannot cause repeat notifications.
        const { data: claimed, error: claimError } = await supabase
          .from('profiles')
          .update({ pt_reminder_last_sent_on: decision.localDate })
          .eq('id', userId)
          .or(
            `pt_reminder_last_sent_on.is.null,pt_reminder_last_sent_on.lt.${decision.localDate}`,
          )
          .select('id')
        if (claimError) {
          console.error(
            `pt-reminder user=${userId} claim failed: ${claimError.message}`,
          )
          results.push({ userId, decision, error: claimError.message })
          continue
        }
        if (!claimed || claimed.length === 0) {
          console.log(`${logLine} already claimed`)
          results.push({ ...result, delivered: 0 })
          continue
        }

        let delivered = 0
        let removed = 0
        const payload = JSON.stringify({
          title: decision.title,
          body: decision.body,
          tag: 'pt-reminder',
        })
        for (const sub of byUser.get(userId) ?? []) {
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
            const { statusCode, body } = err as {
              statusCode?: number
              body?: string
            }
            if (statusCode === 404 || statusCode === 410) {
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('id', sub.id)
              removed++
            } else {
              console.error(
                `pt-reminder user=${userId} send failed statusCode=${statusCode} body=${body}`,
              )
            }
          }
        }
        result.delivered = delivered
        result.removed = removed
        sent++
        logLine += ` delivered=${delivered} removed=${removed}`
      }

      console.log(logLine)
      results.push(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`pt-reminder user=${userId} unexpected error: ${message}`)
      results.push({ userId, error: message })
    }
  }

  return json({ checked: results.length, sent, results })
})
