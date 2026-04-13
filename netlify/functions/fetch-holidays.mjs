// netlify/functions/fetch-holidays.mjs
// Scrapes nationaltoday.com for holidays by month

const MONTH_NAMES = [
  '', 'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
]

export default async (req, context) => {
  const url = new URL(req.url)
  const month = parseInt(url.searchParams.get('month') || new Date().getMonth() + 1)
  const year = parseInt(url.searchParams.get('year') || new Date().getFullYear())

  if (!month || month < 1 || month > 12) {
    return new Response(JSON.stringify({ error: 'Invalid month' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }

  const monthName = MONTH_NAMES[month]
  const holidays = []

  try {
    // Fetch the month overview page
    const monthUrl = `https://nationaltoday.com/${monthName}/`
    const res = await fetch(monthUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrandTracker/1.0)',
        'Accept': 'text/html',
      }
    })

    if (!res.ok) throw new Error(`nationaltoday.com returned ${res.status}`)

    const html = await res.text()

    // Parse holiday entries from the page
    // nationaltoday.com uses structured markup with holiday cards
    const holidayPattern = /<a[^>]+href="https:\/\/nationaltoday\.com\/([^"]+)\/"[^>]*>[\s\S]*?<h[23][^>]*>([^<]+)<\/h[23]>/gi
    const datePattern = /(\w+)-(\d+)/

    let match
    const seen = new Set()

    while ((match = holidayPattern.exec(html)) !== null) {
      const slug = match[1]
      const title = match[2].trim().replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&rsquo;/g, "'")

      if (seen.has(slug) || !slug.includes('-')) continue
      seen.add(slug)

      // Parse date from slug e.g. "april-7" or "national-beer-day-april-7"
      const slugParts = slug.split('-')
      let dayNum = null
      let monthNum = month

      // Try to find month + day pattern at end of slug
      for (let i = slugParts.length - 1; i >= 0; i--) {
        const num = parseInt(slugParts[i])
        if (!isNaN(num) && num >= 1 && num <= 31) {
          dayNum = num
          // check if previous part is a month name
          if (i > 0) {
            const possibleMonth = MONTH_NAMES.indexOf(slugParts[i - 1])
            if (possibleMonth > 0) monthNum = possibleMonth
          }
          break
        }
      }

      if (!dayNum) continue

      // Build ISO date string
      const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`

      if (!title || title.length < 3) continue

      holidays.push({
        title,
        date: dateStr,
        slug,
        url: `https://nationaltoday.com/${slug}/`,
        description: `Celebrate ${title} with a themed social media post.`,
        tags: slug.replace(/-/g, ' '),
      })
    }

    // Also try alternative pattern for list items
    const listPattern = /<li[^>]*class="[^"]*holiday[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
    while ((match = listPattern.exec(html)) !== null) {
      const href = match[1]
      const rawTitle = match[2].replace(/<[^>]+>/g, '').trim()
      const slug = href.split('/').filter(Boolean).pop()
      if (!slug || seen.has(slug) || !rawTitle) continue
      seen.add(slug)

      const title = rawTitle.replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&rsquo;/g, "'")
      // Try to get date from slug
      const parts = slug.split('-')
      let dayNum = null
      let monthNum = month
      for (let i = parts.length - 1; i >= 0; i--) {
        const num = parseInt(parts[i])
        if (!isNaN(num) && num >= 1 && num <= 31) {
          dayNum = num
          if (i > 0) {
            const pm = MONTH_NAMES.indexOf(parts[i - 1])
            if (pm > 0) monthNum = pm
          }
          break
        }
      }
      if (!dayNum || title.length < 3) continue
      const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
      holidays.push({ title, date: dateStr, slug, url: href, description: `Celebrate ${title}.`, tags: slug.replace(/-/g, ' ') })
    }

    // Deduplicate by date+title
    const deduped = []
    const dedupeSet = new Set()
    for (const h of holidays) {
      const key = h.date + '|' + h.title.toLowerCase()
      if (!dedupeSet.has(key)) {
        dedupeSet.add(key)
        deduped.push(h)
      }
    }

    deduped.sort((a, b) => a.date.localeCompare(b.date))

    return new Response(JSON.stringify({
      holidays: deduped,
      month,
      year,
      count: deduped.length,
      source: monthUrl
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=3600'
      }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, holidays: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
}

export const config = { path: '/api/fetch-holidays' }
