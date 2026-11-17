import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  addPushSubscription,
  loadPtReminderState,
  removePushSubscription,
  savePtReminderTime,
} from './ptReminderStore'

type Resp = { data?: unknown; error?: unknown; count?: number | null }
type Call = [string, ...unknown[]]

function fakeClient(responses: Record<string, Resp[]> = {}) {
  const queues: Record<string, Resp[]> = {}
  for (const [t, r] of Object.entries(responses)) queues[t] = [...r]
  const calls: Record<string, Call[][]> = {}
  const client = {
    from(table: string) {
      const log: Call[] = []
      ;(calls[table] ??= []).push(log)
      const chain: Record<string, unknown> = {}
      for (const m of [
        'select',
        'eq',
        'is',
        'upsert',
        'update',
        'delete',
        'maybeSingle',
        'limit',
      ]) {
        chain[m] = (...args: unknown[]) => {
          log.push([m, ...args])
          return chain
        }
      }
      chain.then = (resolve: (v: unknown) => void) => {
        const next = queues[table]?.shift() ?? {}
        resolve({ data: null, error: null, count: null, ...next })
      }
      return chain
    },
  }
  return { client: client as unknown as SupabaseClient, calls }
}

const row = { endpoint: 'e1', p256dh: 'p', auth: 'a' }

describe('ptReminderStore', () => {
  it('loads time and this-device state', async () => {
    const { client, calls } = fakeClient({
      profiles: [{ data: { pt_reminder_time: '09:30:00' } }],
      push_subscriptions: [{ data: { endpoint: 'e1' } }],
    })
    await expect(loadPtReminderState(client, 'u1', 'e1')).resolves.toEqual({
      time: '09:30',
      thisDeviceEnabled: true,
    })
    expect(calls.profiles[0]).toContainEqual(['eq', 'id', 'u1'])
    expect(calls.push_subscriptions[0]).toContainEqual(['eq', 'endpoint', 'e1'])
  })

  it('defaults the time and reports disabled without an endpoint', async () => {
    const { client, calls } = fakeClient({ profiles: [{ data: null }] })
    await expect(loadPtReminderState(client, 'u1', null)).resolves.toEqual({
      time: '09:00',
      thisDeviceEnabled: false,
    })
    expect(calls.push_subscriptions).toBeUndefined()
  })

  it('anchors enabled_on only where it is still null', async () => {
    const { client, calls } = fakeClient()
    await addPushSubscription(client, 'u1', row, 'Europe/London', '2026-11-11')
    expect(calls.profiles[0][0]).toEqual([
      'upsert',
      expect.objectContaining({ id: 'u1', timezone: 'Europe/London' }),
    ])
    expect(calls.profiles[1]).toEqual([
      ['update', { pt_reminders_enabled_on: '2026-11-11' }],
      ['eq', 'id', 'u1'],
      ['is', 'pt_reminders_enabled_on', null],
    ])
  })

  it('upserts on endpoint so re-enabling the same device is idempotent', async () => {
    const { client, calls } = fakeClient()
    await addPushSubscription(client, 'u1', row, 'UTC', '2026-11-11')
    expect(calls.push_subscriptions[0]).toEqual([
      [
        'upsert',
        { user_id: 'u1', endpoint: 'e1', p256dh: 'p', auth: 'a' },
        { onConflict: 'endpoint' },
      ],
    ])
  })

  it('throws when a write returns an error', async () => {
    const { client } = fakeClient({
      push_subscriptions: [{ error: new Error('boom') }],
    })
    await expect(
      addPushSubscription(client, 'u1', row, 'UTC', '2026-11-11'),
    ).rejects.toThrow('boom')
  })

  it('clears enabled_on when the last subscription is removed', async () => {
    const { client, calls } = fakeClient({
      push_subscriptions: [{}, { count: 0 }],
    })
    await removePushSubscription(client, 'u1', 'e1')
    expect(calls.push_subscriptions[0]).toEqual([
      ['delete'],
      ['eq', 'user_id', 'u1'],
      ['eq', 'endpoint', 'e1'],
    ])
    expect(calls.profiles[0]).toEqual([
      ['update', { pt_reminders_enabled_on: null }],
      ['eq', 'id', 'u1'],
    ])
  })

  it('keeps enabled_on when other subscriptions remain', async () => {
    const { client, calls } = fakeClient({
      push_subscriptions: [{}, { count: 1 }],
    })
    await removePushSubscription(client, 'u1', 'e1')
    expect(calls.profiles).toBeUndefined()
  })

  it('saves the reminder time with the zone', async () => {
    const { client, calls } = fakeClient()
    await savePtReminderTime(client, 'u1', '08:15', 'Europe/London')
    expect(calls.profiles[0]).toEqual([
      [
        'upsert',
        {
          id: 'u1',
          pt_reminder_time: '08:15',
          timezone: 'Europe/London',
          updated_at: expect.any(String),
        },
      ],
    ])
  })
})
