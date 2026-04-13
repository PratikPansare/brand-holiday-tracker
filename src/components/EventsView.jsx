import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Search, Calendar, CalendarCheck, Trash2 } from 'lucide-react'
import { pushToGoogleCalendar } from '../utils/googleCalendar'
import { scheduleNotification, showToast } from '../utils/notifications'

export default function EventsView({ brands, events, setEvents, settings }) {
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = events
    .filter(e => {
      const matchSearch = e.title.toLowerCase().includes(search.toLowerCase())
      const matchBrand = brandFilter === 'all' || e.brandIds?.includes(brandFilter)
      const matchType = typeFilter === 'all'
        || (typeFilter === 'manual' && e.isManual)
        || (typeFilter === 'holiday' && !e.isManual)
        || (typeFilter === 'pushed' && e.pushed)
      return matchSearch && matchBrand && matchType
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  const handlePush = async (event) => {
    const token = settings.googleToken
    if (!token) { showToast('Not connected', 'Connect Google Calendar in Settings first', 'error'); return }
    try {
      await pushToGoogleCalendar(event, brands, token)
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, pushed: true } : e))
      if (settings.notificationsEnabled) scheduleNotification(event, brands, 1)
      showToast('Added to Calendar ✓', event.title, 'success')
    } catch {
      showToast('Error', 'Failed to push to Google Calendar', 'error')
    }
  }

  const handleDelete = (id) => {
    if (confirm('Delete this event?')) setEvents(prev => prev.filter(e => e.id !== id))
  }

  const handlePushAll = async () => {
    const token = settings.googleToken
    if (!token) { showToast('Not connected', 'Connect Google Calendar in Settings first', 'error'); return }
    const unpushed = filtered.filter(e => !e.pushed)
    if (unpushed.length === 0) { showToast('All pushed', 'No new events to push', 'info'); return }
    let count = 0
    for (const event of unpushed) {
      try {
        await pushToGoogleCalendar(event, brands, token)
        setEvents(prev => prev.map(e => e.id === event.id ? { ...e, pushed: true } : e))
        if (settings.notificationsEnabled) scheduleNotification(event, brands, 1)
        count++
      } catch {}
    }
    showToast(`Pushed ${count} events`, 'All added to Google Calendar', 'success')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">All Events</h1>
          <p className="page-subtitle">{events.length} total events tracked</p>
        </div>
        <button className="btn btn-primary" onClick={handlePushAll}>
          <Calendar size={14} /> Push All to Calendar
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-input" style={{ flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events..."
            style={{ paddingLeft: 36, position: 'relative' }}
          />
        </div>
        <select className="filter-select" value={brandFilter} onChange={e => setBrandFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="all">All Brands</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="all">All Types</option>
          <option value="holiday">Holidays</option>
          <option value="manual">Manual</option>
          <option value="pushed">Pushed</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Event</th>
              <th>Brands</th>
              <th>Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                  No events found
                </td>
              </tr>
            ) : filtered.map(event => {
              const eventBrands = brands.filter(b => event.brandIds?.includes(b.id))
              return (
                <tr key={event.id}>
                  <td style={{ whiteSpace: 'nowrap', fontFamily: 'var(--font-head)', fontWeight: 600 }}>
                    {format(parseISO(event.date), 'MMM d, yyyy')}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{event.title}</div>
                    {event.description && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {event.description.slice(0, 60)}{event.description.length > 60 ? '…' : ''}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {eventBrands.map(b => (
                        <span key={b.id} className="brand-pill">
                          <span className="brand-dot" style={{ background: b.color }} />
                          {b.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {event.isManual
                      ? <span className="badge badge-violet">Manual</span>
                      : <span className="badge badge-gold">Holiday</span>
                    }
                  </td>
                  <td>
                    {event.pushed
                      ? <span className="badge badge-green"><CalendarCheck size={11} /> In Calendar</span>
                      : <span className="badge badge-muted">Pending</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {!event.pushed && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handlePush(event)}>
                          <Calendar size={12} /> Push
                        </button>
                      )}
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(event.id)}>
                        <Trash2 size={13} style={{ color: 'var(--red)' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
