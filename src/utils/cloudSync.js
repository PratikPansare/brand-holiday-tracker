// Cloud sync via Netlify Blobs — syncs brands + events across all devices
// Falls back to localStorage if server unreachable

const SYNC_DEBOUNCE_MS = 2000 // wait 2s after last change before syncing

let syncTimer = null

export async function loadFromCloud() {
  try {
    const [brandsRes, eventsRes] = await Promise.all([
      fetch('/api/load-data?key=brands'),
      fetch('/api/load-data?key=events'),
    ])
    const brandsJson = await brandsRes.json()
    const eventsJson = await eventsRes.json()

    return {
      brands: brandsJson.data || null,
      events: eventsJson.data || null,
    }
  } catch {
    return { brands: null, events: null }
  }
}

export async function saveToCloud(brands, events) {
  try {
    await Promise.all([
      fetch('/api/save-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'brands', data: brands }),
      }),
      fetch('/api/save-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'events', data: events }),
      }),
    ])
    return true
  } catch {
    return false
  }
}

// Debounced save — won't spam the API on rapid changes
export function scheduleSave(brands, events, onSaved) {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(async () => {
    const ok = await saveToCloud(brands, events)
    onSaved?.(ok)
  }, SYNC_DEBOUNCE_MS)
}
