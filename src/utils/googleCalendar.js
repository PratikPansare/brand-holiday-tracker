const SCOPES = 'https://www.googleapis.com/auth/calendar.events'

let tokenClient = null
let accessToken = null

export function initGoogleAuth(clientId, onToken) {
  if (!window.google) return
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: (tokenResponse) => {
      if (tokenResponse.error) return
      accessToken = tokenResponse.access_token
      localStorage.setItem('gCalToken', accessToken)
      localStorage.setItem('gCalExpiry', Date.now() + tokenResponse.expires_in * 1000)
      onToken(accessToken)
    },
  })
}

export function connectGoogleCalendar(clientId, onToken) {
  if (!clientId) {
    alert('Please add your Google Client ID in Settings first.')
    return
  }
  if (!window.google) {
    alert('Google Identity Services not loaded. Check your internet connection.')
    return
  }
  initGoogleAuth(clientId, onToken)
  tokenClient?.requestAccessToken({ prompt: 'consent' })
}

export function getStoredToken() {
  const expiry = localStorage.getItem('gCalExpiry')
  if (expiry && Date.now() < Number(expiry)) {
    return localStorage.getItem('gCalToken')
  }
  localStorage.removeItem('gCalToken')
  localStorage.removeItem('gCalExpiry')
  return null
}

export async function pushToGoogleCalendar(event, brands, token) {
  const brandNames = brands
    .filter(b => event.brandIds?.includes(b.id))
    .map(b => b.name)
    .join(', ')

  const startDate = event.date // YYYY-MM-DD
  const endDate = startDate // All-day

  const calEvent = {
    summary: `[Post] ${event.title}`,
    description: [
      event.description || '',
      brandNames ? `\nBrands: ${brandNames}` : '',
      `\nCategory: ${event.category || 'Holiday'}`,
      `\nSource: Brand Holiday Tracker`,
    ].join(''),
    start: { date: startDate },
    end: { date: endDate },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },   // 1 day before
        { method: 'popup', minutes: 3 * 24 * 60 }, // 3 days before
      ],
    },
    colorId: '5', // banana/yellow
  }

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(calEvent),
    }
  )

  if (!res.ok) throw new Error('Google Calendar API error: ' + res.status)
  return await res.json()
}
