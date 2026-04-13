import { useState } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, parseISO, isSameDay,
  addMonths, subMonths
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarView({ brands, events, onEventClick }) {
  const [current, setCurrent] = useState(new Date())
  const [selectedBrand, setSelectedBrand] = useState('all')

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const filteredEvents = selectedBrand === 'all'
    ? events
    : events.filter(e => e.brandIds?.includes(selectedBrand))

  const getEventsForDay = (day) =>
    filteredEvents.filter(e => {
      try { return isSameDay(parseISO(e.date), day) } catch { return false }
    })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">All events and holidays in calendar view</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            className="filter-select"
            value={selectedBrand}
            onChange={e => setSelectedBrand(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="all">All Brands</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      <div className="cal-nav">
        <button className="btn btn-secondary btn-icon" onClick={() => setCurrent(subMonths(current, 1))}>
          <ChevronLeft size={16} />
        </button>
        <span className="cal-nav-title">{format(current, 'MMMM yyyy')}</span>
        <button className="btn btn-secondary btn-icon" onClick={() => setCurrent(addMonths(current, 1))}>
          <ChevronRight size={16} />
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setCurrent(new Date())}>Today</button>
      </div>

      <div className="calendar-grid">
        {DAY_HEADERS.map(d => (
          <div key={d} className="cal-day-header">{d}</div>
        ))}

        {days.map(day => {
          const dayEvents = getEventsForDay(day)
          const isOther = !isSameMonth(day, current)
          const isCurrentDay = isToday(day)

          return (
            <div
              key={day.toISOString()}
              className={`cal-day ${isOther ? 'other-month' : ''} ${isCurrentDay ? 'today' : ''}`}
            >
              <div className="cal-day-num">{format(day, 'd')}</div>
              {dayEvents.slice(0, 3).map(event => {
                const brand = brands.find(b => event.brandIds?.[0] === b.id)
                const color = brand?.color || 'var(--gold)'
                return (
                  <div
                    key={event.id}
                    className="cal-event"
                    style={{
                      background: color + '25',
                      color: color,
                      border: `1px solid ${color}40`,
                    }}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                )
              })}
              {dayEvents.length > 3 && (
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      {brands.length > 0 && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 20 }}>
          {brands.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted-light)' }}>
              <div className="brand-dot" style={{ background: b.color }} />
              {b.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
