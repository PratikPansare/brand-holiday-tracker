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
import PasteImportModal from './components/PasteImportModal'
import Toast from './components/Toast'
import { useLocalStorage } from './hooks/useLocalStorage'
import { checkNotifications, scheduleNotification, showToast } from './utils/notifications'
import { getStoredToken } from './utils/googleCalendar'
import { matchAllHolidaysToAllBrands, classifyHolidays } from './utils/matching'
import { getHolidaysForMonths } from './utils/holidayDatabase'
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
  const [showPasteImport, setShowPasteImport] = useState(false)
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
      const monthsToFetch = settings.monthsToFetch || 1
      const now = new Date()
      const monthList = []
      for (let i = 0; i < monthsToFetch; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
        monthList.push({ month: d.getMonth() + 1, year: d.getFullYear() })
      }

      const geminiCallsNeeded = Math.ceil((monthList.length * 35) / 60)
      setFetchProgress(`Fetching ${monthsToFetch} month${monthsToFetch > 1 ? 's' : ''} (~${geminiCallsNeeded} AI call${geminiCallsNeeded > 1 ? 's' : ''})...`)

      // Load holidays instantly from built-in database — no network needed
      setFetchProgress(`Loading ${monthsToFetch} month${monthsToFetch > 1 ? 's' : ''} of holidays...`)
      const allHolidays = getHolidaysForMonths(monthList)

      if (allHolidays.length === 0) {
        showToast('No holidays found', 'Database error — please refresh the page', 'error')
        return
      }

      setFetchProgress(`Loaded ${allHolidays.length} holidays — running smart pre-filter...`)

      // Tag each holiday with a stable ID, skip already stored ones
      const existingIds = new Set(events.map(e => e.id))
      const newCandidates = allHolidays
        .map(h => ({ ...h, id: `h_${h.date}_${h.title.replace(/\W+/g, '_')}` }))
        .filter(h => !existingIds.has(h.id))

      if (newCandidates.length === 0) {
        showToast('Up to date', 'No new holidays to add', 'info')
        return
      }

      // ── TWO-TIER MATCHING ────────────────────────────────────────
      // Tier 1: keyword matching — instant, free, handles obvious cases
      const { autoMatched, needsAI } = classifyHolidays(newCandidates, brands)

      setFetchProgress(
        `Pre-filter: ${autoMatched.length} auto-matched ✓, ${needsAI.length} sent to AI...`
      )

      // Tier 2: AI only for uncertain holidays
      let aiMatches = {}
      if (needsAI.length > 0) {
        if (settings.geminiApiKey) {
          try {
            aiMatches = await matchHolidaysWithAI(needsAI, brands, settings.geminiApiKey, setFetchProgress)
          } catch (aiErr) {
            showToast('AI matching failed', aiErr.message + ' — using keyword fallback', 'error')
            aiMatches = matchAllHolidaysToAllBrands(needsAI, brands)
          }
        } else {
          aiMatches = matchAllHolidaysToAllBrands(needsAI, brands)
        }
      }

      // Merge both tiers into final events
      const newEvents = [
        // Tier 1 auto-matches
        ...autoMatched.map(h => ({
          id: h.id, title: h.title, date: h.date,
          description: h.description || '', category: h.category || '',
          tags: h.tags || '', brandIds: h.brandIds,
          isManual: false, pushed: false, notified: false,
          matchedBy: 'keyword',
        })),
        // Tier 2 AI matches
        ...needsAI
          .filter(h => (aiMatches[h.id] || []).length > 0)
          .map(h => ({
            id: h.id, title: h.title, date: h.date,
            description: h.description || '', category: h.category || '',
            tags: h.tags || '', brandIds: aiMatches[h.id],
            isManual: false, pushed: false, notified: false,
            matchedBy: settings.geminiApiKey ? 'ai' : 'keyword',
          })),
      ]

      setEvents(prev => [...prev, ...newEvents])
      setSettings(s => ({ ...s, lastFetch: new Date().toISOString() }))

      const aiCount = newEvents.filter(e => e.matchedBy === 'ai').length
      const kwCount = newEvents.filter(e => e.matchedBy === 'keyword').length
      const method = settings.geminiApiKey ? `${kwCount} keyword + ${aiCount} AI` : 'keyword matching'
      showToast(
        `${newEvents.length} holidays matched ✓`,
        `${method} — Brand Schedule updated`,
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

  const handlePasteImport = async (rawHolidays) => {
    if (rawHolidays.length === 0) return
    setFetching(true)
    setFetchProgress('Matching imported holidays to brands...')
    try {
      // Apply current year to MM-DD dates for display/sorting
      const currentYear = new Date().getFullYear()
      const withYear = rawHolidays.map(h => ({
        ...h,
        // If date is MM-DD format, prefix with current year
        date: h.date.length === 5 ? `${currentYear}-${h.date}` : h.date,
        mmdd: h.date.length === 5 ? h.date : h.date.slice(5), // store original MM-DD
      }))

      const { autoMatched, needsAI } = classifyHolidays(withYear, brands)
      let aiMatches = {}
      if (needsAI.length > 0 && settings.geminiApiKey) {
        try {
          aiMatches = await matchHolidaysWithAI(needsAI, brands, settings.geminiApiKey, setFetchProgress)
        } catch {
          aiMatches = matchAllHolidaysToAllBrands(needsAI, brands)
        }
      } else {
        aiMatches = matchAllHolidaysToAllBrands(needsAI, brands)
      }

      const newEvents = [
        ...autoMatched.map(h => ({ ...h, isManual: false, pushed: false, notified: false, matchedBy: 'keyword' })),
        ...needsAI.filter(h => (aiMatches[h.id]||[]).length > 0).map(h => ({
          ...h, brandIds: aiMatches[h.id], isManual: false, pushed: false, notified: false,
          matchedBy: settings.geminiApiKey ? 'ai' : 'keyword',
        })),
      ]

      setEvents(prev => [...prev, ...newEvents])
      const aiCount = newEvents.filter(e => e.matchedBy === 'ai').length
      const kwCount = newEvents.filter(e => e.matchedBy === 'keyword').length
      showToast(`${newEvents.length} holidays imported ✓`, `${kwCount} keyword + ${aiCount} AI matched`, 'success')
      setView('schedule')
    } catch (err) {
      showToast('Import failed', err.message, 'error')
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
    dashboard: <Dashboard brands={brands} events={events} settings={settings} onAddEvent={() => setShowAddEvent(true)} onFetch={fetchHolidays} fetching={fetching} fetchProgress={fetchProgress} setEvents={setEvents} onGoSchedule={() => setView('schedule')} onPasteImport={() => setShowPasteImport(true)} />,
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
      {showPasteImport && (
        <PasteImportModal
          onClose={() => setShowPasteImport(false)}
          onImport={handlePasteImport}
          existingEventIds={new Set(events.map(e => e.id))}
        />
      )}
      <Toast />
    </div>
  )
}
