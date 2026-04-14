// AI matching using Google Gemini free API
// Auto-detects the best available model using ListModels API
// Respects 5 RPM rate limit with proper delays

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

// Preferred models in order — first available one wins
const PREFERRED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash-latest',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash',
  'gemini-pro',
]

// Find best available model from the user's free-tier account
async function detectBestModel(apiKey) {
  try {
    const res = await fetch(`${BASE_URL}/models?key=${apiKey}`)
    if (!res.ok) throw new Error('Could not list models')
    const data = await res.json()
    const available = (data.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace('models/', ''))

    // Pick highest preference model that's available
    for (const preferred of PREFERRED_MODELS) {
      if (available.some(a => a === preferred || a.startsWith(preferred))) {
        return available.find(a => a === preferred || a.startsWith(preferred))
      }
    }
    // Fallback: pick first available text model
    return available[0] || 'gemini-2.5-flash'
  } catch {
    return 'gemini-2.5-flash' // best guess fallback
  }
}

// Wait helper to respect 5 RPM = 1 request per 13 seconds
const wait = (ms) => new Promise(r => setTimeout(r, ms))

const BRAND_DESCRIPTIONS = {
  'Aesthetic Revival':          'Spa and wellness centre: massages, facials, skincare, aromatherapy, self-care, beauty, relaxation.',
  'MJI Capital':                'Hard money lending company: private real estate loans, bridge loans, investment funding, financial services.',
  'Anticus':                    'Art gallery: paintings, sculptures, photography, contemporary art, exhibitions, cultural events.',
  'Cre8tive Influence':         'Digital marketing agency: social media, branding, content creation, SEO, influencer marketing, advertising.',
  'Cut Throat Barbershoppe':    'Traditional barbershop: haircuts, beard trims, hot towel shaves, mens grooming and styling.',
  'Desert Kings Falconry':      'Falconry and birds of prey YouTube channel: falcons, hawks, eagles, raptors, wildlife, outdoor adventures.',
  'Dillinger Motor Company':    'Motorcycle service and repair shop: motorcycle servicing, customisation, repair, biker culture.',
  'Mountain West Construction': 'Construction company: home building, renovation, commercial projects, general contracting, remodeling.',
  'Mcdonald Team':              'Real estate team: buying and selling homes, property listings, home buying, investment properties.',
  'Oak Creek Vineyards':        'Winery and vineyard: wine production, wine tastings, wine education, events. All wine varieties including malbec, cabernet, chardonnay, etc.',
  'Tailored Bites':             'Healthy food snacks brand: nutritious clean-label snacks, health, nutrition, whole ingredients, mindful eating.',
}

