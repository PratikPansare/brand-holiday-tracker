// Smart matching — massively expanded keywords + semantic synonym expansion
// No AI API needed — works by deep keyword coverage per brand

// Semantic synonym map: specific term → broader terms to also check
// This catches things like "malbec" even though our tag just says "wine"
const SYNONYMS = {
  // Wine varietals → wine
  'malbec':'wine winery vineyard grape red wine argentina',
  'cabernet':'wine winery vineyard grape red wine',
  'chardonnay':'wine winery vineyard grape white wine',
  'pinot':'wine winery vineyard grape',
  'shiraz':'wine winery vineyard grape red wine',
  'syrah':'wine winery vineyard grape red wine',
  'merlot':'wine winery vineyard grape red wine',
  'sauvignon':'wine winery vineyard grape white wine',
  'riesling':'wine winery vineyard grape white wine',
  'zinfandel':'wine winery vineyard grape red wine',
  'rosé':'wine winery vineyard grape',
  'prosecco':'wine sparkling winery vineyard grape celebration',
  'champagne':'wine sparkling winery vineyard grape celebration',
  'cava':'wine sparkling winery vineyard',
  'grenache':'wine winery vineyard grape',
  'tempranillo':'wine winery vineyard grape',
  'nebbiolo':'wine winery vineyard grape',
  'barolo':'wine winery vineyard grape',
  'chianti':'wine winery vineyard grape italian',
  'rioja':'wine winery vineyard grape spanish',
  'amarone':'wine winery vineyard grape italian',
  'port':'wine winery dessert drink alcohol',
  'sherry':'wine winery drink alcohol spirits',
  'sommelier':'wine winery tasting vineyard',
  'oenophile':'wine winery tasting vineyard',
  'terroir':'wine winery vineyard grape',
  'vintage':'wine winery vineyard grape collection',
  'cellar':'wine winery vineyard storage',
  // Falconry / birds of prey
  'falcon':'bird raptor wildlife nature hunting falconry',
  'falconry':'bird raptor wildlife hunting outdoor',
  'peregrine':'bird raptor wildlife falcon',
  'gyrfalcon':'bird raptor wildlife falcon',
  'goshawk':'bird raptor wildlife hawk',
  'kestrel':'bird raptor wildlife falcon',
  'osprey':'bird raptor wildlife hawk nature',
  'raptor':'bird wildlife nature predator',
  'bird of prey':'bird wildlife nature hunting',
  'hawk':'bird raptor wildlife nature',
  'eagles':'bird raptor wildlife nature',
  'condor':'bird raptor wildlife conservation',
  'owl':'bird wildlife nature nocturnal',
  // Barbershop specific
  'straight razor':'barber shave grooming',
  'hot towel':'barber shave grooming spa',
  'lineup':'barber haircut grooming fade',
  'fade':'barber haircut grooming men',
  'pompadour':'barber haircut style men grooming',
  'pomade':'barber grooming hair styling men',
  'aftershave':'barber grooming shave men',
  'razor':'barber shave grooming men',
  // Motorcycle / bike specific
  'harley':'motorcycle bike riding motor',
  'chopper':'motorcycle bike custom riding',
  'cruiser':'motorcycle bike riding road',
  'biker':'motorcycle bike riding road freedom',
  'motorbike':'motorcycle bike riding motor',
  'moto':'motorcycle bike riding motor',
  'v-twin':'motorcycle bike motor engine',
  'two-wheel':'motorcycle bike riding',
  // Spa / wellness specific
  'aromatherapy':'spa wellness beauty relaxation self-care',
  'exfoliat':'spa wellness beauty skin self-care',
  'hydrat':'spa wellness beauty skin health',
  'moisturiz':'spa wellness beauty skin',
  'collagen':'spa wellness beauty skin health nutrition',
  'serum':'spa wellness beauty skin',
  'cleanse':'spa wellness beauty skin detox health',
  'facial':'spa wellness beauty skin self-care',
  'scrub':'spa wellness beauty skin',
  'pedicure':'spa wellness beauty self-care',
  'manicure':'spa wellness beauty self-care',
  'wax':'spa wellness beauty self-care grooming',
  'detox':'spa wellness health clean self-care',
  // Finance / real estate specific
  'mortgage':'finance lending real estate home buying property',
  'investing':'finance investment wealth money capital',
  'compound interest':'finance investment wealth money',
  'equity':'finance investment real estate property wealth',
  'portfolio':'finance investment wealth money',
  'dividend':'finance investment wealth money',
  'stock market':'finance investment wealth money economy',
  'cryptocurrency':'finance technology digital investment',
  'blockchain':'finance technology digital investment',
  'bitcoin':'finance technology digital investment',
  'loan':'finance lending money capital credit',
  'interest rate':'finance lending money economy',
  'down payment':'real estate finance home buying property',
  'listing':'real estate property home buying selling',
  'closing':'real estate finance home buying property',
  'escrow':'real estate finance home buying property',
  'appraisal':'real estate property home buying finance',
  'renovation':'construction home improvement building real estate',
  'remodel':'construction home improvement building',
  'blueprint':'construction building architecture design',
  'permit':'construction building home renovation',
  'contractor':'construction building home renovation',
  // Food / nutrition specific
  'probiotic':'healthy food nutrition gut health wellness',
  'superfood':'healthy food nutrition wellness diet',
  'kombucha':'healthy food drink nutrition wellness',
  'quinoa':'healthy food nutrition protein grain diet',
  'avocado':'healthy food nutrition fruit diet',
  'turmeric':'healthy food nutrition spice wellness',
  'matcha':'healthy food drink nutrition wellness',
  'keto':'healthy food nutrition diet fitness',
  'paleo':'healthy food nutrition diet',
  'vegan':'healthy food nutrition plant-based diet',
  'gluten-free':'healthy food nutrition diet',
  'protein':'healthy food nutrition fitness diet',
  'calorie':'healthy food nutrition diet fitness',
  'metabolism':'healthy food nutrition fitness wellness',
  'antioxidant':'healthy food nutrition wellness',
  'omega':'healthy food nutrition health wellness',
  'fiber':'healthy food nutrition health diet',
  'prebiotic':'healthy food nutrition gut health',
  // Art / gallery specific
  'fresco':'art painting gallery culture',
  'mosaic':'art gallery culture creative',
  'lithograph':'art print gallery culture',
  'watercolor':'art painting gallery creative',
  'acrylic':'art painting gallery creative',
  'oil painting':'art painting gallery culture',
  'printmaking':'art gallery culture creative',
  'ceramics':'art craft gallery culture',
  'pottery':'art craft gallery culture',
  'calligraphy':'art design gallery culture',
  'graffiti':'art street creative culture gallery',
  'mural':'art public gallery culture creative',
  'exhibit':'art gallery museum culture',
  'curator':'art gallery museum culture',
  'installation':'art gallery museum culture',
  // Marketing / digital specific
  'hashtag':'social media marketing digital content',
  'influencer':'social media marketing digital branding',
  'viral':'social media marketing digital content',
  'engagement':'social media marketing digital branding',
  'analytics':'marketing digital technology data',
  'seo':'marketing digital internet technology',
  'ppc':'marketing digital advertising',
  'copywriting':'marketing content creative writing',
  'ux':'technology digital design marketing',
  'app':'technology digital marketing',
  'podcast':'digital content marketing media',
  'youtube':'digital content marketing media social',
  'instagram':'social media marketing digital branding',
  'tiktok':'social media marketing digital branding',
  // Construction / real estate overlap
  'lumber':'construction building wood home',
  'concrete':'construction building foundation home',
  'drywall':'construction building home renovation',
  'framing':'construction building home architecture',
  'roofing':'construction building home renovation',
  'flooring':'construction home renovation real estate interior',
  'plumbing':'construction home renovation building',
  'electrical':'construction home renovation building',
  'insulation':'construction home building energy',
  'curb appeal':'real estate home selling property listing',
  'open house':'real estate home selling buying listing',
  'neighborhood':'real estate home community property',
}

