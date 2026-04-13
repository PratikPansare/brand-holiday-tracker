import { format, isToday, isTomorrow, parseISO, isThisWeek, addDays } from 'date-fns'
import { Plus, RefreshCw, Calendar, CalendarCheck, ClipboardCheck } from 'lucide-react'
import { pushToGoogleCalendar } from '../utils/googleCalendar'
import { scheduleNotification, showToast } from '../utils/notifications'

export default function Dashboard({ brands, events, settings, onAddEvent, onFetch, fetching, setEvents, pendingCount, onGoReview }) {
  const today = new Date()
  const upcoming = events
    .filter(e => { const d = parseISO(e.date); return d >= today && d <= addDays(today, 30) })
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

      {/* Review banner */}
      {pendingCount > 0 && (
        <div onClick={onGoReview} style={{
          background: 'var(--gold-dim)', border: '1px solid var(--gold-glow)',
          borderRadius: 'var(--radius)', padding: '14px 18px',
          marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14,
          cursor: 'pointer', transition: 'background 0.15s ease',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,160,32,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--gold-dim)'}
        >
          <ClipboardCheck size={20} style={{ color: 'var(--gold)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 14 }}>
              {pendingCount} holidays waiting for review
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted-light)', marginTop: 2 }}>
              Assign brands and approve them to add to your events — click to review now
            </div>
          </div>
          <span style={{ color: 'var(--gold)', fontSize: 20 }}>→</span>
        </div>
      )}

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
          <div className="stat-label">Pending Review</div>
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-sub">Need your attention</div>
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
              <p>Fetch holidays then approve them in the Review tab</p>
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
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
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
          <div className="section-header"><h2 className="section-title">Brands</h2></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {brands.map(brand => {
              const brandEvents = events.filter(e => e.brandIds?.includes(brand.id))
              const upcomingCount = brandEvents.filter(e => parseISO(e.date) >= today).length
              return (
                <div key={brand.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 3, height: 40, background: brand.color, borderRadius: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brand.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{brand.category}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 20, color: 'var(--gold)' }}>{upcomingCount}</div>
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

