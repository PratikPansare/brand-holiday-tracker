let syncTimer = null

export async function loadFromCloud() {
  try {
    const [b, e, r] = await Promise.all([
      fetch('/api/load-data?key=brands').then(r => r.json()),
      fetch('/api/load-data?key=events').then(r => r.json()),
      fetch('/api/load-data?key=relevance').then(r => r.json()),
    ])
    return {
      brands: b.data || null,
      events: e.data || null,
      relevanceOverrides: r.data || null,
    }
  } catch {
    return { brands: null, events: null, relevanceOverrides: null }
  }
}

async function saveToCloud(brands, events, relevanceOverrides) {
  try {
    await Promise.all([
      fetch('/api/save-data', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key:'brands', data: brands }) }),
      fetch('/api/save-data', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key:'events', data: events }) }),
      fetch('/api/save-data', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key:'relevance', data: relevanceOverrides }) }),
    ])
    return true
  } catch { return false }
}

// Immediately save to cloud (no debounce) — used for clears
export async function saveNow(brands, events, relevanceOverrides) {
  return saveToCloud(brands, events, relevanceOverrides)
}

export function scheduleSave(brands, events, relevanceOverrides, onSaved) {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(async () => {
    const ok = await saveToCloud(brands, events, relevanceOverrides)
    onSaved?.(ok)
  }, 1500)
}
