// AI-powered brand matching using Google Gemini free API
// Free tier: 15 req/min, 1500 req/day — more than enough
// Get a free key at: https://aistudio.google.com/app/apikey

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const BRAND_DESCRIPTIONS = {
  'Aesthetic Revival':          'A spa and wellness centre offering massages, facials, skincare treatments, aromatherapy, and beauty services. Focus on self-care, relaxation, and beauty.',
  'MJI Capital':                'A hard money lending company. Provides private real estate loans, bridge loans, investment funding, and financial services for real estate investors.',
  'Anticus':                    'An art gallery showcasing paintings, sculptures, photography, and contemporary art. Hosts exhibitions and cultural events. Focus on visual arts and culture.',
  'Cre8tive Influence':         'A digital marketing agency specialising in social media, branding, content creation, SEO, influencer marketing, and advertising campaigns.',
  'Cut Throat Barbershoppe':    'A traditional barbershop offering haircuts, beard trims, hot towel shaves, grooming, and mens styling. Classic barbershop culture.',
  'Desert Kings Falconry':      'A falconry and birds of prey YouTube channel and experience. Features falcons, hawks, eagles, raptors, wildlife, and outdoor adventures.',
  'Dillinger Motor Company':    'A motorcycle service and repair shop. Services, customises, and repairs motorcycles. Biker culture, road trips, and American motorcycle lifestyle.',
  'Mountain West Construction': 'A construction company that builds and renovates homes and commercial properties. Services include general contracting, remodeling, and new construction.',
  'Mcdonald Team':              'A real estate team helping clients buy and sell homes. Focus on residential real estate, property listings, home buying, and investment properties.',
  'Oak Creek Vineyards':        'A winery and vineyard producing and selling wines including reds, whites, and sparkling. Hosts wine tastings, events, and wine education experiences.',
  'Tailored Bites':             'A healthy food snacks brand selling nutritious, clean-label snacks. Focus on health, nutrition, whole ingredients, and mindful eating.',
}

export async function matchHolidaysWithAI(holidays, brands, apiKey, onProgress) {
  if (!apiKey) throw new Error('Gemini API key required')

  // Process in batches of 50 holidays per API call to stay efficient
  const BATCH = 50
  const results = {} // { holidayId: [brandId, ...] }

  const brandNames = brands.map(b => b.name)

  for (let i = 0; i < holidays.length; i += BATCH) {
    const batch = holidays.slice(i, i + BATCH)
    onProgress?.(`AI matching holidays ${i + 1}–${Math.min(i + BATCH, holidays.length)} of ${holidays.length}...`)

    const holidayList = batch.map((h, idx) =>
      `${idx + 1}. "${h.title}" (${h.date}) — Category: ${h.category || 'N/A'}, Tags: ${h.tags || 'N/A'}`
    ).join('\n')

    const brandList = brandNames.map(name =>
      `- ${name}: ${BRAND_DESCRIPTIONS[name] || name}`
    ).join('\n')

    const prompt = `You are a social media content planner. Given these holidays/events and brand profiles, determine which brands could create relevant social media posts for each holiday.

BRANDS:
${brandList}

HOLIDAYS (return ONLY holidays that genuinely fit at least one brand — skip irrelevant ones):
${holidayList}

Return ONLY a JSON object like this (no explanation, no markdown, just raw JSON):
{
  "1": ["Brand Name 1", "Brand Name 2"],
  "2": ["Brand Name 3"],
  "5": ["Brand Name 1", "Brand Name 4"]
}

Rules:
- Use the number from the holiday list as the key
- Only include holidays that are a NATURAL fit for a brand (would make a good social media post)
- A brand CAN appear for many holidays if truly relevant
- Leave out holidays with NO relevant brand match
- Think creatively but realistically — e.g. a wine holiday fits a winery, a grooming day fits a barber`

    try {
      const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || `Gemini API error ${res.status}`)
      }

      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) continue

      const parsed = JSON.parse(jsonMatch[0])

      // Map batch indices back to holiday IDs and brand IDs
      for (const [numStr, brandNamesArr] of Object.entries(parsed)) {
        const idx = parseInt(numStr) - 1
        if (idx < 0 || idx >= batch.length) continue
        const holiday = batch[idx]
        const matchedBrandIds = brandNamesArr
          .map(name => brands.find(b => b.name === name)?.id)
          .filter(Boolean)
        if (matchedBrandIds.length > 0) {
          results[holiday.id] = matchedBrandIds
        }
      }

      // Small delay to respect rate limits
      if (i + BATCH < holidays.length) {
        await new Promise(r => setTimeout(r, 800))
      }

    } catch (err) {
      console.error('Gemini batch error:', err)
      // Don't throw — continue with remaining batches
    }
  }

  return results
}

export async function testGeminiKey(apiKey) {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Reply with just the word: OK' }] }],
      generationConfig: { maxOutputTokens: 10 },
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Invalid API key')
  }
  return true
}
