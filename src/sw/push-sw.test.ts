import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

type Handler = (e: unknown) => void

const SCOPE = 'https://example.test/carb/'
const handlers = new Map<string, Handler>()

const registration = {
  scope: SCOPE,
  showNotification: vi.fn().mockResolvedValue(undefined),
}
const clients = {
  matchAll: vi.fn(),
  openWindow: vi.fn(),
}

beforeAll(async () => {
  Object.assign(self, { registration, clients })
  vi.spyOn(self, 'addEventListener').mockImplementation(((
    type: string,
    listener: Handler,
  ) => {
    handlers.set(type, listener)
  }) as typeof self.addEventListener)
  // @ts-expect-error -- plain JS service-worker script, intentionally untyped
  await import('../../public/push-sw.js')
})

beforeEach(() => {
  registration.showNotification.mockClear()
  clients.matchAll.mockReset()
  clients.openWindow.mockReset()
})

describe('push handler', () => {
  it('shows a notification from the push payload', async () => {
    const waitUntil = vi.fn()
    handlers.get('push')!({
      data: {
        json: () => ({ title: 'PT exercises', body: 'B', tag: 'pt-reminder' }),
      },
      waitUntil,
    })
    await waitUntil.mock.calls[0][0]
    expect(registration.showNotification).toHaveBeenCalledWith('PT exercises', {
      body: 'B',
      tag: 'pt-reminder',
      icon: 'https://example.test/carb/pwa-192x192.png',
      data: { url: SCOPE },
    })
  })

  it('falls back to the default title when the payload is empty', async () => {
    const waitUntil = vi.fn()
    handlers.get('push')!({ data: null, waitUntil })
    await waitUntil.mock.calls[0][0]
    expect(registration.showNotification).toHaveBeenCalledWith(
      'PT exercises',
      expect.objectContaining({ tag: 'pt-reminder', data: { url: SCOPE } }),
    )
  })

  it('falls back to defaults when the payload JSON is malformed', async () => {
    const waitUntil = vi.fn()
    handlers.get('push')!({
      data: {
        json: () => {
          throw new SyntaxError('bad json')
        },
      },
      waitUntil,
    })
    await waitUntil.mock.calls[0][0]
    expect(registration.showNotification).toHaveBeenCalledWith(
      'PT exercises',
      expect.objectContaining({ tag: 'pt-reminder' }),
    )
  })
})

describe('notificationclick handler', () => {
  it('focuses an open window on click', async () => {
    const waitUntil = vi.fn()
    const close = vi.fn()
    const focus = vi.fn()
    clients.matchAll.mockResolvedValue([{ url: `${SCOPE}#/today`, focus }])
    handlers.get('notificationclick')!({
      notification: { close, data: { url: SCOPE } },
      waitUntil,
    })
    await waitUntil.mock.calls[0][0]
    expect(close).toHaveBeenCalled()
    expect(clients.matchAll).toHaveBeenCalledWith({
      type: 'window',
      includeUncontrolled: true,
    })
    expect(focus).toHaveBeenCalled()
    expect(clients.openWindow).not.toHaveBeenCalled()
  })

  it('opens a new window when none is open', async () => {
    const waitUntil = vi.fn()
    clients.matchAll.mockResolvedValue([
      { url: 'https://other.test/', focus: vi.fn() },
    ])
    handlers.get('notificationclick')!({
      notification: { close: vi.fn(), data: { url: SCOPE } },
      waitUntil,
    })
    await waitUntil.mock.calls[0][0]
    expect(clients.openWindow).toHaveBeenCalledWith(SCOPE)
  })

  it('uses the registration scope when the notification has no data', async () => {
    const waitUntil = vi.fn()
    clients.matchAll.mockResolvedValue([])
    handlers.get('notificationclick')!({
      notification: { close: vi.fn(), data: undefined },
      waitUntil,
    })
    await waitUntil.mock.calls[0][0]
    expect(clients.openWindow).toHaveBeenCalledWith(SCOPE)
  })
})
