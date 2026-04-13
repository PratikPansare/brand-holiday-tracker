// public/sw.js
// Service Worker — handles background notifications

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(clients.claim()))

// Check pending notifications every time SW activates or syncs
function checkPending() {
  // SW doesn't have access to localStorage directly,
  // so we message all clients to check
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(client => client.postMessage({ type: 'CHECK_NOTIFICATIONS' }))
  })
}

self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkPending())
  }
})

self.addEventListener('push', event => {
  const data = event.data?.json() || {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'BrandTrack Reminder', {
      body: data.body || 'You have an upcoming event to post.',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag || 'brandtrack',
      data: data,
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus()
      }
      return clients.openWindow('/')
    })
  )
})
