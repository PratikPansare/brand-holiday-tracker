// Scrapes nationaltoday.com via free CORS proxies — runs in the browser
// Tries multiple proxies in sequence for reliability

const CORS_PROXIES = [
  (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
]

const MONTH_NAMES = [
  '', 'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
]

const MONTH_SHORT = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

async function fetchWithProxy(targetUrl) {
  for (const makeProxy of CORS_PROXIES) {
    try {
      const proxyUrl = makeProxy(targetUrl)
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) })
      if (!res.ok) continue

      const data = await res.json()
      // allorigins wraps in { contents: "..." }
      const html = data.contents || data
      if (typeof html === 'string' && html.length > 1000) {
        return html
      }
    } catch {
      continue
    }
  }
  throw new Error('All CORS proxies failed — check your internet connection')
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseHolidaysFromHTML(html, month, year) {
  const monthShort = MONTH_SHORT[month]
  const holidays = []
  let currentDay = null

  // Parse <tr> rows from the holiday table
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

    const c0 = stripTags(cells[0])
    const c1 = cells[1] || ''
    const c2 = cells[2] || ''
    const c3 = cells[3] || ''

    // Date row: "Apr 1 Wednesday"
    if (c0 && c0.startsWith(monthShort)) {
      const dayMatch = c0.match(/\d+/)
      if (dayMatch) currentDay = parseInt(dayMatch[0])
      continue
    }

    // Holiday row: first cell empty, second has a link
    if (!c0.trim() && c1.includes('<a') && currentDay) {
      const linkMatch = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(c1)
      if (!linkMatch) continue
      const href = linkMatch[1]
      const title = stripTags(linkMatch[2])
      if (!title || title.length < 2 || title.toLowerCase() === 'holiday') continue

      const category = stripTags(c2)
      // Extract all tag links
      const tagLinks = []
      const tagRe = /<a[^>]+>([^<]+)<\/a>/gi
      let tm
      while ((tm = tagRe.exec(c3)) !== null) tagLinks.push(tm[1].trim())

      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`
      const fullUrl = href.startsWith('http') ? href : `https://nationaltoday.com${href}`

      holidays.push({
        title,
        date: dateStr,
        category: category || '',
        tags: tagLinks.join(',').toLowerCase(),
        url: fullUrl,
        description: `${title}${category ? ` (${category})` : ''}${tagLinks.length ? `. Tags: ${tagLinks.join(', ')}` : ''}`,
      })
    }
  }

  // Deduplicate
  const seen = new Set()
  return holidays.filter(h => {
    const key = h.date + '|' + h.title.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).sort((a, b) => a.date.localeCompare(b.date))
}

export async function scrapeHolidaysForMonth(month, year, onProgress) {
  const monthName = MONTH_NAMES[month]
  const url = `https://nationaltoday.com/${monthName}-holidays/`

  onProgress?.(`Fetching ${MONTH_SHORT[month]} ${year} from nationaltoday.com...`)

  const html = await fetchWithProxy(url)
  const holidays = parseHolidaysFromHTML(html, month, year)

  onProgress?.(`Found ${holidays.length} holidays in ${MONTH_SHORT[month]}`)
  return holidays
}

export async function scrapeHolidaysForMonths(monthList, onProgress) {
  const all = []
  for (const { month, year } of monthList) {
    try {
      const holidays = await scrapeHolidaysForMonth(month, year, onProgress)
      all.push(...holidays)
    } catch (err) {
      console.warn(`Failed to scrape ${month}/${year}:`, err.message)
    }
  }
  return all
}
