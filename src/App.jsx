import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import BrandsView from './components/BrandsView'
import CalendarView from './components/CalendarView'
import EventsView from './components/EventsView'
import Settings from './components/Settings'
import AddEventModal from './components/AddEventModal'
import Toast from './components/Toast'
import { useLocalStorage } from './hooks/useLocalStorage'
import { checkNotifications, scheduleNotification, showToast } from './utils/notifications'
import { getStoredToken } from './utils/googleCalendar'

const SAMPLE_BRANDS = [
  { id: '1', name: 'Aesthetic Revival', category: 'Skincare', color: '#E8A020', keywords: ['beauty', 'skincare', 'wellness', 'self-care', 'health', 'skin'] },
  { id: '2', name: 'Cre8tive Influence', category: 'Agency/Marketing', color: '#7B5FF5', keywords: ['creative', 'agency', 'design', 'marketing', 'social media', 'digital'] },
  { id: '3', name: 'Tailored Bites', category: 'Food & Beverage', color: '#E84055', keywords: ['food', 'cooking', 'recipe', 'restaurant', 'eating', 'beverage', 'drink'] },
  { id: '4', name: 'Desert Kings', category: 'Lifestyle', color: '#20C07A', keywords: ['lifestyle', 'adventure', 'outdoor', 'travel', 'animals', 'nature'] },
]

// Match holidays to brands based on keyword overlap
function matchHolidayToBrands(holiday, brands) {
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
  const [settings, setSettings] = useLocalStorage('settings', {
    googleCalendarConnected: false,
    notificationsEnabled: false,
    googleToken: null,
    googleClientId: '',
    lastFetch: null,
  })
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [fetching, setFetching] = useState(false)

  // Check notifications on load
  useEffect(() => {
    if (settings.notificationsEnabled) {
      checkNotifications(events, brands)
    }
    // Restore Google token from localStorage if valid
    const storedToken = getStoredToken()
    if (storedToken && !settings.googleToken) {
      setSettings(s => ({ ...s, googleToken: storedToken, googleCalendarConnected: true }))
    }
  }, [])

  // Fetch holidays from Netlify function
  const fetchHolidays = async () => {
    if (fetching) return
    setFetching(true)
    try {
      const now = new Date()
      const months = [
        { month: now.getMonth() + 1, year: now.getFullYear() },
        { month: now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2, year: now.getMonth() + 2 > 12 ? now.getFullYear() + 1 : now.getFullYear() },
        { month: now.getMonth() + 3 > 12 ? now.getMonth() + 3 - 12 : now.getMonth() + 3, year: now.getMonth() + 3 > 12 ? now.getFullYear() + 1 : now.getFullYear() },
      ]

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

      let added = 0
      const newEvents = []

      for (const holiday of allHolidays) {
        const exists = events.find(e => e.date === holiday.date && e.title === holiday.title)
        if (exists) continue
        const brandIds = matchHolidayToBrands(holiday, brands)
        if (brandIds.length === 0) continue // Only import holidays that match at least one brand
        newEvents.push({
          id: `h_${holiday.date}_${holiday.title.replace(/\s+/g, '_')}`,
          title: holiday.title,
          date: holiday.date,
          description: holiday.description || '',
          brandIds,
          isManual: false,
          pushed: false,
          notified: false,
          source: 'nationaltoday.com',
        })
        added++
      }

      if (added > 0) {
        setEvents(prev => {
          const merged = [...prev]
          for (const e of newEvents) {
            if (!merged.find(x => x.id === e.id)) merged.push(e)
          }
          return merged
        })
        setSettings(s => ({ ...s, lastFetch: new Date().toISOString() }))
        showToast(`Fetched ${added} holidays ✓`, 'Matched to your brands', 'success')
      } else {
        showToast('No new matches', `Found ${allHolidays.length} holidays but none matched your brand keywords`, 'info')
      }
    } catch (err) {
      console.error(err)
      showToast('Fetch failed', 'Could not reach the holiday service', 'error')
    } finally {
      setFetching(false)
    }
  }

  const handleAddEvent = (form) => {
    const event = {
      ...form,
      id: Date.now().toString(),
      isManual: true,
      pushed: false,
      notified: false,
    }
    setEvents(prev => [...prev, event])
    if (settings.notificationsEnabled) {
      scheduleNotification(event, brands, form.notifyDays ?? 1)
    }
    setShowAddEvent(false)
    showToast('Event added ✓', form.title, 'success')
  }

  const views = {
    dashboard: (
      <Dashboard
        brands={brands}
        events={events}
        settings={settings}
        onAddEvent={() => setShowAddEvent(true)}
        onFetch={fetchHolidays}
        fetching={fetching}
        setEvents={setEvents}
      />
    ),
    brands: <BrandsView brands={brands} setBrands={setBrands} events={events} />,
    calendar: <CalendarView brands={brands} events={events} />,
    events: <EventsView brands={brands} events={events} setEvents={setEvents} settings={settings} />,
    settings: <Settings settings={settings} setSettings={setSettings} events={events} brands={brands} />,
  }

  return (
    <div className="app">
      <Sidebar view={view} setView={setView} onAddEvent={() => setShowAddEvent(true)} />
      <main className="main-content">
        {views[view]}
      </main>

      {showAddEvent && (
        <AddEventModal
          brands={brands}
          onClose={() => setShowAddEvent(false)}
          onAdd={handleAddEvent}
        />
      )}

      <Toast />
    </div>
  )
}