// Expand a text string using synonym map
function expandText(text) {
  const lower = text.toLowerCase()
  let expanded = lower
  for (const [term, expansion] of Object.entries(SYNONYMS)) {
    if (lower.includes(term)) {
      expanded += ' ' + expansion
    }
  }
  return expanded
}

// Brand primary category affinity
const CATEGORY_AFFINITY = {
  'Aesthetic Revival':          ['Health', 'Relationships', 'Cause', 'Seasonal', 'Special Interest'],
  'MJI Capital':                ['Finance', 'Business', 'Technology', 'Federal', 'Special Interest'],
  'Anticus':                    ['Arts & Entertainment', 'Cultural', 'Cause', 'Special Interest'],
  'Cre8tive Influence':         ['Technology', 'Business', 'Arts & Entertainment', 'Fun', 'Cultural'],
  'Cut Throat Barbershoppe':    ['Special Interest', 'Fun', 'Cultural', 'Relationships', 'Health'],
  'Desert Kings Falconry':      ['Animals', 'Cause', 'Seasonal', 'Sports', 'Special Interest'],
  'Dillinger Motor Company':    ['Sports', 'Special Interest', 'Seasonal', 'Fun', 'Cultural'],
  'Mountain West Construction': ['Cause', 'Special Interest', 'Seasonal', 'Federal', 'Business'],
  'Mcdonald Team':              ['Relationships', 'Cause', 'Seasonal', 'Federal', 'Special Interest', 'Business'],
  'Oak Creek Vineyards':        ['Food & Beverage', 'Cultural', 'Relationships', 'Federal', 'Seasonal'],
  'Tailored Bites':             ['Food & Beverage', 'Health', 'Cause', 'Seasonal', 'Special Interest'],
}

