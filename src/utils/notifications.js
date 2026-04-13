export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export function scheduleNotification(event, brands, daysBefore = 1) {
  const eventDate = new Date(event.date)
  const notifyDate = new Date(eventDate)
  notifyDate.setDate(notifyDate.getDate() - daysBefore)
  
  const now = new Date()
  const msUntil = notifyDate - now
  
  if (msUntil <= 0) return // Already passed

  const brandNames = brands
    .filter(b => event.brandIds?.includes(b.id))
    .map(b => b.name)
    .join(', ')

  const title = `📅 Upcoming: ${event.title}`
  const body = brandNames
    ? `Tomorrow: Post for ${brandNames}. ${event.description || ''}`
    : event.description || 'Content reminder'

  // Store in localStorage for SW to pick up
  const notifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]')
  const notif = {
    id: event.id + '-' + daysBefore,
    title,
    body,
    fireAt: notifyDate.toISOString(),
    eventId: event.id,
  }
  
  const exists = notifications.find(n => n.id === notif.id)
  if (!exists) {
    notifications.push(notif)
    localStorage.setItem('pendingNotifications', JSON.stringify(notifications))
  }
}

export function checkNotifications(events, brands) {
  if (Notification.permission !== 'granted') return

  const pending = JSON.parse(localStorage.getItem('pendingNotifications') || '[]')
  const now = new Date()
  const remaining = []

  for (const n of pending) {
    if (new Date(n.fireAt) <= now) {
      new Notification(n.title, {
        body: n.body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
      })
    } else {
      remaining.push(n)
    }
  }

  localStorage.setItem('pendingNotifications', JSON.stringify(remaining))
}

export function showToast(title, body, type = 'info') {
  // Dispatches a custom event — App listens and renders toast
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { title, body, type } }))
}
