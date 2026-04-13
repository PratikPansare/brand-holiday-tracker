import { useState, useEffect } from 'react'
import { Menu, Plus } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import BrandsView from './components/BrandsView'
import BrandScheduleView from './components/BrandScheduleView'
import CalendarView from './components/CalendarView'
import EventsView from './components/EventsView'
import Settings from './components/Settings'
import AddEventModal from './components/AddEventModal'
import Toast from './components/Toast'
import { useLocalStorage } from './hooks/useLocalStorage'
import { checkNotifications, scheduleNotification, showToast } from './utils/notifications'
import { getStoredToken } from './utils/googleCalendar'
import { matchAllHolidaysToAllBrands } from './utils/matching'
import { scrapeHolidaysForMonths } from './utils/webScraper'
import { matchHolidaysWithAI } from './utils/aiMatching'

const SAMPLE_BRANDS = [
  { id: '1',  name: 'Aesthetic Revival',          category: 'Spa & Wellness',        color: '#E8A020' },
  { id: '2',  name: 'MJI Capital',                category: 'Hard Money Lending',    color: '#38B2F0' },
  { id: '3',  name: 'Anticus',                    category: 'Art Gallery',           color: '#AB47BC' },
  { id: '4',  name: 'Cre8tive Influence',         category: 'Digital Marketing',     color: '#7B5FF5' },
  { id: '5',  name: 'Cut Throat Barbershoppe',    category: 'Barber Shop',           color: '#E84055' },
  { id: '6',  name: 'Desert Kings Falconry',      category: 'Falconry / YouTube',    color: '#F06292' },
  { id: '7',  name: 'Dillinger Motor Company',    category: 'Bike Service & Repair', color: '#FF7043' },
  { id: '8',  name: 'Mountain West Construction', category: 'Construction',          color: '#4DB6AC' },
  { id: '9',  name: 'Mcdonald Team',              category: 'Real Estate',           color: '#26A69A' },
  { id: '10', name: 'Oak Creek Vineyards',        category: 'Winery',                color: '#9C27B0' },
  { id: '11', name: 'Tailored Bites',             category: 'Healthy Food Snacks',   color: '#20C07A' },
]

