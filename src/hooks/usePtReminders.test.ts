import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { todayISO } from '../lib/dates'
import {
  PushPermissionDeniedError,
  getCurrentPushSubscription,
  isPushConfigured,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/push'
import {
  addPushSubscription,
  loadPtReminderState,
  removePushSubscription,
  savePtReminderTime,
} from '../lib/ptReminderStore'
import { usePtReminders } from './usePtReminders'

vi.mock('../lib/supabase', () => ({ supabase: {} }))
vi.mock('../lib/push', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/push')>()),
  VAPID_PUBLIC_KEY: 'key',
  isPushConfigured: vi.fn(),
  isPushSupported: vi.fn(),
  getCurrentPushSubscription: vi.fn(),
  subscribeToPush: vi.fn(),
  unsubscribeFromPush: vi.fn(),
}))
vi.mock('../lib/ptReminderStore')

const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
const row = { endpoint: 'e1', p256dh: 'p', auth: 'a' }
const sub = (endpoint: string) =>
  ({
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: 'p', auth: 'a' } }),
  }) as unknown as PushSubscription

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(isPushConfigured).mockReturnValue(true)
  vi.mocked(isPushSupported).mockReturnValue(true)
  vi.mocked(getCurrentPushSubscription).mockResolvedValue(null)
  vi.mocked(loadPtReminderState).mockResolvedValue({
    time: '09:00',
    thisDeviceEnabled: false,
  })
})

