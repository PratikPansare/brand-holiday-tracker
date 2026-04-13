import { format, isToday, isTomorrow, parseISO, isThisWeek, addDays } from 'date-fns'
import { Plus, RefreshCw, Calendar, CalendarCheck, Tag, Zap } from 'lucide-react'
import { pushToGoogleCalendar } from '../utils/googleCalendar'
import { scheduleNotification, showToast } from '../utils/notifications'

export default function Dashboard({ brands, events, settings, onAddEvent, onFetch, fetching, setEvents }) {
  const today = new Date()
  const upcoming = events
    .filter(e => {
      const d = parseISO(e.date)
      return d >= today && d <= addDays(today, 30)
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10)

  const thisWeek = events.filter(e => isThisWeek(parseISO(e.date), { weekStartsOn: 1 }))
  const pushed = events.filter(e => e.pushed).length
  const manual = events.filter(e => e.isManual).length

  const handlePush = async (event) => {
    const token = settings.googleToken
    if (!token) { showToast('Not connected', 'Connect Google Calendar in Settings', 'error'); return }
    try {
      await pushToGoogleCalendar(event, brands, token)
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, pushed: true } : e))
      if (settings.notificationsEnabled) scheduleNotification(event, brands, 1)
      showToast('Added to Calendar', event.title, 'success')
    } catch {
      showToast('Error', 'Could not push to Google Calendar', 'error')
    }
  }

  const dateLabel = (dateStr) => {
    const d = parseISO(dateStr)
    if (isToday(d)) return 'Today'
    if (isTomorrow(d)) return 'Tomorrow'
    return format(d, 'MMM d')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{format(today, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={onFetch} disabled={fetching}>
            {fetching ? <span className="loading-spinner" /> : <RefreshCw size={14} />}
            {fetching ? 'Fetching...' : 'Fetch Holidays'}
          </button>
          <button className="btn btn-primary" onClick={onAddEvent}>
            <Plus size={14} /> Add Event
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card" style={{ '--accent': 'var(--gold)' }}>
          <div className="stat-label">Total Brands</div>
          <div className="stat-value">{brands.length}</div>
          <div className="stat-sub">Active tracking</div>
        </div>
        <div className="stat-card" style={{ '--accent': 'var(--violet)' }}>
          <div className="stat-label">This Week</div>
          <div className="stat-value">{thisWeek.length}</div>
          <div className="stat-sub">Events to post</div>
        </div>
        <div className="stat-card" style={{ '--accent': 'var(--green)' }}>
          <div className="stat-label">Pushed to Cal</div>
          <div className="stat-value">{pushed}</div>
          <div className="stat-sub">Calendar entries</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#E84055' }}>
          <div className="stat-label">Manual Events</div>
          <div className="stat-value">{manual}</div>
          <div className="stat-sub">Added by you</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        <div>
          <div className="section-header">
            <h2 className="section-title">Upcoming Events (next 30 days)</h2>
            <span className="badge badge-gold">{upcoming.length} events</span>
          </div>

          {upcoming.length === 0 ? (
            <div className="empty-state">
              <Calendar size={40} />
              <h3>No upcoming events</h3>
              <p>Fetch holidays or add events manually</p>
            </div>
          ) : (
            <div className="event-list">
              {upcoming.map(event => {
                const eventBrands = brands.filter(b => event.brandIds?.includes(b.id))
                return (
                  <div className="event-row" key={event.id}>
                    <div className="event-date-badge">
                      <div className="event-date-day">{format(parseISO(event.date), 'd')}</div>
                      <div className="event-date-month">{format(parseISO(event.date), 'MMM')}</div>
                    </div>
                    <div className="event-info">
                      <div className="event-title">{event.title}</div>
                      <div className="event-brands" style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        {eventBrands.map(b => (
                          <span key={b.id} className="brand-pill">
                            <span className="brand-dot" style={{ background: b.color }} />
                            {b.name}
                          </span>
                        ))}
                        {event.isManual && <span className="badge badge-violet" style={{ padding: '1px 6px', fontSize: 10 }}>Manual</span>}
                      </div>
                    </div>
                    <div className="event-actions">
                      {event.pushed ? (
                        <span className="badge badge-green"><CalendarCheck size={11} /> Pushed</span>
                      ) : (
                        <button className="btn btn-secondary btn-sm" onClick={() => handlePush(event)}>
                          <Calendar size={12} /> Push
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <div className="section-header">
            <h2 className="section-title">Brands</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {brands.map(brand => {
              const brandEvents = events.filter(e => e.brandIds?.includes(brand.id))
              const upcoming = brandEvents.filter(e => parseISO(e.date) >= today).length
              return (
                <div key={brand.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 3, height: 40, background: brand.color, borderRadius: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 13 }}>{brand.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{brand.category}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 20, color: 'var(--gold)' }}>{upcoming}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>upcoming</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
