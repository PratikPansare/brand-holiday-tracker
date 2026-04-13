import { useState, useEffect } from 'react'
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

  useEffect(() => {
    if (settings.notificationsEnabled) checkNotifications(events, brands)
    const storedToken = getStoredToken()
    if (storedToken && !settings.googleToken) {
      setSettings(s => ({ ...s, googleToken: storedToken, googleCalendarConnected: true }))
    }
  }, [])

  // Fetch all holidays → auto-match to brands → add directly to events
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

      // Build candidate holiday objects with IDs
      const candidates = allHolidays.map(h => ({
        ...h,
        id: `h_${h.date}_${h.title.replace(/\W+/g, '_')}`,
      }))

      // Run smart matching — returns { holidayId: [brandId, ...] }
      const matches = matchAllHolidaysToAllBrands(candidates, brands)

      // Merge into events, skipping duplicates
      const existingIds = new Set(events.map(e => e.id))
      const newEvents = []

      for (const holiday of candidates) {
        if (existingIds.has(holiday.id)) continue
        const brandIds = matches[holiday.id] || []
        if (brandIds.length === 0) continue // no brand matched — skip

        newEvents.push({
          id: holiday.id,
          title: holiday.title,
          date: holiday.date,
          description: holiday.description || '',
          category: holiday.category || '',
          tags: holiday.tags || '',
          brandIds,
          isManual: false,
          pushed: false,
          notified: false,
          source: 'nationaltoday.com',
          url: holiday.url || '',
        })
      }

      if (newEvents.length > 0) {
        setEvents(prev => [...prev, ...newEvents])
        setSettings(s => ({ ...s, lastFetch: new Date().toISOString() }))
        showToast(
          `${newEvents.length} holidays added ✓`,
          `Auto-matched across ${brands.length} brands — see Brand Schedule`,
          'success'
        )
        setView('schedule')
      } else {
        showToast('Up to date', 'No new holidays to add', 'info')
      }
    } catch (err) {
      console.error(err)
      showToast('Fetch failed', err.message, 'error')
    } finally {
      setFetching(false)
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
    dashboard: (
      <Dashboard
        brands={brands} events={events} settings={settings}
        onAddEvent={() => setShowAddEvent(true)}
        onFetch={fetchHolidays} fetching={fetching}
        setEvents={setEvents}
        onGoSchedule={() => setView('schedule')}
      />
    ),
    brands:   <BrandsView brands={brands} setBrands={setBrands} events={events} />,
    schedule: <BrandScheduleView brands={brands} events={events} />,
    calendar: <CalendarView brands={brands} events={events} />,
    events:   <EventsView brands={brands} events={events} setEvents={setEvents} settings={settings} />,
    settings: <Settings settings={settings} setSettings={setSettings} events={events} brands={brands} />,
  }

  return (
    <div className="app">
      <Sidebar view={view} setView={setView} onAddEvent={() => setShowAddEvent(true)} />
      <main className="main-content">{views[view]}</main>
      {showAddEvent && (
        <AddEventModal brands={brands} onClose={() => setShowAddEvent(false)} onAdd={handleAddEvent} />
      )}
      <Toast />
    </div>
  )
}