// Massively expanded brand keywords
const BRAND_KEYWORDS = {
  'Aesthetic Revival': [
    'spa','beauty','skin','self-care','wellness','facial','massage','relax',
    'meditation','yoga','aromatherapy','pampering','holistic','health','glow',
    'clean','fresh','radiant','body','serenity','peace','bath','hygiene',
    'lotion','scrub','pedicure','manicure','wax','exfoliat','hydrat','serum',
    'moisturiz','collagen','detox','cleanse','self love','self care',
    'mindfulness','breathe','balance','restore','rejuvenat','refresh','nourish',
    'soothe','calm','unwind','treat yourself','me time','pamper','luxur',
    'ritual','routine','glow up','skincare','body care','hair care',
  ],
  'MJI Capital': [
    'finance','money','investment','lending','mortgage','banking','wealth',
    'economy','financial','loan','credit','capital','funding','entrepreneur',
    'business','savings','tax','budget','market','investor','property','asset',
    'investing','compound interest','equity','portfolio','dividend',
    'stock market','cryptocurrency','blockchain','bitcoin','loan','interest rate',
    'cash flow','net worth','income','revenue','profit','return','risk',
    'diversify','liquidity','hard money','private lending','debt','liability',
    'financial freedom','passive income','financial literacy','money management',
    'inflation','recession','economic','fiscal','monetary','trade',
  ],
  'Anticus': [
    'art','painting','sculpture','creative','artist','museum','gallery','craft',
    'drawing','photography','illustration','design','culture','exhibit','canvas',
    'poetry','theater','dance','music','performance','literary','book','film',
    'comedy','creativity','imagination','expression','fresco','mosaic',
    'lithograph','watercolor','acrylic','oil painting','printmaking','ceramics',
    'pottery','calligraphy','graffiti','mural','curator','installation',
    'contemporary art','fine art','abstract','portrait','landscape','still life',
    'mixed media','collage','conceptual','avant-garde','renaissance','baroque',
    'impressionist','surreal','modern art','folk art','street art','digital art',
  ],
  'Cre8tive Influence': [
    'social media','marketing','digital','branding','advertising','content',
    'online','technology','communication','internet','influencer','campaign',
    'seo','hashtag','viral','engagement','analytics','ppc','copywriting',
    'ux','app','podcast','youtube','instagram','tiktok','facebook','linkedin',
    'brand','strategy','agency','innovation','tech','launch','trend','media',
    'press','creative','photography','video','growth','funnel','conversion',
    'audience','reach','impressions','click','traffic','keyword','backlink',
    'email marketing','newsletter','automation','crm','lead generation',
    'content creator','digital media','social','platform','algorithm',
  ],
  'Cut Throat Barbershoppe': [
    'barber','haircut','grooming','shaving','beard','hair','fade','trim',
    'men','gentleman','style','razor','straight razor','hot towel','lineup',
    'pompadour','pomade','aftershave','mustache','cut','salon','sharp',
    'scotch','whiskey','classic','retro','vintage','dapper','well-groomed',
    'hair loss','scalp','dandruff','taper','undercut','skin fade','zero fade',
    'crew cut','buzz cut','cesar cut','textured','hair product','wax','clay',
    'gel','mousse','comb','barber chair','old school','traditional','artisan',
    'masculine','mens style','menswear','mens grooming','bald','lineup','edge',
  ],
  'Desert Kings Falconry': [
    'falcon','falconry','peregrine','gyrfalcon','goshawk','kestrel','osprey',
    'raptor','bird of prey','hawk','eagle','condor','owl','bird','wildlife',
    'nature','animal','hunting','wild','creature','feather','flight','sky',
    'predator','zoo','pet','habitat','endangered','reptile','snake','cat',
    'dog','elephant','penguin','bear','deer','conservation','species',
    'birdwatching','birding','ornithology','migration','nest','flock',
    'sanctuary','reserve','ecosystem','biodiversity','animal day','world animal',
    'wildlife day','nature day','environment','outdoor','adventure','desert',
    'predator','soaring','flight','wings','talon','beak','prey','hunt',
  ],
  'Dillinger Motor Company': [
    'motorcycle','bike','riding','motor','engine','road','vehicle','mechanic',
    'automotive','biker','chopper','ride','race','speed','gear','freedom',
    'road trip','adventure','open road','classic','vintage','harley','custom',
    'motorbike','moto','v-twin','two-wheel','cruiser','sport bike','touring',
    'dirt bike','off-road','trail','route','highway','throttle','exhaust',
    'horsepower','torque','clutch','carburetor','fuel','spark plug','oil change',
    'tire','wheel','brake','suspension','handlebar','saddlebag','leather',
    'helmet','jacket','gloves','biker culture','freedom','open road',
    'independence','rebel','route 66','american made','iron','steel','chrome',
  ],
  'Mountain West Construction': [
    'construction','building','home','renovation','contractor','architecture',
    'engineering','remodeling','infrastructure','builder','repair','house',
    'project','foundation','concrete','wood','lumber','frame','tool','worker',
    'earth','environment','green','energy','sustainability','outdoor','craft',
    'renovation','remodel','blueprint','permit','roofing','flooring','plumbing',
    'electrical','insulation','drywall','framing','siding','deck','patio',
    'fence','garage','shed','addition','extension','commercial','residential',
    'structural','load-bearing','zoning','code','inspection','survey','design',
    'landscape','excavation','grading','demolition','restore','preserve',
    'green building','solar','energy efficient','smart home','custom home',
  ],
  'Mcdonald Team': [
    'real estate','home','property','house','buying','selling','housing',
    'neighborhood','community','agent','listing','open house','invest',
    'mortgage','rent','family','move','relocation','market','dream home',
    'curb appeal','interior','new home','first home','down payment','closing',
    'escrow','appraisal','equity','appreciation','rental','landlord','tenant',
    'commercial','residential','condo','townhome','single family','multi-family',
    'suburb','urban','rural','location','school district','walkable','commute',
    'homeowner','housewarming','moving','staging','inspection','offer','bid',
    'negotiation','contract','deed','title','refinance','home value','zillow',
  ],
  'Oak Creek Vineyards': [
    'wine','winery','vineyard','grape','tasting','bottle','cellar','harvest',
    'cocktail','drink','beverage','celebration','toast','cheers','beer',
    'spirits','champagne','prosecco','sangria','brandy','rum','gin','whiskey',
    'margarita','mojito','daiquiri','cider','brewing','distillery','bar',
    'malbec','cabernet','chardonnay','pinot','shiraz','syrah','merlot',
    'sauvignon','riesling','zinfandel','rosé','grenache','tempranillo',
    'nebbiolo','barolo','chianti','rioja','amarone','port','sherry',
    'sommelier','oenophile','terroir','vintage','cellar','barrel','ferment',
    'crush','varietal','appellation','blend','reserve','estate','red wine',
    'white wine','sparkling wine','dessert wine','wine pairing','food pairing',
    'uncork','pour','sip','taste','aroma','bouquet','tannin','dry','sweet',
    'craft beer','ale','lager','stout','ipa','pale ale','brewery','hops','malt',
    'scotch','bourbon','tequila','vodka','liqueur','aperitif','digestif','mixology',
  ],
  'Tailored Bites': [
    'food','healthy','nutrition','snack','diet','organic','eating','vegetable',
    'fruit','protein','meal','recipe','cook','bake','lunch','breakfast','vegan',
    'plant-based','whole food','clean eating','fresh','salad','smoothie',
    'superfood','wellness','body','fitness','energy','grain','nut','seed',
    'probiotic','kombucha','quinoa','avocado','turmeric','matcha','keto',
    'paleo','gluten-free','calorie','metabolism','antioxidant','omega','fiber',
    'prebiotic','kale','spinach','broccoli','beetroot','sweet potato','lentil',
    'chickpea','tofu','tempeh','almond','walnut','chia','flaxseed','hemp',
    'acai','goji','spirulina','chlorella','wheatgrass','bone broth','collagen',
    'intermittent fasting','meal prep','portion control','macros','micronutrients',
    'hydration','water intake','electrolyte','mineral','vitamin','supplement',
    'protein bar','energy bar','granola','trail mix','hummus','tahini',
    'fermented','probiotic','gut health','digestive','detox','cleanse',
    'sustainable','local','farm-to-table','seasonal','artisan','craft food',
    'food truck','catering','meal kit','subscription box','healthy snack',
  ],
}

