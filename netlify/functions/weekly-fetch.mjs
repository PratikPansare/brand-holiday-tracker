// netlify/functions/weekly-fetch.mjs
// Scheduled function: runs every Monday at 9:00 AM UTC
// Fetches the current + next month holidays and stores them
// NOTE: This is a background job — it stores results to be picked up by the frontend

export default async (req, context) => {
  console.log('[weekly-fetch] Starting scheduled holiday fetch...')

  const now = new Date()
  const months = []
  for (let i = 0; i < 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    months.push({ month: d.getMonth() + 1, year: d.getFullYear() })
  }

  const results = []
  for (const { month, year } of months) {
    try {
      const url = new URL(`${req.url.split('/api/')[0]}/api/fetch-holidays`)
      url.searchParams.set('month', month)
      url.searchParams.set('year', year)
      const res = await fetch(url.toString())
      if (res.ok) {
        const data = await res.json()
        results.push(...(data.holidays || []))
        console.log(`[weekly-fetch] Month ${month}/${year}: ${data.count} holidays`)
      }
    } catch (err) {
      console.error(`[weekly-fetch] Error for month ${month}:`, err.message)
    }
  }

  console.log(`[weekly-fetch] Done. Total: ${results.length} holidays`)
  return new Response(JSON.stringify({ ok: true, count: results.length }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

export const config = {
  schedule: '0 9 * * 1' // Every Monday at 9:00 AM UTC
}
