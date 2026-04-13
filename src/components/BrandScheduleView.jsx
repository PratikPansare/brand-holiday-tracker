import { useState, useMemo } from 'react'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
         addMonths, subMonths, isSameDay, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar, Download } from 'lucide-react'

export default function BrandScheduleView({ brands, events }) {
  const [current, setCurrent] = useState(new Date())
  const [hoveredCell, setHoveredCell] = useState(null)

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Build lookup: dateStr → [event, ...]
  const eventsByDate = useMemo(() => {
    const map = {}
    for (const event of events) {
      if (!map[event.date]) map[event.date] = []
      map[event.date].push(event)
    }
    return map
  }, [events])

  // For each brand × day: find matching events
  const getEventsForBrandDay = (brandId, day) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    const dayEvents = eventsByDate[dateStr] || []
    return dayEvents.filter(e => e.brandIds?.includes(brandId))
  }

  // Export as CSV (like the original spreadsheet)
  const handleExport = () => {
    const headers = ['Brand', 'Category', ...days.map(d => format(d, 'MMM d (EEE)'))]
    const rows = brands.map(brand => {
      const cells = days.map(day => {
        const evts = getEventsForBrandDay(brand.id, day)
        return evts.map(e => e.title).join(' / ')
      })
      return [brand.name, brand.category, ...cells]
    })

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `brand-schedule-${format(current, 'yyyy-MM')}.csv`
    a.click()
  }

  // Total events in month per brand
  const brandTotals = useMemo(() => {
    const totals = {}
    for (const brand of brands) {
      totals[brand.id] = days.reduce((sum, day) => {
        return sum + getEventsForBrandDay(brand.id, day).length
      }, 0)
    }
    return totals
  }, [brands, days, eventsByDate])

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Brand Schedule</h1>
          <p className="page-subtitle">
            All holidays mapped to each brand — {format(current, 'MMMM yyyy')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-icon" onClick={() => setCurrent(subMonths(current, 1))}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15, minWidth: 140, textAlign: 'center' }}>
            {format(current, 'MMMM yyyy')}
          </span>
          <button className="btn btn-secondary btn-icon" onClick={() => setCurrent(addMonths(current, 1))}>
            <ChevronRight size={16} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setCurrent(new Date())}>Today</button>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '60px 40px', textAlign: 'center'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
          <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 18, marginBottom: 8 }}>No events yet</h3>
          <p style={{ color: 'var(--muted)', marginBottom: 20 }}>
            Go to Dashboard → Fetch Holidays, then they'll appear here mapped to each brand
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '100%' }}>
            <thead>
              {/* Month header row */}
              <tr>
                <th style={{
                  position: 'sticky', left: 0, zIndex: 10,
                  background: 'var(--surface)', borderBottom: '1px solid var(--border)',
                  borderRight: '1px solid var(--border)',
                  padding: '10px 16px', minWidth: 200,
                  fontFamily: 'var(--font-head)', fontSize: 12, fontWeight: 700,
                  color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
                  textAlign: 'left',
                }}>
                  Brand
                </th>
                {days.map(day => {
                  const isCurrentDay = isToday(day)
                  const isWeekend = [0, 6].includes(day.getDay())
                  return (
                    <th key={day.toISOString()} style={{
                      background: isCurrentDay ? 'rgba(232,160,32,0.15)' : isWeekend ? 'rgba(255,255,255,0.02)' : 'var(--surface)',
                      borderBottom: '1px solid var(--border)',
                      borderRight: '1px solid var(--border)',
                      padding: '8px 6px',
                      minWidth: 110,
                      textAlign: 'center',
                    }}>
                      <div style={{
                        fontSize: 11, fontWeight: 700,
                        color: isCurrentDay ? 'var(--gold)' : 'var(--muted)',
                        textTransform: 'uppercase', letterSpacing: '0.06em'
                      }}>
                        {format(day, 'EEE')}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 800,
                        color: isCurrentDay ? 'var(--gold)' : 'var(--muted-light)',
                        lineHeight: 1.2, marginTop: 2,
                      }}>
                        {format(day, 'd')}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {brands.map((brand, brandIdx) => (
                <tr key={brand.id}>
                  {/* Brand label — sticky left */}
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 5,
                    background: 'var(--surface)',
                    borderBottom: '1px solid var(--border)',
                    borderRight: '2px solid var(--border-light)',
                    padding: '10px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 4, height: 36, borderRadius: 2,
                        background: brand.color, flexShrink: 0,
                      }} />
                      <div>
                        <div style={{
                          fontFamily: 'var(--font-head)', fontWeight: 700,
                          fontSize: 13, color: 'var(--text)',
                          whiteSpace: 'nowrap',
                        }}>
                          {brand.name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                          {brand.category} ·{' '}
                          <span style={{ color: brand.color, fontWeight: 700 }}>
                            {brandTotals[brand.id] || 0} events
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Day cells */}
                  {days.map(day => {
                    const cellEvents = getEventsForBrandDay(brand.id, day)
                    const isCurrentDay = isToday(day)
                    const isWeekend = [0, 6].includes(day.getDay())
                    const cellKey = `${brand.id}-${format(day, 'yyyy-MM-dd')}`
                    const isHovered = hoveredCell === cellKey

                    return (
                      <td
                        key={day.toISOString()}
                        onMouseEnter={() => setHoveredCell(cellKey)}
                        onMouseLeave={() => setHoveredCell(null)}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          borderRight: '1px solid var(--border)',
                          padding: '6px',
                          verticalAlign: 'top',
                          minWidth: 110,
                          minHeight: 60,
                          background: isCurrentDay
                            ? 'rgba(232,160,32,0.05)'
                            : isHovered
                            ? 'rgba(255,255,255,0.03)'
                            : isWeekend
                            ? 'rgba(0,0,0,0.15)'
                            : 'var(--card)',
                          transition: 'background 0.1s ease',
                          position: 'relative',
                        }}
                      >
                        {cellEvents.length === 0 ? (
                          <div style={{ minHeight: 40 }} />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {cellEvents.map(event => (
                              <div
                                key={event.id}
                                title={event.title}
                                style={{
                                  fontSize: 10, fontWeight: 600,
                                  padding: '3px 6px',
                                  borderRadius: 4,
                                  background: brand.color + '22',
                                  color: brand.color,
                                  border: `1px solid ${brand.color}44`,
                                  lineHeight: 1.3,
                                  wordBreak: 'break-word',
                                  cursor: 'default',
                                }}
                              >
                                {event.title}
                                {event.isManual && (
                                  <span style={{
                                    marginLeft: 3, fontSize: 8,
                                    background: 'var(--violet-dim)', color: 'var(--violet)',
                                    borderRadius: 3, padding: '0 3px',
                                  }}>M</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          <span style={{ background: 'rgba(232,160,32,0.15)', padding: '1px 6px', borderRadius: 3 }}>
            Today
          </span>
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          <span style={{ background: 'rgba(0,0,0,0.15)', padding: '1px 6px', borderRadius: 3 }}>
            Weekend
          </span>
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          <span style={{ background: 'var(--violet-dim)', color: 'var(--violet)', padding: '1px 6px', borderRadius: 3 }}>
            M
          </span>{' '}= Manual event
        </span>
        {brands.map(b => (
          <span key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted-light)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: b.color, display: 'inline-block' }} />
            {b.name}
          </span>
        ))}
      </div>
    </div>
  )
}