// Universal holidays all brands should mark
const UNIVERSAL_TITLES = [
  "new year's day","new year's eve","independence day","thanksgiving",
  "christmas day","christmas eve","halloween","valentine's day",
  "mother's day","father's day","labor day","memorial day",
  "martin luther king","juneteenth","veterans day","earth day",
  "international women's day","st. patrick's day","cinco de mayo",
  "small business saturday","world health day","national social media day",
]

// Returns { brandId: score } map for a holiday
export function scoreholidayAllBrands(holiday, brands) {
  const raw = {}
  for (const brand of brands) {
    raw[brand.id] = scoreHolidayForBrand(holiday, brand.name)
  }
  return raw
}

// Two-tier classification:
// HIGH  (≥7) → auto-match, no AI needed
// LOW   (<4) → skip, no brand fit
// UNSURE(4-6) → send to AI for final decision
export function classifyHolidays(holidays, brands) {
  const autoMatched = []   // { ...holiday, brandIds: [...] }
  const needsAI     = []   // holidays where AI should decide
  const skipped     = []   // no brand fit at all

  for (const holiday of holidays) {
    const scores = scoreholidayAllBrands(holiday, brands)
    const highBrands   = brands.filter(b => scores[b.id] >= 7).map(b => b.id)
    const mediumBrands = brands.filter(b => scores[b.id] >= 4 && scores[b.id] < 7).map(b => b.id)
    const maxScore     = Math.max(...Object.values(scores))

    if (highBrands.length > 0) {
      // Confident match — skip AI, auto-assign
      autoMatched.push({ ...holiday, brandIds: highBrands, matchedBy: 'keyword' })
    } else if (maxScore >= 4 || isUniversalHoliday(holiday)) {
      // Uncertain — let AI decide
      needsAI.push(holiday)
    } else {
      // No keyword signal at all — still send to AI (catches things like "Malbec World Day")
      // but only if the title isn't obviously irrelevant
      if (!isObviouslyIrrelevant(holiday)) {
        needsAI.push(holiday)
      } else {
        skipped.push(holiday)
      }
    }
  }

  return { autoMatched, needsAI, skipped }
}

