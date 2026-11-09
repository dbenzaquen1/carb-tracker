/** VAPID public key used to subscribe to web push (undefined until configured). */
export const VAPID_PUBLIC_KEY: string | undefined = import.meta.env
  .VITE_VAPID_PUBLIC_KEY

/** True when a VAPID public key was provided at build time. */
export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY)
}

/** True when this browser supports service workers, PushManager and Notification. */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** Decode a URL-safe base64 string (VAPID key) into raw bytes. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

export type PushSubscriptionRow = {
  endpoint: string
  p256dh: string
  auth: string
}

/** Flatten a PushSubscription into the shape stored in push_subscriptions. */
export function toSubscriptionRow(sub: PushSubscription): PushSubscriptionRow {
  const json = sub.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!json.endpoint || !p256dh || !auth) {
    throw new Error('Subscription has no keys')
  }
  return { endpoint: json.endpoint, p256dh, auth }
}

const READY_TIMEOUT_MS = 3000

/** The active push subscription for this browser, or null. */
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  // `ready` never resolves when no worker is registered (e.g. `npm run dev`).
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), READY_TIMEOUT_MS)
  })
  try {
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      timeout,
    ])
    return registration ? registration.pushManager.getSubscription() : null
  } finally {
    clearTimeout(timer)
  }
}

export class PushPermissionDeniedError extends Error {
  constructor() {
    super('Notification permission was not granted')
    this.name = 'PushPermissionDeniedError'
  }
}

/** Ask for permission, then subscribe this browser to push. */
export async function subscribeToPush(
  publicKey: string,
): Promise<PushSubscription> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new PushPermissionDeniedError()
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })
}

/** Unsubscribe the current subscription, if there is one. */
export async function unsubscribeFromPush(): Promise<void> {
  const sub = await getCurrentPushSubscription()
  if (sub) await sub.unsubscribe()
}
