import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Download, ChevronDown } from 'lucide-react'
import { scoreHolidayForBrandById } from '../utils/matching'

// Determine initial relevance from AI/keyword score
function defaultRelevance(score) {
  return score >= 5 ? 'relevant' : 'not_relevant'
}

export default function BrandScheduleView({ brands, events, relevanceOverrides, setRelevanceOverrides }) {
  const [current, setCurrent] = useState(new Date())
  const [selectedBrand, setSelectedBrand] = useState('all')
  const [expandedCells, setExpandedCells] = useState({}) // cells where user expanded hidden items

  const days = eachDayOfInterval({ start: startOfMonth(current), end: endOfMonth(current) })

  const scoreMap = useMemo(() => {
    const map = {}
    for (const e of events) {
      map[e.id] = {}
      for (const b of brands) {
        if (e.brandIds?.includes(b.id)) map[e.id][b.id] = scoreHolidayForBrandById(e, b)
      }
    }
    return map
  }, [events, brands])

  const getRelevance = (eventId, brandId) => {
    const override = relevanceOverrides?.[eventId]?.[brandId]
    if (override) return override
    const score = scoreMap[eventId]?.[brandId] ?? 0
    return defaultRelevance(score)
  }

  // Click cycles: relevant ↔ not_relevant
  const toggleRelevance = (eventId, brandId) => {
    const current = getRelevance(eventId, brandId)
    const next = current === 'relevant' ? 'not_relevant' : 'relevant'
    setRelevanceOverrides(prev => ({
      ...prev,
      [eventId]: { ...(prev?.[eventId] || {}), [brandId]: next }
    }))
  }

  const eventsByDate = useMemo(() => {
    const map = {}
    for (const e of events) {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    }
    return map
  }, [events])

  const getEventsForBrandDay = (brandId, day) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    return (eventsByDate[dateStr] || []).filter(e => e.brandIds?.includes(brandId))
  }

  const brandTotals = useMemo(() => {
    const t = {}
    for (const b of brands) {
      t[b.id] = { total: 0, relevant: 0 }
      for (const day of days) {
        const evts = getEventsForBrandDay(b.id, day)
        t[b.id].total += evts.length
        t[b.id].relevant += evts.filter(e => getRelevance(e.id, b.id) === 'relevant').length
      }
    }
    return t
  }, [brands, days, eventsByDate, relevanceOverrides, scoreMap])

  const handleExport = () => {
    const headers = ['Brand', ...days.map(d => format(d, 'MMM d (EEE)'))]
    const rows = brands.map(brand => {
      const cells = days.map(day =>
        getEventsForBrandDay(brand.id, day)
          .filter(e => getRelevance(e.id, brand.id) === 'relevant')
          .map(e => e.title).join(' / ')
      )
      return [brand.name, ...cells]
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
          <p className="page-subtitle">{format(current, 'MMMM yyyy')} · Click any holiday to mark relevant / not relevant</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <button className="btn btn-secondary btn-icon" onClick={() => setCurrent(subMonths(current, 1))}><ChevronLeft size={16}/></button>
          <span style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:15, minWidth:140, textAlign:'center' }}>{format(current, 'MMMM yyyy')}</span>
          <button className="btn btn-secondary btn-icon" onClick={() => setCurrent(addMonths(current, 1))}><ChevronRight size={16}/></button>
          <button className="btn btn-ghost btn-sm" onClick={() => setCurrent(new Date())}>Today</button>
          <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)} style={{ width:'auto' }}>
            <option value="all">All Brands</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}><Download size={13}/> CSV</button>
        </div>
      </div>

      {/* Quick legend */}
      <div style={{ display:'flex', gap:20, alignItems:'center', background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'10px 16px', marginBottom:16, fontSize:12, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <span style={{ width:10, height:10, borderRadius:2, background:'var(--green)', display:'inline-block' }}/>
          <span style={{ color:'var(--muted-light)' }}>Relevant — will post</span>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <span style={{ width:10, height:10, borderRadius:2, background:'var(--muted)', opacity:0.4, display:'inline-block' }}/>
          <span style={{ color:'var(--muted)', opacity:0.7 }}>Not relevant — collapsed</span>
        </div>
        <span style={{ color:'var(--muted)', fontSize:11, marginLeft:'auto' }}>Click any holiday to toggle · Expand ▾ to see hidden ones</span>
      </div>

      {events.length === 0 ? (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'60px 40px', textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>📅</div>
          <h3 style={{ fontFamily:'var(--font-head)', fontSize:18, marginBottom:8 }}>No events yet</h3>
          <p style={{ color:'var(--muted)' }}>Use Paste Import on the Dashboard</p>
        </div>
      ) : (
        <div style={{ overflowX:'auto', borderRadius:'var(--radius)', border:'1px solid var(--border)' }}>
          <table style={{ borderCollapse:'collapse', width:'max-content', minWidth:'100%' }}>
            <thead>
              <tr>
                <th style={{ position:'sticky', left:0, zIndex:10, background:'var(--surface)', borderBottom:'1px solid var(--border)', borderRight:'1px solid var(--border)', padding:'10px 16px', minWidth:210, fontFamily:'var(--font-head)', fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'left' }}>Brand</th>
                {days.map(day => {
                  const cur = isToday(day)
                  const wknd = [0,6].includes(day.getDay())
                  return (
                    <th key={day.toISOString()} style={{ background: cur ? 'rgba(232,160,32,0.15)' : wknd ? 'rgba(255,255,255,0.02)' : 'var(--surface)', borderBottom:'1px solid var(--border)', borderRight:'1px solid var(--border)', padding:'8px 6px', minWidth:110, textAlign:'center' }}>
                      <div style={{ fontSize:10, fontWeight:700, color: cur ? 'var(--gold)' : 'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{format(day,'EEE')}</div>
                      <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:800, color: cur ? 'var(--gold)' : 'var(--muted-light)', lineHeight:1.2, marginTop:2 }}>{format(day,'d')}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {filteredBrands.map(brand => (
                <tr key={brand.id}>
                  <td style={{ position:'sticky', left:0, zIndex:5, background:'var(--surface)', borderBottom:'1px solid var(--border)', borderRight:'2px solid var(--border-light)', padding:'10px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:4, height:40, background:brand.color, borderRadius:2, flexShrink:0 }}/>
                      <div>
                        <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:12.5, whiteSpace:'nowrap' }}>{brand.name}</div>
                        <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>
                          <span style={{ color:brand.color, fontWeight:700 }}>{brandTotals[brand.id]?.relevant || 0}</span> relevant · {brandTotals[brand.id]?.total || 0} total
                        </div>
                      </div>
                    </div>
                  </td>

                  {days.map(day => {
                    const allEvts = getEventsForBrandDay(brand.id, day)
                    const cur = isToday(day)
                    const wknd = [0,6].includes(day.getDay())
                    const cellKey = `${brand.id}-${format(day,'yyyy-MM-dd')}`
                    const isExpanded = expandedCells[cellKey]

                    const relevant = allEvts.filter(e => getRelevance(e.id, brand.id) === 'relevant')
                    const notRelevant = allEvts.filter(e => getRelevance(e.id, brand.id) === 'not_relevant')

                    return (
                      <td key={day.toISOString()} style={{ borderBottom:'1px solid var(--border)', borderRight:'1px solid var(--border)', padding:'5px', verticalAlign:'top', minWidth:110, background: cur ? 'rgba(232,160,32,0.04)' : wknd ? 'rgba(0,0,0,0.15)' : 'var(--card)' }}>
                        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>

                          {/* Relevant events — full color */}
                          {relevant.map(event => (
                            <div
                              key={event.id}
                              onClick={() => toggleRelevance(event.id, brand.id)}
                              title="Click to mark as not relevant"
                              style={{
                                fontSize:10, fontWeight:700, padding:'3px 6px', borderRadius:4, cursor:'pointer',
                                background: brand.color + '28', color: brand.color,
                                border: `1px solid ${brand.color}55`,
                                borderLeft: `3px solid ${brand.color}`,
                                lineHeight:1.3, wordBreak:'break-word',
                                transition:'opacity 0.1s, transform 0.1s', userSelect:'none',
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                            >
                              {event.title}
                            </div>
                          ))}

                          {/* Not-relevant events — collapsed by default, expand on click */}
                          {notRelevant.length > 0 && (
                            <>
                              {/* Expand toggle */}
                              {!isExpanded ? (
                                <div
                                  onClick={() => setExpandedCells(p => ({ ...p, [cellKey]: true }))}
                                  style={{ fontSize:9, color:'var(--muted)', cursor:'pointer', padding:'2px 4px', display:'flex', alignItems:'center', gap:3, opacity:0.6 }}
                                >
                                  <ChevronDown size={10}/> {notRelevant.length} hidden
                                </div>
                              ) : (
                                <>
                                  {notRelevant.map(event => (
                                    <div
                                      key={event.id}
                                      onClick={() => toggleRelevance(event.id, brand.id)}
                                      title="Click to mark as relevant"
                                      style={{
                                        fontSize:10, fontWeight:400, padding:'3px 6px', borderRadius:4, cursor:'pointer',
                                        background: 'rgba(107,107,144,0.07)', color:'var(--muted)',
                                        border: '1px solid rgba(107,107,144,0.15)',
                                        lineHeight:1.3, wordBreak:'break-word',
                                        opacity:0.55, userSelect:'none', textDecoration:'line-through',
                                        transition:'opacity 0.1s',
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                      onMouseLeave={e => e.currentTarget.style.opacity = '0.55'}
                                    >
                                      {event.title}
                                    </div>
                                  ))}
                                  <div
                                    onClick={() => setExpandedCells(p => ({ ...p, [cellKey]: false }))}
                                    style={{ fontSize:9, color:'var(--muted)', cursor:'pointer', padding:'2px 4px', opacity:0.5 }}
                                  >
                                    ▲ collapse
                                  </div>
                                </>
                              )}
                            </>
                          )}

                          {relevant.length === 0 && notRelevant.length === 0 && (
                            <div style={{ minHeight:28 }}/>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
