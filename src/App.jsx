import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import BrandsView from './components/BrandsView'
import CalendarView from './components/CalendarView'
import EventsView from './components/EventsView'
import ReviewView from './components/ReviewView'
import Settings from './components/Settings'
import AddEventModal from './components/AddEventModal'
import Toast from './components/Toast'
import { useLocalStorage } from './hooks/useLocalStorage'
import { checkNotifications, scheduleNotification, showToast } from './utils/notifications'
import { getStoredToken } from './utils/googleCalendar'

const SAMPLE_BRANDS = [
  { id: '1',  name: 'Aesthetic Revival',        category: 'Spa & Wellness',        color: '#E8A020', keywords: ['spa', 'beauty', 'skincare', 'wellness', 'self-care', 'relaxation', 'massage', 'facial', 'skin', 'health', 'aromatherapy', 'meditation', 'yoga', 'holistic', 'pamper'] },
  { id: '2',  name: 'MJI Capital',              category: 'Hard Money Lending',    color: '#38B2F0', keywords: ['finance', 'money', 'investment', 'lending', 'mortgage', 'banking', 'wealth', 'economy', 'financial', 'loan', 'credit', 'capital', 'funding', 'entrepreneur', 'business'] },
  { id: '3',  name: 'Anticus',                  category: 'Art Gallery',           color: '#AB47BC', keywords: ['art', 'painting', 'sculpture', 'creativity', 'artist', 'museum', 'gallery', 'craft', 'drawing', 'photography', 'illustration', 'design', 'culture', 'creative', 'exhibit'] },
  { id: '4',  name: 'Cre8tive Influence',       category: 'Digital Marketing',     color: '#7B5FF5', keywords: ['social media', 'marketing', 'digital', 'branding', 'advertising', 'content', 'online', 'technology', 'communication', 'internet', 'influencer', 'campaign', 'seo'] },
  { id: '5',  name: 'Cut Throat Barbershoppe',  category: 'Barber Shop',           color: '#E84055', keywords: ['barber', 'haircut', 'grooming', 'shaving', 'beard', 'hair', 'style', 'men', 'gentleman', 'barbershop', 'fade', 'trim'] },
  { id: '6',  name: 'Desert Kings Falconry',    category: 'Falconry / YouTube',    color: '#F06292', keywords: ['falcon', 'bird', 'wildlife', 'nature', 'animal', 'hunting', 'hawk', 'eagle', 'raptor', 'outdoor', 'adventure', 'desert', 'conservation', 'pet', 'zoo', 'wild'] },
  { id: '7',  name: 'Dillinger Motor Company',  category: 'Bike Service & Repair', color: '#FF7043', keywords: ['motorcycle', 'bike', 'riding', 'motor', 'engine', 'road', 'vehicle', 'mechanics', 'automotive', 'biker', 'moto', 'chopper', 'harley', 'ride'] },
  { id: '8',  name: 'Mountain West Construction', category: 'Construction',        color: '#4DB6AC', keywords: ['construction', 'building', 'home', 'renovation', 'contractor', 'architecture', 'engineering', 'remodeling', 'infrastructure', 'builder', 'handyman', 'repair', 'house'] },
  { id: '9',  name: 'Mcdonald Team',            category: 'Real Estate',           color: '#26A69A', keywords: ['real estate', 'home', 'property', 'house', 'buying', 'selling', 'mortgage', 'housing', 'neighborhood', 'community', 'agent', 'listing', 'open house', 'invest'] },
  { id: '10', name: 'Oak Creek Vineyards',      category: 'Winery',                color: '#9C27B0', keywords: ['wine', 'winery', 'vineyard', 'grape', 'tasting', 'bottle', 'cellar', 'harvest', 'cocktail', 'drink', 'beverage', 'celebration', 'toast', 'cheers', 'beer', 'spirits'] },
  { id: '11', name: 'Tailored Bites',           category: 'Healthy Food Snacks',   color: '#20C07A', keywords: ['food', 'healthy', 'nutrition', 'snack', 'diet', 'organic', 'eating', 'vegetable', 'fruit', 'protein', 'meal', 'recipe', 'cook', 'bake', 'lunch', 'breakfast', 'vegan'] },
]

// Suggest brands based on keyword matching — used as a HINT only, user makes final call
function suggestBrandsForHoliday(holiday, brands) {
  const haystack = (holiday.title + ' ' + (holiday.description || '') + ' ' + (holiday.tags || '')).toLowerCase()
  return brands
    .filter(brand => {
      const keywords = Array.isArray(brand.keywords) ? brand.keywords : []
      return keywords.some(kw => haystack.includes(kw.toLowerCase()))
    })
    .map(b => b.id)
}