export default function App() {
  const [view, setView] = useState('schedule')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [brands, setBrands] = useLocalStorage('brands', SAMPLE_BRANDS)
  const [events, setEvents] = useLocalStorage('events', [])
  const [settings, setSettings] = useLocalStorage('settings', {
    googleCalendarConnected: false,
    notificationsEnabled: false,
    googleToken: null,
    googleClientId: '',
    geminiApiKey: '',
    lastFetch: null,
  })
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [fetchProgress, setFetchProgress] = useState('')

  useEffect(() => {
    if (settings.notificationsEnabled) checkNotifications(events, brands)
    const storedToken = getStoredToken()
    if (storedToken && !settings.googleToken) {
      setSettings(s => ({ ...s, googleToken: storedToken, googleCalendarConnected: true }))
    }
  }, [])

  const fetchHolidays = async () => {
    if (fetching) return
    setFetching(true)
    setFetchProgress('Starting...')

    try {
      // Build list of next 3 months
      const now = new Date()
      const monthList = []
      for (let i = 0; i < 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
        monthList.push({ month: d.getMonth() + 1, year: d.getFullYear() })
      }

      // Step 1: Scrape nationaltoday.com via CORS proxy
      let allHolidays = []
      try {
        setFetchProgress('Reading nationaltoday.com...')
        allHolidays = await scrapeHolidaysForMonths(monthList, setFetchProgress)
      } catch (scrapeErr) {
        // Fallback to Netlify static function
        setFetchProgress('Using built-in database...')
        for (const { month, year } of monthList) {
          const res = await fetch(`/api/fetch-holidays?month=${month}&year=${year}`)
          if (!res.ok) continue
          const data = await res.json()
          allHolidays = allHolidays.concat(data.holidays || [])
        }
      }

      if (allHolidays.length === 0) {
        showToast('No holidays found', 'Could not load holiday data', 'error')
        return
      }

      setFetchProgress(`Loaded ${allHolidays.length} holidays — now matching to brands...`)

      // Tag each holiday with a stable ID
      const candidates = allHolidays.map(h => ({
        ...h,
        id: `h_${h.date}_${h.title.replace(/\W+/g, '_')}`,
      }))

      // Remove already-stored ones
      const existingIds = new Set(events.map(e => e.id))
      const newCandidates = candidates.filter(h => !existingIds.has(h.id))

      if (newCandidates.length === 0) {
        showToast('Up to date', 'No new holidays to add', 'info')
        return
      }

      // Step 2: Match — AI if key available, else smart keyword matching
      let matches = {}
      if (settings.geminiApiKey) {
        try {
          setFetchProgress('AI is analysing holidays for each brand...')
          matches = await matchHolidaysWithAI(newCandidates, brands, settings.geminiApiKey, setFetchProgress)
          setFetchProgress('AI matching complete ✓')
        } catch (aiErr) {
          showToast('AI matching failed', aiErr.message + ' — falling back to keyword matching', 'error')
          matches = matchAllHolidaysToAllBrands(newCandidates, brands)
        }
      } else {
        setFetchProgress('Applying smart keyword matching...')
        matches = matchAllHolidaysToAllBrands(newCandidates, brands)
      }

      // Build new events
      const newEvents = newCandidates
        .filter(h => (matches[h.id] || []).length > 0)
        .map(h => ({
          id: h.id,
          title: h.title,
          date: h.date,
          description: h.description || '',
          category: h.category || '',
          tags: h.tags || '',
          brandIds: matches[h.id],
          isManual: false,
          pushed: false,
          notified: false,
          url: h.url || '',
        }))

      setEvents(prev => [...prev, ...newEvents])
      setSettings(s => ({ ...s, lastFetch: new Date().toISOString() }))

      const method = settings.geminiApiKey ? 'AI' : 'keyword'
      showToast(
        `${newEvents.length} holidays matched ✓`,
        `Used ${method} matching across ${brands.length} brands`,
        'success'
      )
      setView('schedule')

    } catch (err) {
      console.error(err)
      showToast('Fetch failed', err.message, 'error')
    } finally {
      setFetching(false)
      setFetchProgress('')
    }
  }

  const handleAddEvent = (form) => {
    const event = { ...form, id: Date.now().toString(), isManual: true, pushed: false, notified: false }
    setEvents(prev => [...prev, event])
    if (settings.notificationsEnabled) scheduleNotification(event, brands, form.notifyDays ?? 1)
    setShowAddEvent(false)
    showToast('Event added ✓', form.title, 'success')
  }

  const views = {
    dashboard: <Dashboard brands={brands} events={events} settings={settings} onAddEvent={() => setShowAddEvent(true)} onFetch={fetchHolidays} fetching={fetching} fetchProgress={fetchProgress} setEvents={setEvents} onGoSchedule={() => setView('schedule')} />,
    brands:    <BrandsView brands={brands} setBrands={setBrands} events={events} />,
    schedule:  <BrandScheduleView brands={brands} events={events} />,
    calendar:  <CalendarView brands={brands} events={events} />,
    events:    <EventsView brands={brands} events={events} setEvents={setEvents} settings={settings} />,
    settings:  <Settings settings={settings} setSettings={setSettings} events={events} brands={brands} />,
  }

  return (
    <div className="app">
      <header className="mobile-header">
        <button className="hamburger" onClick={() => setSidebarOpen(true)}>
          <Menu size={22} />
        </button>
        <span className="mobile-logo">BrandTrack</span>
        <button className="mobile-add-btn" onClick={() => setShowAddEvent(true)}>
          <Plus size={13} /> Add
        </button>
      </header>

      <Sidebar view={view} setView={setView} onAddEvent={() => setShowAddEvent(true)} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">{views[view]}</main>

      {showAddEvent && <AddEventModal brands={brands} onClose={() => setShowAddEvent(false)} onAdd={handleAddEvent} />}
      <Toast />
    </div>
  )
}
