// netlify/functions/fetch-holidays.mjs
// Scrapes nationaltoday.com/{month}-holidays/ page
// Real page structure: <table> with Date | Holiday | Category | Tags columns

const MONTH_NAMES = [
  '', 'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
]

const MONTH_SHORT = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
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
  const pageUrl = `https://nationaltoday.com/${monthName}-holidays/`

  try {
    const res = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    })

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch ${pageUrl}: ${res.status}`, holidays: [] }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    const html = await res.text()
    const holidays = parseHolidays(html, month, year)

    return new Response(JSON.stringify({
      holidays,
      month,
      year,
      count: holidays.length,
      source: pageUrl,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=3600',
      }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, holidays: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ndash;/g, '-')
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseHolidays(html, month, year) {
  const holidays = []
  const monthShort = MONTH_SHORT[month]

  // ── Strategy 1: Parse the HTML table ─────────────────────────────────────
  // The nationaltoday.com holiday page renders a table like:
  //   Date row:    <td>Apr 1 Wednesday</td><td></td><td></td><td></td>
  //   Holiday row: <td></td><td><a href="/april-fools-day/">April Fools' Day</a></td><td>Special Interest</td><td>Activities, Fun</td>

  let currentDay = null
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let trMatch

  while ((trMatch = trRe.exec(html)) !== null) {
    const rowHtml = trMatch[1]
    const cells = []
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi
    let tdMatch
    while ((tdMatch = tdRe.exec(rowHtml)) !== null) {
      cells.push(tdMatch[1])
    }
    if (cells.length < 2) continue

    const cell0text = stripTags(cells[0])
    const cell1 = cells[1] || ''
    const cell2 = cells[2] || ''
    const cell3 = cells[3] || ''

    // Date row: first cell starts with short month name like "Apr 1" or "Apr 1 Wednesday"
    if (cell0text && cell0text.startsWith(monthShort)) {
      const dayMatch = cell0text.match(/\d+/)
      if (dayMatch) currentDay = parseInt(dayMatch[0])
      continue
    }

    // Holiday row: first cell empty, second cell has the holiday link
    if (!cell0text.trim() && cell1.includes('<a') && currentDay) {
      const linkMatch = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(cell1)
      if (!linkMatch) continue

      const href = linkMatch[1]
      const title = stripTags(linkMatch[2])
      if (!title || title.length < 2 || title.toLowerCase() === 'holiday') continue

      const category = stripTags(cell2)
      const tags = stripTags(cell3)
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`
      const fullUrl = href.startsWith('http') ? href : `https://nationaltoday.com${href}`

      holidays.push({
        title,
        date: dateStr,
        category: category || '',
        tags: tags || '',
        url: fullUrl,
        description: [title, category, tags].filter(Boolean).join(' · '),
      })
    }
  }

  // ── Strategy 2: Fallback via day-by-day date anchor tracking ─────────────
  // If table parsing found nothing (e.g. HTML structure changed), scan for
  // holiday links anchored near date markers like /april-13/
  if (holidays.length === 0) {
    const SKIP_SLUGS = new Set([
      'today','reminders','login-page','sign-up','national-day-topics',
      'animal-holidays','arts-entertainment-holidays','cause-holidays',
      'cultural-holidays','federal-holidays','food-beverage-holidays',
      'health-holidays','relationship-holidays','religious-holidays',
      'special-interest-holidays','fun-holidays',
    ])

    // Collect date anchor positions: href="/april-13/" → day 13
    const dateAnchorRe = /href="https?:\/\/nationaltoday\.com\/[a-z]+-(\d{1,2})(?:-holidays)?\/"[^>]*>/gi
    let da
    const datePositions = []
    while ((da = dateAnchorRe.exec(html)) !== null) {
      const d = parseInt(da[1])
      if (d >= 1 && d <= 31) datePositions.push({ pos: da.index, day: d })
    }

    const linkRe = /href="https?:\/\/nationaltoday\.com\/([^"\/]+)\/"[^>]*>([^<]{3,80})<\/a>/gi
    const seen = new Set()
    let m

    while ((m = linkRe.exec(html)) !== null) {
      const slug = m[1]
      const title = m[2].trim()

      if (seen.has(slug)) continue
      if (SKIP_SLUGS.has(slug)) continue
      // Skip month pages, birthday pages, city pages, category pages
      if (/-(holidays|birthdays)$/.test(slug)) continue
      if (/^(january|february|march|april|may|june|july|august|september|october|november|december)-/.test(slug)) continue
      if (!title || title.length < 3) continue

      seen.add(slug)

      // Find nearest preceding date anchor
      let day = null
      for (let i = datePositions.length - 1; i >= 0; i--) {
        if (datePositions[i].pos < m.index) {
          day = datePositions[i].day
          break
        }
      }
      if (!day) continue

      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      holidays.push({
        title,
        date: dateStr,
        category: '',
        tags: '',
        url: `https://nationaltoday.com/${slug}/`,
        description: title,
      })
    }
  }

  // Deduplicate by date + title
  const seen = new Set()
  const deduped = []
  for (const h of holidays) {
    const key = h.date + '|' + h.title.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(h)
    }
  }

  return deduped.sort((a, b) => a.date.localeCompare(b.date))
}

// Available at: /.netlify/functions/fetch-holidays (redirected from /api/fetch-holidays)
