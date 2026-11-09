import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PushPermissionDeniedError,
  getCurrentPushSubscription,
  isPushConfigured,
  isPushSupported,
  subscribeToPush,
  toSubscriptionRow,
  unsubscribeFromPush,
  urlBase64ToUint8Array,
} from './push'

afterEach(() => vi.unstubAllGlobals())

describe('push adapter', () => {
  it('decodes URL-safe base64 into bytes', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3])
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255])
  })

  it('reports unsupported in a bare jsdom', () => {
    expect(isPushSupported()).toBe(false)
  })

  it('reports supported when all push APIs exist', () => {
    vi.stubGlobal('navigator', { serviceWorker: {} })
    vi.stubGlobal('PushManager', class {})
    vi.stubGlobal('Notification', {})
    expect(isPushSupported()).toBe(true)
  })

  it('exposes whether a VAPID key is configured', () => {
    expect(typeof isPushConfigured()).toBe('boolean')
  })

  it('maps a subscription to a row', () => {
    const sub = {
      toJSON: () => ({
        endpoint: 'https://p/1',
        keys: { p256dh: 'K', auth: 'A' },
      }),
    } as unknown as PushSubscription
    expect(toSubscriptionRow(sub)).toEqual({
      endpoint: 'https://p/1',
      p256dh: 'K',
      auth: 'A',
    })
  })

  it('throws when a subscription has no keys', () => {
    const sub = {
      toJSON: () => ({ endpoint: 'https://p/1' }),
    } as unknown as PushSubscription
    expect(() => toSubscriptionRow(sub)).toThrow('Subscription has no keys')
  })

  it('throws PushPermissionDeniedError when permission is denied', async () => {
    vi.stubGlobal('Notification', {
      requestPermission: vi.fn().mockResolvedValue('denied'),
    })
    const err = await subscribeToPush('AQID').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(PushPermissionDeniedError)
    expect((err as Error).name).toBe('PushPermissionDeniedError')
  })

  it('subscribes with the decoded VAPID key when granted', async () => {
    const subscribe = vi.fn().mockResolvedValue({ endpoint: 'e' })
    vi.stubGlobal('Notification', {
      requestPermission: vi.fn().mockResolvedValue('granted'),
    })
    vi.stubGlobal('navigator', {
      serviceWorker: { ready: Promise.resolve({ pushManager: { subscribe } }) },
    })
    await subscribeToPush('AQID')
    expect(subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    })
  })

  it('returns the current subscription', async () => {
    const sub = { endpoint: 'e' }
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: { getSubscription: vi.fn().mockResolvedValue(sub) },
        }),
      },
    })
    await expect(getCurrentPushSubscription()).resolves.toBe(sub)
  })

  it('returns null when the service worker never becomes ready', async () => {
    vi.useFakeTimers()
    try {
      vi.stubGlobal('navigator', {
        serviceWorker: { ready: new Promise(() => {}) },
      })
      const result = getCurrentPushSubscription()
      await vi.advanceTimersByTimeAsync(3000)
      await expect(result).resolves.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('unsubscribes the current subscription', async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true)
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue({ unsubscribe }),
          },
        }),
      },
    })
    await unsubscribeFromPush()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('unsubscribe resolves silently when there is no subscription', async () => {
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: { getSubscription: vi.fn().mockResolvedValue(null) },
        }),
      },
    })
    await expect(unsubscribeFromPush()).resolves.toBeUndefined()
  })
})