export async function matchHolidaysWithAI(holidays, brands, apiKey, onProgress, learningContext = '') {
  if (!apiKey) throw new Error('Gemini API key required')

  // Step 1: detect best available model
  onProgress?.('Detecting available Gemini model...')
  const model = await detectBestModel(apiKey)
  onProgress?.(`Using model: ${model}`)

  const brandNames = brands.map(b => b.name)
  const brandList = brandNames.map(name =>
    `- ${name}: ${BRAND_DESCRIPTIONS[name] || name}`
  ).join('\n')

  const results = {}

  // Process in batches of 60 with 14-second delays (stay under 5 RPM)
  const BATCH = 60
  for (let i = 0; i < holidays.length; i += BATCH) {
    const batch = holidays.slice(i, i + BATCH)
    const batchNum = Math.floor(i / BATCH) + 1
    const totalBatches = Math.ceil(holidays.length / BATCH)

    onProgress?.(`AI matching batch ${batchNum}/${totalBatches} (${batch.length} holidays)...`)

    // Compressed format: just title + category — 50% fewer tokens
    const holidayList = batch.map((h, idx) =>
      `${idx + 1}. ${h.title}${h.category ? ` (${h.category})` : ''}`
    ).join('\n')

    const prompt = `You are a social media content planner. Match these holidays to brands that could create a relevant social media post for it.${learningContext}

BRANDS:
${brandList}

HOLIDAYS:
${holidayList}

Return ONLY raw JSON (no markdown, no explanation):
{
  "1": ["Brand Name"],
  "3": ["Brand Name 1", "Brand Name 2"],
  "7": ["Brand Name"]
}

Rules:
- Key = holiday number above
- Only include holidays that genuinely suit a brand for social media
- Skip holidays with no natural brand fit
- Think creatively — e.g. "Malbec World Day" fits Oak Creek Vineyards (wine); "National Beard Day" fits Cut Throat Barbershoppe
- A brand can appear many times`

    try {
      const res = await fetch(`${BASE_URL}/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        const msg = err.error?.message || `HTTP ${res.status}`
        // If model not found, throw so caller can show meaningful error
        if (res.status === 404) throw new Error(`Model "${model}" not found. Try a different model in Settings.`)
        if (res.status === 429) {
          onProgress?.('Rate limit hit — waiting 20 seconds...')
          await wait(20000)
          // Retry once
          const retry = await fetch(`${BASE_URL}/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
            }),
          })
          if (!retry.ok) { console.warn('Retry also failed, skipping batch'); continue }
          const retryData = await retry.json()
          const retryText = retryData.candidates?.[0]?.content?.parts?.[0]?.text || ''
          parseBatchResults(retryText, batch, brands, results)
          continue
        }
        throw new Error(msg)
      }

      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      parseBatchResults(text, batch, brands, results)

    } catch (err) {
      if (err.message.includes('not found')) throw err // propagate model errors
      console.error('Gemini batch error:', err.message)
    }

    // Respect 5 RPM — wait 14 seconds between calls
    if (i + BATCH < holidays.length) {
      onProgress?.('Waiting to respect API rate limits...')
      await wait(14000)
    }
  }

  return results
}

function parseBatchResults(text, batch, brands, results) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return
    const parsed = JSON.parse(jsonMatch[0])
    for (const [numStr, brandNamesArr] of Object.entries(parsed)) {
      const idx = parseInt(numStr) - 1
      if (idx < 0 || idx >= batch.length) continue
      const holiday = batch[idx]
      const matchedIds = (Array.isArray(brandNamesArr) ? brandNamesArr : [brandNamesArr])
        .map(name => brands.find(b => b.name === name)?.id)
        .filter(Boolean)
      if (matchedIds.length > 0) results[holiday.id] = matchedIds
    }
  } catch (e) {
    console.warn('Could not parse Gemini response:', e.message)
  }
}

export async function testGeminiKey(apiKey) {
  const model = await detectBestModel(apiKey)
  const res = await fetch(`${BASE_URL}/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Reply with just the word: OK' }] }],
      generationConfig: { maxOutputTokens: 5 },
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Invalid API key or no available models')
  }
  const data = await res.json()
  const detectedModel = model
  return { ok: true, model: detectedModel }
}

// Build learning context from past relevance decisions
// Returns a string summarising what each brand has approved/rejected
export function buildLearningContext(events, relevanceOverrides, brands) {
  if (!relevanceOverrides || Object.keys(relevanceOverrides).length === 0) return ''

  const lines = []

  for (const brand of brands) {
    const approved = []
    const rejected = []

    for (const [eventId, brandMap] of Object.entries(relevanceOverrides)) {
      const decision = brandMap[brand.id]
      if (!decision) continue
      const event = events.find(e => e.id === eventId)
      if (!event) continue
      if (decision === 'relevant') approved.push(`"${event.title}"${event.category ? ` (${event.category})` : ''}`)
      else rejected.push(`"${event.title}"${event.category ? ` (${event.category})` : ''}`)
    }

    if (approved.length > 0 || rejected.length > 0) {
      lines.push(`${brand.name}:`)
      if (approved.length > 0) lines.push(`  Previously approved: ${approved.slice(0, 8).join(', ')}`)
      if (rejected.length > 0) lines.push(`  Previously rejected: ${rejected.slice(0, 8).join(', ')}`)
    }
  }

  return lines.length > 0 ? '\nLEARNING FROM PAST DECISIONS:\n' + lines.join('\n') : ''
}
