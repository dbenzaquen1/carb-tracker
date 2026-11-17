// Push handlers, pulled into the generated Workbox service worker via
// `workbox.importScripts` (see vite.config.ts). Plain script: no imports.
// URLs derive from the registration scope because the app is served under
// a /<repo>/ base on GitHub Pages.

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = (event.data && event.data.json()) || {}
  } catch {
    payload = {}
  }

  const scope = self.registration.scope
  event.waitUntil(
    self.registration.showNotification(payload.title || 'PT exercises', {
      body: payload.body,
      tag: payload.tag || 'pt-reminder',
      icon: new URL('pwa-192x192.png', scope).href,
      data: { url: scope },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url =
    (event.notification.data && event.notification.data.url) ||
    self.registration.scope

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        const existing = windowClients.find((c) => c.url.startsWith(url))
        return existing ? existing.focus() : self.clients.openWindow(url)
      }),
  )
})
