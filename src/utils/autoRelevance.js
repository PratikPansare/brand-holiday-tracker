// Auto-selects top N holidays per brand per day based on score
// Runs on import — user only fine-tunes, not clicks through everything

import { scoreHolidayForBrandById } from './matching'

export function autoSelectRelevance(events, brands, maxPerDay = 2) {
  // Build score map
  const scoreMap = {}
  for (const e of events) {
    scoreMap[e.id] = {}
    for (const b of brands) {
      if (e.brandIds?.includes(b.id)) {
        scoreMap[e.id][b.id] = scoreHolidayForBrandById(e, b)
      }
    }
  }

  // Group events by date
  const byDate = {}
  for (const e of events) {
    if (!byDate[e.date]) byDate[e.date] = []
    byDate[e.date].push(e)
  }

  const overrides = {}

  for (const brand of brands) {
    for (const [date, dayEvents] of Object.entries(byDate)) {
      const brandEvents = dayEvents.filter(e => e.brandIds?.includes(brand.id))
      if (brandEvents.length === 0) continue

      // Sort by score descending
      const scored = brandEvents
        .map(e => ({ event: e, score: scoreMap[e.id]?.[brand.id] ?? 0 }))
        .sort((a, b) => b.score - a.score)

      // Top maxPerDay = relevant, rest = not_relevant
      scored.forEach(({ event }, idx) => {
        if (!overrides[event.id]) overrides[event.id] = {}
        overrides[event.id][brand.id] = idx < maxPerDay ? 'relevant' : 'not_relevant'
      })
    }
  }

  return overrides
}