function isUniversalHoliday(holiday) {
  const t = holiday.title.toLowerCase()
  return UNIVERSAL_TITLES.some(u => t.includes(u))
}

function isObviouslyIrrelevant(holiday) {
  // Skip things like specific person birthdays, hyper-niche days with no brand angle
  const t = holiday.title.toLowerCase()
  const irrelevantPatterns = [
    'birthday of', 'anniversary of', 'death of', 'battle of',
    'treaty of', 'invasion of', 'surrender of',
  ]
  return irrelevantPatterns.some(p => t.includes(p))
}

function scoreHolidayForBrand(holiday, brandName) {
  const rawTitle = (holiday.title || '').toLowerCase()
  const rawTags = (holiday.tags || '').toLowerCase()
  const rawDesc = (holiday.description || '').toLowerCase()
  const category = holiday.category || ''

  // Expand all text via synonym map
  const title = expandText(rawTitle)
  const tags = expandText(rawTags)
  const desc = expandText(rawDesc)
  const haystack = `${title} ${tags} ${desc}`

  let score = 0

  // 1. Universal holiday — every brand gets it
  if (UNIVERSAL_TITLES.some(u => rawTitle.includes(u))) score += 5

  // 2. Category affinity
  const affinities = CATEGORY_AFFINITY[brandName] || []
  if (affinities.includes(category)) score += 3

  // 3. Keyword in TITLE (strongest signal — before expansion)
  const keywords = BRAND_KEYWORDS[brandName] || []
  for (const kw of keywords) {
    if (rawTitle.includes(kw)) { score += 5; break }
  }

  // 4. Keyword in EXPANDED haystack
  let kwMatches = 0
  for (const kw of keywords) {
    if (haystack.includes(kw)) {
      kwMatches++
      if (kwMatches >= 4) break
    }
  }
  score += kwMatches * 2

  return score
}

export function matchAllHolidaysToAllBrands(holidays, brands) {
  const result = {}
  for (const holiday of holidays) {
    const ids = brands.filter(b => scoreHolidayForBrand(holiday, b.name) >= 4).map(b => b.id)
    if (ids.length > 0) result[holiday.id] = ids
  }
  return result
}

export function scoreHolidayForBrandById(event, brand) {
  return scoreHolidayForBrand(event, brand.name)
}
