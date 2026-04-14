import { format, parseISO, isThisWeek, addDays } from 'date-fns'
import { Plus, Calendar, CalendarCheck, TableProperties, ClipboardPaste } from 'lucide-react'
import { pushToGoogleCalendar } from '../utils/googleCalendar'
import { scheduleNotification, showToast } from '../utils/notifications'

export default function Dashboard({ brands, events, settings, onAddEvent, fetching, fetchProgress, setEvents, onGoSchedule, onPasteImport, syncStatus, relevanceOverrides }) {
  const today = new Date()
  // Only show events that are relevant for at least one of their brands
  const isEventRelevant = (event) => {
    if (!event.brandIds?.length) return false
    return event.brandIds.some(brandId => {
      const override = relevanceOverrides?.[event.id]?.[brandId]
      if (override) return override === 'relevant'
      // Default: events with brandIds are relevant unless explicitly dismissed
      return true
    })
  }

  const upcoming = events
    .filter(e => { const d = parseISO(e.date); return d >= today && d <= addDays(today, 30) })
    .filter(isEventRelevant)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 12)

  const thisWeek = events.filter(e => isThisWeek(parseISO(e.date), { weekStartsOn: 1 }))
  const pushed = events.filter(e => e.pushed).length

  const handlePush = async (event) => {
    const token = settings.googleToken
    if (!token) { showToast('Not connected', 'Connect Google Calendar in Settings', 'error'); return }
    try {
      await pushToGoogleCalendar(event, brands, token)
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, pushed: true } : e))
      if (settings.notificationsEnabled) scheduleNotification(event, brands, 1)
      showToast('Added to Calendar ✓', event.title, 'success')
    } catch {
      showToast('Error', 'Could not push to Google Calendar', 'error')
    }
  }

  // Count events per brand
  const brandEventCounts = brands.map(brand => ({
    brand,
    upcoming: events.filter(e => e.brandIds?.includes(brand.id) && parseISO(e.date) >= today).length,
    total: events.filter(e => e.brandIds?.includes(brand.id)).length,
  })).sort((a, b) => b.upcoming - a.upcoming)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{format(today, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={onPasteImport} disabled={fetching}>
            <ClipboardPaste size={14} /> Paste Import
          </button>
          <button className="btn btn-primary" onClick={onAddEvent}>
            <Plus size={14} /> Add Event
          </button>
          <div title={syncStatus === 'synced' ? 'Synced across devices' : syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? 'Sync failed — data saved locally' : ''} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--muted)', padding:'4px 8px', background:'var(--card)', borderRadius:20, border:'1px solid var(--border)' }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background: syncStatus === 'synced' ? 'var(--green)' : syncStatus === 'syncing' ? 'var(--gold)' : syncStatus === 'error' ? 'var(--red)' : 'var(--muted)', boxShadow: syncStatus === 'synced' ? '0 0 5px var(--green)' : 'none' }} />
            {syncStatus === 'synced' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? 'Local only' : ''}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card" style={{ '--accent': 'var(--gold)' }}>
          <div className="stat-label">Total Brands</div>
          <div className="stat-value">{brands.length}</div>
          <div className="stat-sub">Being tracked</div>
        </div>
        <div className="stat-card" style={{ '--accent': 'var(--violet)' }}>
          <div className="stat-label">This Week</div>
          <div className="stat-value">{thisWeek.length}</div>
          <div className="stat-sub">Events to post</div>
        </div>
        <div className="stat-card" style={{ '--accent': 'var(--green)' }}>
          <div className="stat-label">Total Events</div>
          <div className="stat-value">{events.length}</div>
          <div className="stat-sub">Across all brands</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#38B2F0' }}>
          <div className="stat-label">Pushed to Cal</div>
          <div className="stat-value">{pushed}</div>
          <div className="stat-sub">Calendar entries</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Upcoming events */}
        <div>
          <div className="section-header">
            <h2 className="section-title">Upcoming Events (next 30 days)</h2>
            <span className="badge badge-gold">{upcoming.length}</span>
          </div>

          {upcoming.length === 0 ? (
            <div className="empty-state">
              <Calendar size={40} />
              <h3>No upcoming events</h3>
              <p>Use Paste Import to import holidays from nationaltoday.com</p>
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

        {/* Brand summary + schedule link */}
        <div>
          <div className="section-header">
            <h2 className="section-title">By Brand</h2>
            <button className="btn btn-ghost btn-sm" onClick={onGoSchedule} style={{ fontSize: 11, gap: 4 }}>
              <TableProperties size={12} /> Full Schedule
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {brandEventCounts.map(({ brand, upcoming, total }) => (
              <div key={brand.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 3, height: 36, background: brand.color, borderRadius: 2, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {brand.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{brand.category}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 18, color: brand.color, lineHeight: 1 }}>
                    {upcoming}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>upcoming / {total} total</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
