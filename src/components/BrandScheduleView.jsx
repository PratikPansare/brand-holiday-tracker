import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         isSameDay, isToday, addMonths, subMonths, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Download, Info } from 'lucide-react'
import { scoreHolidayForBrandById } from '../utils/matching'

// Relevance tiers based on score
function getRelevance(score) {
  if (score >= 9)  return 'high'    // Must post — perfect fit
  if (score >= 6)  return 'medium'  // Good fit
  if (score >= 3)  return 'low'     // Possible angle
  return 'minimal'                   // Weak match — greyed out
}

export default function BrandScheduleView({ brands, events }) {
  const [current, setCurrent] = useState(new Date())
  const [selectedBrand, setSelectedBrand] = useState('all')
  const [showLowRelevance, setShowLowRelevance] = useState(true)
  const [hoveredEvent, setHoveredEvent] = useState(null)

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pre-compute relevance scores for every event × brand
  const relevanceMap = useMemo(() => {
    const map = {}
    for (const event of events) {
      map[event.id] = {}
      for (const brand of brands) {
        if (!event.brandIds?.includes(brand.id)) continue
        const score = scoreHolidayForBrandById(event, brand)
        map[event.id][brand.id] = score
      }
    }
    return map
  }, [events, brands])

  const eventsByDate = useMemo(() => {
    const map = {}
    for (const event of events) {
      if (!map[event.date]) map[event.date] = []
      map[event.date].push(event)
    }
    return map
  }, [events])

  const getEventsForBrandDay = (brandId, day) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    return (eventsByDate[dateStr] || []).filter(e => e.brandIds?.includes(brandId))
  }

  const brandTotals = useMemo(() => {
    const t = {}
    for (const brand of brands) {
      t[brand.id] = days.reduce((sum, day) => sum + getEventsForBrandDay(brand.id, day).length, 0)
    }
    return t
  }, [brands, days, eventsByDate])

  const handleExport = () => {
    const headers = ['Brand', 'Category', ...days.map(d => format(d, 'MMM d (EEE)'))]
    const rows = brands.map(brand => {
      const cells = days.map(day => {
        const evts = getEventsForBrandDay(brand.id, day)
        return evts.map(e => e.title).join(' / ')
      })
      return [brand.name, brand.category, ...cells]
    })
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `brand-schedule-${format(current, 'yyyy-MM')}.csv`
    a.click()
  }

  const filteredBrands = selectedBrand === 'all' ? brands : brands.filter(b => b.id === selectedBrand)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Brand Schedule</h1>
          <p className="page-subtitle">{format(current, 'MMMM yyyy')} — hover any event to see relevance score</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <button className="btn btn-secondary btn-icon" onClick={() => setCurrent(subMonths(current, 1))}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:15, minWidth:140, textAlign:'center' }}>
            {format(current, 'MMMM yyyy')}
          </span>
          <button className="btn btn-secondary btn-icon" onClick={() => setCurrent(addMonths(current, 1))}>
            <ChevronRight size={16} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setCurrent(new Date())}>Today</button>
          <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)} style={{ width:'auto' }}>
            <option value="all">All Brands</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button
            className={`btn btn-sm ${showLowRelevance ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => setShowLowRelevance(v => !v)}
            title="Toggle low-relevance holidays"
          >
            {showLowRelevance ? 'Hide Low' : 'Show All'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      {/* Relevance legend */}
      <div style={{
        display:'flex', gap:20, alignItems:'center', flexWrap:'wrap',
        background:'var(--card)', border:'1px solid var(--border)',
        borderRadius:'var(--radius-sm)', padding:'10px 16px', marginBottom:16,
        fontSize:12,
      }}>
        <span style={{ color:'var(--muted)', fontWeight:600, fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em' }}>Relevance:</span>
        {[
          { tier:'high',    label:'Must Post',   color:'#20C07A', opacity:1 },
          { tier:'medium',  label:'Good Fit',    color:'#E8A020', opacity:0.9 },
          { tier:'low',     label:'Possible',    color:'#7B5FF5', opacity:0.7 },
          { tier:'minimal', label:'Weak',        color:'#6B6B90', opacity:0.4 },
        ].map(({ tier, label, color, opacity }) => (
          <span key={tier} style={{ display:'flex', alignItems:'center', gap:6, color:'var(--muted-light)' }}>
            <span style={{ width:12, height:12, borderRadius:3, background:color, opacity, display:'inline-block' }} />
            {label}
          </span>
        ))}
        <span style={{ color:'var(--muted)', fontSize:11, marginLeft:'auto' }}>
          <Info size={12} style={{ display:'inline', marginRight:4 }} />
          Scores based on keyword + category match
        </span>
      </div>

      {events.length === 0 ? (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'60px 40px', textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>📅</div>
          <h3 style={{ fontFamily:'var(--font-head)', fontSize:18, marginBottom:8 }}>No events yet</h3>
          <p style={{ color:'var(--muted)' }}>Use Paste Import on the Dashboard to import holidays from nationaltoday.com</p>
        </div>
      ) : (
        <div style={{ overflowX:'auto', borderRadius:'var(--radius)', border:'1px solid var(--border)' }}>
          <table style={{ borderCollapse:'collapse', width:'max-content', minWidth:'100%' }}>
            <thead>
              <tr>
                {/* Brand label column */}
                <th style={{
                  position:'sticky', left:0, zIndex:10,
                  background:'var(--surface)', borderBottom:'1px solid var(--border)',
                  borderRight:'1px solid var(--border)',
                  padding:'10px 16px', minWidth:200,
                  fontFamily:'var(--font-head)', fontSize:11, fontWeight:700,
                  color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'left',
                }}>Brand</th>

                {days.map(day => {
                  const isCurrentDay = isToday(day)
                  const isWeekend = [0,6].includes(day.getDay())
                  return (
                    <th key={day.toISOString()} style={{
                      background: isCurrentDay ? 'rgba(232,160,32,0.15)' : isWeekend ? 'rgba(255,255,255,0.02)' : 'var(--surface)',
                      borderBottom:'1px solid var(--border)', borderRight:'1px solid var(--border)',
                      padding:'8px 6px', minWidth:110, textAlign:'center',
                    }}>
                      <div style={{ fontSize:10, fontWeight:700, color: isCurrentDay ? 'var(--gold)' : 'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                        {format(day,'EEE')}
                      </div>
                      <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:800, color: isCurrentDay ? 'var(--gold)' : 'var(--muted-light)', lineHeight:1.2, marginTop:2 }}>
                        {format(day,'d')}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {filteredBrands.map(brand => (
                <tr key={brand.id}>
                  {/* Sticky brand name */}
                  <td style={{
                    position:'sticky', left:0, zIndex:5,
                    background:'var(--surface)',
                    borderBottom:'1px solid var(--border)', borderRight:'2px solid var(--border-light)',
                    padding:'10px 16px',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:4, height:36, background:brand.color, borderRadius:2, flexShrink:0 }} />
                      <div>
                        <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:12.5, color:'var(--text)', whiteSpace:'nowrap' }}>
                          {brand.name}
                        </div>
                        <div style={{ fontSize:10, color:'var(--muted)', marginTop:1 }}>
                          {brand.category} · <span style={{ color:brand.color, fontWeight:700 }}>{brandTotals[brand.id] || 0} events</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Day cells */}
                  {days.map(day => {
                    const cellEvents = getEventsForBrandDay(brand.id, day)
                    const isCurrentDay = isToday(day)
                    const isWeekend = [0,6].includes(day.getDay())

                    // Filter by relevance if needed
                    const visibleEvents = showLowRelevance
                      ? cellEvents
                      : cellEvents.filter(e => {
                          const score = relevanceMap[e.id]?.[brand.id] ?? 0
                          return getRelevance(score) !== 'minimal'
                        })

                    return (
                      <td key={day.toISOString()} style={{
                        borderBottom:'1px solid var(--border)', borderRight:'1px solid var(--border)',
                        padding:'5px', verticalAlign:'top', minWidth:110,
                        background: isCurrentDay ? 'rgba(232,160,32,0.04)' : isWeekend ? 'rgba(0,0,0,0.15)' : 'var(--card)',
                        position:'relative',
                      }}>
                        {visibleEvents.length === 0 ? (
                          <div style={{ minHeight:36 }} />
                        ) : (
                          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                            {visibleEvents.map(event => {
                              const score = relevanceMap[event.id]?.[brand.id] ?? 0
                              const tier = getRelevance(score)
                              const isHovered = hoveredEvent === event.id + brand.id

                              // Color and opacity by relevance tier
                              const tierStyles = {
                                high:    { bg: brand.color + '35', border: brand.color + '80', color: brand.color, opacity: 1, fontWeight: 700 },
                                medium:  { bg: brand.color + '22', border: brand.color + '55', color: brand.color, opacity: 0.9, fontWeight: 600 },
                                low:     { bg: 'rgba(123,95,245,0.1)', border: 'rgba(123,95,245,0.25)', color: '#9090B8', opacity: 0.75, fontWeight: 500 },
                                minimal: { bg: 'rgba(107,107,144,0.06)', border: 'rgba(107,107,144,0.15)', color: '#505070', opacity: 0.5, fontWeight: 400 },
                              }
                              const style = tierStyles[tier]

                              return (
                                <div
                                  key={event.id}
                                  title={`${event.title}\nRelevance: ${tier} (score: ${score})\nCategory: ${event.category || 'N/A'}`}
                                  onMouseEnter={() => setHoveredEvent(event.id + brand.id)}
                                  onMouseLeave={() => setHoveredEvent(null)}
                                  style={{
                                    fontSize:10, fontWeight:style.fontWeight,
                                    padding:'3px 6px', borderRadius:4,
                                    background: style.bg,
                                    color: style.color,
                                    border: `1px solid ${style.border}`,
                                    opacity: isHovered ? 1 : style.opacity,
                                    lineHeight:1.3,
                                    wordBreak:'break-word',
                                    cursor:'default',
                                    transition:'opacity 0.12s ease, transform 0.12s ease',
                                    transform: isHovered ? 'scale(1.02)' : 'none',
                                    // High relevance gets a left accent bar
                                    borderLeft: tier === 'high' ? `3px solid ${brand.color}` : `1px solid ${style.border}`,
                                  }}
                                >
                                  {event.title}
                                  {tier === 'high' && <span style={{ marginLeft:3, fontSize:8 }}>★</span>}
                                </div>
                              )
                            })}
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

      {/* Legend bottom */}
      <div style={{ display:'flex', gap:16, marginTop:14, flexWrap:'wrap', alignItems:'center', fontSize:11, color:'var(--muted)' }}>
        <span>★ = Must-post holiday (highest relevance)</span>
        <span style={{ background:'rgba(232,160,32,0.15)', padding:'1px 6px', borderRadius:3 }}>■ Today</span>
        <span style={{ background:'rgba(0,0,0,0.15)', padding:'1px 6px', borderRadius:3 }}>■ Weekend</span>
      </div>
    </div>
  )
}