async function setup() {
  const hook = renderHook(() => usePtReminders('u1'))
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

describe('usePtReminders', () => {
  it('reports unsupported and unconfigured without enabling', async () => {
    vi.mocked(isPushSupported).mockReturnValue(false)
    vi.mocked(isPushConfigured).mockReturnValue(false)
    const { result } = await setup()
    expect(result.current).toMatchObject({
      supported: false,
      configured: false,
      enabled: false,
    })
    expect(getCurrentPushSubscription).not.toHaveBeenCalled()
    expect(addPushSubscription).not.toHaveBeenCalled()
  })

  it('loads state for the current device subscription', async () => {
    vi.mocked(getCurrentPushSubscription).mockResolvedValue(sub('e1'))
    vi.mocked(loadPtReminderState).mockResolvedValue({
      time: '09:30',
      thisDeviceEnabled: true,
    })
    const { result } = await setup()
    expect(loadPtReminderState).toHaveBeenCalledWith(
      expect.anything(),
      'u1',
      'e1',
    )
    expect(result.current.enabled).toBe(true)
    expect(result.current.time).toBe('09:30')
  })

  it('enable subscribes, stores the row and flips enabled', async () => {
    vi.mocked(subscribeToPush).mockResolvedValue(sub('e1'))
    const { result } = await setup()
    await act(async () => {
      await result.current.enable()
    })
    expect(subscribeToPush).toHaveBeenCalledWith('key')
    expect(addPushSubscription).toHaveBeenCalledWith(
      expect.anything(),
      'u1',
      row,
      zone,
      todayISO(),
    )
    expect(result.current.enabled).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.busy).toBe(false)
  })

  it('enable with denied permission leaves enabled false with the blocked message', async () => {
    vi.mocked(subscribeToPush).mockRejectedValue(
      new PushPermissionDeniedError(),
    )
    const { result } = await setup()
    await act(async () => {
      await result.current.enable()
    })
    expect(result.current.enabled).toBe(false)
    expect(result.current.error).toBe(
      'Notifications are blocked for this app in your phone settings',
    )
    expect(addPushSubscription).not.toHaveBeenCalled()
  })

  it('enable surfaces other errors by message', async () => {
    vi.mocked(subscribeToPush).mockResolvedValue(sub('e1'))
    vi.mocked(addPushSubscription).mockRejectedValue(new Error('db down'))
    const { result } = await setup()
    await act(async () => {
      await result.current.enable()
    })
    expect(result.current.enabled).toBe(false)
    expect(result.current.error).toBe('db down')
  })

  it('enable when unsupported sets the home-screen message', async () => {
    vi.mocked(isPushSupported).mockReturnValue(false)
    const { result } = await setup()
    await act(async () => {
      await result.current.enable()
    })
    expect(result.current.error).toBe(
      'Install the app to your home screen first',
    )
    expect(subscribeToPush).not.toHaveBeenCalled()
  })

  it('enable when unconfigured sets the not-configured message', async () => {
    vi.mocked(isPushConfigured).mockReturnValue(false)
    const { result } = await setup()
    await act(async () => {
      await result.current.enable()
    })
    expect(result.current.error).toBe(
      'Reminders are not configured for this deployment',
    )
    expect(subscribeToPush).not.toHaveBeenCalled()
  })

  it('disable unsubscribes and removes only this device row', async () => {
    vi.mocked(getCurrentPushSubscription).mockResolvedValue(sub('e1'))
    vi.mocked(loadPtReminderState).mockResolvedValue({
      time: '09:00',
      thisDeviceEnabled: true,
    })
    const { result } = await setup()
    await act(async () => {
      await result.current.disable()
    })
    expect(unsubscribeFromPush).toHaveBeenCalled()
    expect(removePushSubscription).toHaveBeenCalledWith(
      expect.anything(),
      'u1',
      'e1',
    )
    expect(result.current.enabled).toBe(false)
  })

  it('disable falls back to the endpoint matched at load when the browser subscription is gone', async () => {
    vi.mocked(getCurrentPushSubscription).mockResolvedValueOnce(sub('e1'))
    vi.mocked(loadPtReminderState).mockResolvedValue({
      time: '09:00',
      thisDeviceEnabled: true,
    })
    const { result } = await setup()
    vi.mocked(getCurrentPushSubscription).mockResolvedValue(null)
    await act(async () => {
      await result.current.disable()
    })
    expect(removePushSubscription).toHaveBeenCalledWith(
      expect.anything(),
      'u1',
      'e1',
    )
    expect(result.current.enabled).toBe(false)
  })

  it('enable shows a friendly message when the endpoint belongs to another account', async () => {
    vi.mocked(subscribeToPush).mockResolvedValue(sub('e1'))
    vi.mocked(addPushSubscription).mockRejectedValue(
      new Error(
        'new row violates row-level security policy for table "push_subscriptions"',
      ),
    )
    const { result } = await setup()
    await act(async () => {
      await result.current.enable()
    })
    expect(result.current.enabled).toBe(false)
    expect(result.current.error).toBe(
      'This device is already registered to another account. Sign in there to turn its reminders off first.',
    )
  })

  it('saveTime persists and updates state', async () => {
    const { result } = await setup()
    await act(async () => {
      await result.current.saveTime('08:15')
    })
    expect(savePtReminderTime).toHaveBeenCalledWith(
      expect.anything(),
      'u1',
      '08:15',
      zone,
    )
    expect(result.current.time).toBe('08:15')
  })

  it('a browser subscription with no DB row shows disabled, and enable writes the row', async () => {
    vi.mocked(getCurrentPushSubscription).mockResolvedValue(sub('e1'))
    vi.mocked(subscribeToPush).mockResolvedValue(sub('e1'))
    const { result } = await setup()
    expect(result.current.enabled).toBe(false)
    await act(async () => {
      await result.current.enable()
    })
    expect(subscribeToPush).toHaveBeenCalled()
    expect(addPushSubscription).toHaveBeenCalled()
    expect(result.current.enabled).toBe(true)
  })

  it('starts loading and surfaces a load failure', async () => {
    vi.mocked(loadPtReminderState).mockRejectedValue(new Error('load failed'))
    const { result } = renderHook(() => usePtReminders('u1'))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('load failed')
  })

  it('ignores the late load result after the user changes', async () => {
    let resolveFirst!: (v: { time: string; thisDeviceEnabled: boolean }) => void
    vi.mocked(loadPtReminderState)
      .mockReturnValueOnce(new Promise((r) => (resolveFirst = r)))
      .mockResolvedValueOnce({ time: '07:00', thisDeviceEnabled: false })
    const { result, rerender } = renderHook(({ id }) => usePtReminders(id), {
      initialProps: { id: 'u1' },
    })
    rerender({ id: 'u2' })
    await waitFor(() => expect(result.current.time).toBe('07:00'))
    await act(async () => {
      resolveFirst({ time: '10:00', thisDeviceEnabled: true })
    })
    expect(result.current.time).toBe('07:00')
    expect(result.current.enabled).toBe(false)
  })

  it('does not apply an enable that resolves after the user changed', async () => {
    let resolveAdd!: () => void
    vi.mocked(subscribeToPush).mockResolvedValue(sub('e1'))
    vi.mocked(addPushSubscription).mockReturnValue(
      new Promise<void>((r) => (resolveAdd = r)),
    )
    const { result, rerender } = renderHook(({ id }) => usePtReminders(id), {
      initialProps: { id: 'u1' },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    let pending!: Promise<void>
    act(() => {
      pending = result.current.enable()
    })
    rerender({ id: 'u2' })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      resolveAdd()
      await pending
    })
    expect(result.current.enabled).toBe(false)
  })

  it('reverts the time and shows the error when saving fails, then clears it on success', async () => {
    vi.mocked(savePtReminderTime).mockRejectedValueOnce(
      new Error('save failed'),
    )
    const { result } = await setup()
    await act(async () => {
      await result.current.saveTime('08:15')
    })
    expect(result.current.time).toBe('09:00')
    expect(result.current.error).toBe('save failed')
    await act(async () => {
      await result.current.saveTime('08:30')
    })
    expect(result.current.time).toBe('08:30')
    expect(result.current.error).toBeNull()
  })
})