export default function App() {
  const [view, setView] = useState('dashboard')
  const [brands, setBrands] = useLocalStorage('brands', SAMPLE_BRANDS)
  const [events, setEvents] = useLocalStorage('events', [])
  const [pendingReview, setPendingReview] = useLocalStorage('pendingReview', [])
  const [settings, setSettings] = useLocalStorage('settings', {
    googleCalendarConnected: false,
    notificationsEnabled: false,
    googleToken: null,
    googleClientId: '',
    lastFetch: null,
  })
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (settings.notificationsEnabled) checkNotifications(events, brands)
    const storedToken = getStoredToken()
    if (storedToken && !settings.googleToken) {
      setSettings(s => ({ ...s, googleToken: storedToken, googleCalendarConnected: true }))
    }
  }, [])

  // Fetch ALL holidays for current + next 2 months, add to review queue
  const fetchHolidays = async () => {
    if (fetching) return
    setFetching(true)
    try {
      const now = new Date()
      const months = []
      for (let i = 0; i < 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
        months.push({ month: d.getMonth() + 1, year: d.getFullYear() })
      }

      let allHolidays = []
      for (const { month, year } of months) {
        const res = await fetch(`/api/fetch-holidays?month=${month}&year=${year}`)
        if (!res.ok) continue
        const data = await res.json()
        allHolidays = allHolidays.concat(data.holidays || [])
      }

      if (allHolidays.length === 0) {
        showToast('No holidays found', 'Check the Netlify function is deployed', 'error')
        return
      }

      // Add ALL holidays to review queue (skip already reviewed or already in events)
      const existingIds = new Set([
        ...events.map(e => e.id),
        ...pendingReview.map(e => e.id),
      ])

      const toReview = []
      for (const holiday of allHolidays) {
        const id = `h_${holiday.date}_${holiday.title.replace(/\s+/g, '_')}`
        if (existingIds.has(id)) continue
        // Suggest brands automatically as a starting point
        const suggestedBrandIds = suggestBrandsForHoliday(holiday, brands)
        toReview.push({
          id,
          title: holiday.title,
          date: holiday.date,
          description: holiday.description || '',
          brandIds: suggestedBrandIds, // pre-filled suggestions, user can change
          isManual: false,
          pushed: false,
          notified: false,
          source: 'nationaltoday.com',
          url: holiday.url || '',
        })
      }

      if (toReview.length > 0) {
        setPendingReview(prev => [...prev, ...toReview])
        setSettings(s => ({ ...s, lastFetch: new Date().toISOString() }))
        showToast(`${toReview.length} holidays ready to review`, 'Go to Review to assign brands & approve', 'success')
        setView('review')
      } else {
        showToast('All caught up', 'No new holidays to review', 'info')
      }
    } catch (err) {
      console.error(err)
      showToast('Fetch failed', 'Could not reach the holiday service', 'error')
    } finally {
      setFetching(false)
    }
  }

  // Approve a holiday from review — moves to events
  const handleApprove = (holidayId, brandIds) => {
    const holiday = pendingReview.find(h => h.id === holidayId)
    if (!holiday) return
    const approved = { ...holiday, brandIds, approved: true }
    setEvents(prev => [...prev, approved])
    setPendingReview(prev => prev.filter(h => h.id !== holidayId))
    if (settings.notificationsEnabled) scheduleNotification(approved, brands, 1)
  }

  // Dismiss a holiday from review — remove without adding to events
  const handleDismiss = (holidayId) => {
    setPendingReview(prev => prev.filter(h => h.id !== holidayId))
  }

  const handleAddEvent = (form) => {
    const event = { ...form, id: Date.now().toString(), isManual: true, pushed: false, notified: false }
    setEvents(prev => [...prev, event])
    if (settings.notificationsEnabled) scheduleNotification(event, brands, form.notifyDays ?? 1)
    setShowAddEvent(false)
    showToast('Event added ✓', form.title, 'success')
  }

  const views = {
    dashboard: (
      <Dashboard
        brands={brands} events={events} settings={settings}
        onAddEvent={() => setShowAddEvent(true)}
        onFetch={fetchHolidays} fetching={fetching}
        setEvents={setEvents} pendingCount={pendingReview.length}
        onGoReview={() => setView('review')}
      />
    ),
    brands:   <BrandsView brands={brands} setBrands={setBrands} events={events} />,
    review:   <ReviewView pending={pendingReview} brands={brands} onApprove={handleApprove} onDismiss={handleDismiss} onFetch={fetchHolidays} fetching={fetching} />,
    calendar: <CalendarView brands={brands} events={events} />,
    events:   <EventsView brands={brands} events={events} setEvents={setEvents} settings={settings} />,
    settings: <Settings settings={settings} setSettings={setSettings} events={events} brands={brands} />,
  }

  return (
    <div className="app">
      <Sidebar view={view} setView={setView} onAddEvent={() => setShowAddEvent(true)} pendingCount={pendingReview.length} />
      <main className="main-content">{views[view]}</main>
      {showAddEvent && (
        <AddEventModal brands={brands} onClose={() => setShowAddEvent(false)} onAdd={handleAddEvent} />
      )}
      <Toast />
    </div>
  )
}
