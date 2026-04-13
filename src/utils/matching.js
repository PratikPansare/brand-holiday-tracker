// Smart holiday-to-brand matching — no AI API needed
// Uses weighted scoring across title, tags, category, and brand-specific rules

// Category → brand affinity map (which categories naturally suit which brands)
const CATEGORY_AFFINITY = {
  'Aesthetic Revival': ['Health', 'Relationships', 'Cause', 'Seasonal'],
  'MJI Capital': ['Finance', 'Business', 'Technology', 'Federal'],
  'Anticus': ['Arts & Entertainment', 'Cultural', 'Cause', 'Special Interest'],
  'Cre8tive Influence': ['Technology', 'Business', 'Arts & Entertainment', 'Fun'],
  'Cut Throat Barbershoppe': ['Special Interest', 'Fun', 'Cultural', 'Relationships'],
  'Desert Kings Falconry': ['Animals', 'Cause', 'Seasonal', 'Sports'],
  'Dillinger Motor Company': ['Sports', 'Special Interest', 'Seasonal', 'Fun'],
  'Mountain West Construction': ['Cause', 'Special Interest', 'Seasonal', 'Federal'],
  'Mcdonald Team': ['Relationships', 'Cause', 'Seasonal', 'Federal', 'Special Interest'],
  'Oak Creek Vineyards': ['Food & Beverage', 'Cultural', 'Relationships', 'Federal'],
  'Tailored Bites': ['Food & Beverage', 'Health', 'Cause', 'Seasonal'],
}

// Title/tag keywords per brand — scored higher when found in holiday title
const BRAND_KEYWORDS = {
  'Aesthetic Revival': [
    'spa','beauty','skin','self-care','wellness','facial','massage','relax',
    'meditation','yoga','aromatherapy','pampering','holistic','health','glow',
    'clean','fresh','radiant','body','serenity','peace','bath','hygiene','lotion'
  ],
  'MJI Capital': [
    'finance','money','investment','lending','mortgage','banking','wealth',
    'economy','financial','loan','credit','capital','funding','entrepreneur',
    'business','savings','tax','budget','market','investor','property','asset'
  ],
  'Anticus': [
    'art','painting','sculpture','creative','artist','museum','gallery','craft',
    'drawing','photography','illustration','design','culture','exhibit','canvas',
    'poetry','theater','dance','music','performance','literary','book','film',
    'comedy','creativity','imagination','expression'
  ],
  'Cre8tive Influence': [
    'social media','marketing','digital','branding','advertising','content',
    'online','technology','communication','internet','influencer','campaign',
    'seo','hashtag','viral','trend','media','press','creative','launch',
    'photography','video','brand','strategy','agency','innovation','tech'
  ],
  'Cut Throat Barbershoppe': [
    'barber','haircut','grooming','shaving','beard','hair','fade','trim',
    'men','gentleman','style','razor','mustache','cut','salon','sharp',
    'scotch','whiskey','classic','retro','vintage','gentleman','dapper'
  ],
  'Desert Kings Falconry': [
    'falcon','bird','wildlife','nature','animal','hawk','eagle','raptor',
    'outdoor','adventure','desert','conservation','hunting','wild','creature',
    'feather','flight','sky','predator','zoo','pet','habitat','endangered',
    'reptile','snake','cat','dog','elephant','penguin','bear','deer'
  ],
  'Dillinger Motor Company': [
    'motorcycle','bike','riding','motor','engine','road','vehicle','mechanic',
    'automotive','biker','chopper','ride','race','speed','gear','freedom',
    'road trip','adventure','open road','classic','vintage','harley','custom'
  ],
  'Mountain West Construction': [
    'construction','building','home','renovation','contractor','architecture',
    'engineering','remodeling','infrastructure','builder','repair','house',
    'project','foundation','concrete','wood','lumber','frame','tool','worker',
    'earth','environment','green','energy','sustainability','outdoor','craft'
  ],
  'Mcdonald Team': [
    'real estate','home','property','house','buying','selling','housing',
    'neighborhood','community','agent','listing','open house','invest',
    'mortgage','rent','family','move','relocation','market','dream home',
    'curb appeal','interior','new home','first home'
  ],
  'Oak Creek Vineyards': [
    'wine','winery','vineyard','grape','tasting','bottle','cellar','harvest',
    'cocktail','drink','beverage','celebration','toast','cheers','beer',
    'spirits','champagne','prosecco','sangria','brandy','rum','gin','whiskey',
    'margarita','mojito','daiquiri','cider','brewing','distillery','bar'
  ],
  'Tailored Bites': [
    'food','healthy','nutrition','snack','diet','organic','eating','vegetable',
    'fruit','protein','meal','recipe','cook','bake','lunch','breakfast','vegan',
    'plant-based','whole food','clean eating','fresh','salad','smoothie',
    'superFood','wellness','body','fitness','energy','grain','nut','seed'
  ],
}

// Universal holidays that every brand should mark (major cultural moments)
const UNIVERSAL_TITLES = [
  "new year's day","new year's eve","independence day","thanksgiving",
  "christmas day","christmas eve","halloween","valentine's day",
  "mother's day","father's day","labor day","memorial day",
  "martin luther king","juneteenth","veterans day","earth day",
  "international women's day","st. patrick's day","easter",
  "small business saturday","cinco de mayo"
]

function scoreHolidayForBrand(holiday, brandName) {
  const title = (holiday.title || '').toLowerCase()
  const tags = (holiday.tags || '').toLowerCase()
  const category = holiday.category || ''
  const description = (holiday.description || '').toLowerCase()
  const haystack = `${title} ${tags} ${description}`

  let score = 0

  // 1. Universal holidays — every brand gets these
  if (UNIVERSAL_TITLES.some(u => title.includes(u))) {
    score += 4
  }

  // 2. Category affinity — brand naturally suits this category
  const affinities = CATEGORY_AFFINITY[brandName] || []
  if (affinities.includes(category)) {
    score += 3
  }

  // 3. Keyword matching — brand keywords found in title/tags
  const keywords = BRAND_KEYWORDS[brandName] || []
  for (const kw of keywords) {
    if (title.includes(kw)) { score += 4; break } // title match is strongest
  }
  let tagMatches = 0
  for (const kw of keywords) {
    if (tags.includes(kw) || description.includes(kw)) {
      tagMatches++
      if (tagMatches >= 3) break
    }
  }
  score += tagMatches * 2

  return score
}

export function matchAllHolidaysToAllBrands(holidays, brands) {
  // Returns: { holidayId: [brandId, ...] }
  // Each holiday gets all brands where score >= threshold
  const THRESHOLD = 4

  const result = {}

  for (const holiday of holidays) {
    const matchedBrandIds = []
    for (const brand of brands) {
      const s = scoreHolidayForBrand(holiday, brand.name)
      if (s >= THRESHOLD) matchedBrandIds.push(brand.id)
    }
    if (matchedBrandIds.length > 0) {
      result[holiday.id] = matchedBrandIds
    }
  }

  return result
}

export function scoreHolidayForBrandById(holiday, brand) {
  return scoreHolidayForBrand(holiday, brand.name)
}
