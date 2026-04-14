import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { scoreHolidayForBrandById } from '../utils/matching'

function defaultRelevance(score) {
  return score >= 5 ? 'relevant' : 'not_relevant'
}

// ── MOBILE VIEW ─────────────────────────────────────────────────────
// One brand at a time, clean list of relevant events per day
function MobileView({ brands, days, getEventsForBrandDay, getRelevance, toggleRelevance }) {
  const [activeBrandId, setActiveBrandId] = useState(brands[0]?.id || null)
  const [expandedDays, setExpandedDays] = useState({})

  const brand = brands.find(b => b.id === activeBrandId)
  if (!brand) return null

  // Only days that have events for this brand
  const activeDays = days.filter(d => getEventsForBrandDay(brand.id, d).length > 0)
  const relevantCount = activeDays.reduce((sum, d) =>
    sum + getEventsForBrandDay(brand.id, d).filter(e => getRelevance(e.id, brand.id) === 'relevant').length, 0)

  return (
    <div>
      {/* Brand picker — horizontal scroll chips */}
      <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:8, marginBottom:16, WebkitOverflowScrolling:'touch' }}>
        {brands.map(b => (
          <button
            key={b.id}
            onClick={() => setActiveBrandId(b.id)}
            className='schedule-brand-chip'
            style={{
              flexShrink:0, padding:'7px 14px', borderRadius:20, border:'none', cursor:'pointer',
              background: activeBrandId === b.id ? b.color : 'var(--card)',
              color: activeBrandId === b.id ? '#fff' : 'var(--muted-light)',
              fontFamily:'var(--font-body)', fontSize:12, fontWeight:600,
              transition:'all 0.15s ease',
              boxShadow: activeBrandId === b.id ? `0 2px 8px ${b.color}55` : 'none',
            }}
          >{b.name}</button>
        ))}
      </div>

      {/* Active brand header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, background:'var(--card)', border:`1px solid ${brand.color}33`, borderRadius:'var(--radius)', padding:'14px 16px', marginBottom:16 }}>
        <div style={{ width:4, height:40, background:brand.color, borderRadius:2, flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'var(--font-head)', fontWeight:800, fontSize:16 }}>{brand.name}</div>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
            {brand.category} · <span style={{ color:brand.color, fontWeight:700 }}>{relevantCount} relevant</span> this month
          </div>
        </div>
      </div>

      {/* Days list */}
      {activeDays.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--muted)', fontSize:13 }}>
          No holidays this month for {brand.name}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {activeDays.map(day => {
            const allEvts = getEventsForBrandDay(brand.id, day)
            const relevant = allEvts.filter(e => getRelevance(e.id, brand.id) === 'relevant')
            const hidden = allEvts.filter(e => getRelevance(e.id, brand.id) === 'not_relevant')
            const dayKey = `${brand.id}-${format(day,'yyyy-MM-dd')}`
            const isExpanded = expandedDays[dayKey]
            const cur = isToday(day)
            const wknd = [0,6].includes(day.getDay())

            return (
              <div key={day.toISOString()} style={{
                background: cur ? `${brand.color}0A` : wknd ? 'rgba(0,0,0,0.2)' : 'var(--card)',
                border: `1px solid ${cur ? brand.color + '44' : 'var(--border)'}`,
                borderRadius:'var(--radius-sm)',
                overflow:'hidden',
              }}>
                <div style={{ display:'flex', gap:14, alignItems:'flex-start', padding:'12px 14px' }}>
                  {/* Date badge */}
                  <div style={{ textAlign:'center', minWidth:42, flexShrink:0 }}>
                    <div className="schedule-day-num" style={{ fontFamily:'var(--font-head)', fontWeight:800, fontSize:22, color: cur ? brand.color : 'var(--muted-light)', lineHeight:1 }}>{format(day,'d')}</div>
                    <div style={{ fontSize:10, color:'var(--muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>{format(day,'EEE')}</div>
                  </div>

                  {/* Events */}
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                    {relevant.length === 0 && hidden.length > 0 && (
                      <div style={{ fontSize:12, color:'var(--muted)', fontStyle:'italic' }}>No relevant events</div>
                    )}
                    {relevant.map(event => (
                      <div
                        key={event.id}
                        className="schedule-event-pill"
                        onClick={() => toggleRelevance(event.id, brand.id)}
                        style={{
                          padding:'10px 14px', borderRadius:8, cursor:'pointer',
                          background: brand.color + '1A', color: brand.color,
                          border:`1px solid ${brand.color}44`, borderLeft:`4px solid ${brand.color}`,
                          fontSize:13, fontWeight:700, userSelect:'none',
                          display:'flex', alignItems:'center', justifyContent:'space-between',
                          minHeight:44,
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity='0.8'}
                        onMouseLeave={e => e.currentTarget.style.opacity='1'}
                      >
                        <span>{event.title}</span>
                        <span style={{ fontSize:10, opacity:0.6, marginLeft:8, flexShrink:0 }}>tap to hide</span>
                      </div>
                    ))}

                    {/* Hidden events */}
                    {hidden.length > 0 && (
                      <div>
                        {!isExpanded ? (
                          <button
                            className="schedule-hidden-label"
                            onClick={() => setExpandedDays(p => ({...p, [dayKey]:true}))}
                            style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5, padding:'4px 0' }}
                          >
                            <ChevronDown size={13}/> {hidden.length} more hidden
                          </button>
                        ) : (
                          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                            {hidden.map(event => (
                              <div
                                key={event.id}
                                onClick={() => toggleRelevance(event.id, brand.id)}
                                style={{
                                  padding:'8px 14px', borderRadius:8, cursor:'pointer',
                                  background:'rgba(107,107,144,0.07)', color:'var(--muted)',
                                  border:'1px solid rgba(107,107,144,0.15)',
                                  fontSize:12, fontWeight:400, userSelect:'none',
                                  textDecoration:'line-through', opacity:0.55,
                                  display:'flex', alignItems:'center', justifyContent:'space-between',
                                  minHeight:40,
                                }}
                                onMouseEnter={e=>e.currentTarget.style.opacity='0.9'}
                                onMouseLeave={e=>e.currentTarget.style.opacity='0.55'}
                              >
                                <span>{event.title}</span>
                                <span style={{ fontSize:10, textDecoration:'none', opacity:0.7, marginLeft:8, flexShrink:0 }}>tap to show</span>
                              </div>
                            ))}
                            <button
                              onClick={() => setExpandedDays(p => ({...p, [dayKey]:false}))}
                              style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', gap:4, padding:'4px 0' }}
                            >
                              <ChevronUp size={12}/> collapse
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── DESKTOP VIEW ────────────────────────────────────────────────────
function DesktopTable({ brands, days, getEventsForBrandDay, getRelevance, toggleRelevance, selectedBrand }) {
  const [expandedCells, setExpandedCells] = useState({})
  const filteredBrands = selectedBrand === 'all' ? brands : brands.filter(b => b.id === selectedBrand)

  return (
    <div style={{ overflowX:'auto', borderRadius:'var(--radius)', border:'1px solid var(--border)' }}>
      <table style={{ borderCollapse:'collapse', width:'max-content', minWidth:'100%' }}>
        <thead>
          <tr>
            <th style={{ position:'sticky', left:0, zIndex:10, background:'var(--surface)', borderBottom:'1px solid var(--border)', borderRight:'1px solid var(--border)', padding:'10px 16px', minWidth:200, fontFamily:'var(--font-head)', fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'left' }}>Brand</th>
            {days.map(day => {
              const cur = isToday(day); const wknd = [0,6].includes(day.getDay())
              return (
                <th key={day.toISOString()} style={{ background: cur ? 'rgba(232,160,32,0.15)' : wknd ? 'rgba(255,255,255,0.02)' : 'var(--surface)', borderBottom:'1px solid var(--border)', borderRight:'1px solid var(--border)', padding:'8px 4px', minWidth:95, textAlign:'center' }}>
                  <div style={{ fontSize:9, fontWeight:700, color: cur ? 'var(--gold)' : 'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{format(day,'EEE')}</div>
                  <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:800, color: cur ? 'var(--gold)' : 'var(--muted-light)', lineHeight:1.2, marginTop:1 }}>{format(day,'d')}</div>
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
                  <div style={{ width:4, height:36, background:brand.color, borderRadius:2, flexShrink:0 }}/>
                  <div>
                    <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:12, whiteSpace:'nowrap' }}>{brand.name}</div>
                    <div style={{ fontSize:9, color:'var(--muted)', marginTop:2 }}>{brand.category}</div>
                  </div>
                </div>
              </td>
              {days.map(day => {
                const allEvts = getEventsForBrandDay(brand.id, day)
                const cur = isToday(day); const wknd = [0,6].includes(day.getDay())
                const cellKey = `${brand.id}-${format(day,'yyyy-MM-dd')}`
                const isExpanded = expandedCells[cellKey]
                const relevant = allEvts.filter(e => getRelevance(e.id, brand.id) === 'relevant')
                const hidden = allEvts.filter(e => getRelevance(e.id, brand.id) === 'not_relevant')

                return (
                  <td key={day.toISOString()} style={{ borderBottom:'1px solid var(--border)', borderRight:'1px solid var(--border)', padding:'4px', verticalAlign:'top', minWidth:95, background: cur ? 'rgba(232,160,32,0.04)' : wknd ? 'rgba(0,0,0,0.15)' : 'var(--card)' }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      {relevant.map(event => (
                        <div key={event.id} onClick={() => toggleRelevance(event.id, brand.id)} title="Click to hide"
                          style={{ fontSize:9, fontWeight:700, padding:'3px 5px', borderRadius:3, cursor:'pointer', background: brand.color+'22', color: brand.color, border:`1px solid ${brand.color}44`, borderLeft:`2px solid ${brand.color}`, lineHeight:1.3, wordBreak:'break-word', userSelect:'none' }}
                          onMouseEnter={e=>e.currentTarget.style.opacity='0.65'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}
                        >{event.title}</div>
                      ))}
                      {hidden.length > 0 && (
                        !isExpanded ? (
                          <div onClick={() => setExpandedCells(p=>({...p,[cellKey]:true}))}
                            style={{ fontSize:8, color:'var(--muted)', cursor:'pointer', padding:'1px 3px', opacity:0.6, display:'flex', alignItems:'center', gap:2 }}>
                            <ChevronDown size={9}/> {hidden.length}
                          </div>
                        ) : (
                          <>
                            {hidden.map(event => (
                              <div key={event.id} onClick={() => toggleRelevance(event.id, brand.id)}
                                style={{ fontSize:9, padding:'3px 5px', borderRadius:3, cursor:'pointer', background:'rgba(107,107,144,0.07)', color:'var(--muted)', border:'1px solid rgba(107,107,144,0.15)', opacity:0.5, textDecoration:'line-through', userSelect:'none' }}
                                onMouseEnter={e=>e.currentTarget.style.opacity='0.9'} onMouseLeave={e=>e.currentTarget.style.opacity='0.5'}
                              >{event.title}</div>
                            ))}
                            <div onClick={() => setExpandedCells(p=>({...p,[cellKey]:false}))} style={{ fontSize:8, color:'var(--muted)', cursor:'pointer', opacity:0.5 }}>▲</div>
                          </>
                        )
                      )}
                      {allEvts.length === 0 && <div style={{ minHeight:22 }}/>}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── MAIN ────────────────────────────────────────────────────────────
export default function BrandScheduleView({ brands, events, relevanceOverrides, setRelevanceOverrides }) {
  const [current, setCurrent] = useState(new Date())
  const [selectedBrand, setSelectedBrand] = useState('all')

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

  const eventsByDate = useMemo(() => {
    const map = {}
    for (const e of events) {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    }
    return map
  }, [events])

  const getEventsForBrandDay = (brandId, day) => {
    const ds = format(day, 'yyyy-MM-dd')
    return (eventsByDate[ds] || []).filter(e => e.brandIds?.includes(brandId))
  }

  const getRelevance = (eventId, brandId) => {
    const ov = relevanceOverrides?.[eventId]?.[brandId]
    if (ov) return ov
    return defaultRelevance(scoreMap[eventId]?.[brandId] ?? 0)
  }

  const toggleRelevance = (eventId, brandId) => {
    const cur = getRelevance(eventId, brandId)
    setRelevanceOverrides(prev => ({
      ...prev,
      [eventId]: { ...(prev?.[eventId] || {}), [brandId]: cur === 'relevant' ? 'not_relevant' : 'relevant' }
    }))
  }

  const handleExport = () => {
    const headers = ['Brand', ...days.map(d => format(d, 'MMM d'))]
    const rows = brands.map(b => [b.name, ...days.map(d =>
      getEventsForBrandDay(b.id, d).filter(e => getRelevance(e.id, b.id) === 'relevant').map(e => e.title).join(' / ')
    )])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `brand-schedule-${format(current, 'yyyy-MM')}.csv`
    a.click()
  }

  const sharedProps = { brands, days, getEventsForBrandDay, getRelevance, toggleRelevance }

  return (
    <div>
      {/* Header + controls */}
      <div style={{ marginBottom:14 }}>
        <h1 className="page-title" style={{ marginBottom:4 }}>Brand Schedule</h1>

        {/* Single compact controls row */}
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginTop:10 }}>
          <div style={{ display:'flex', alignItems:'center', background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', overflow:'hidden' }}>
            <button onClick={() => setCurrent(subMonths(current, 1))} style={{ padding:'8px 12px', background:'none', border:'none', color:'var(--muted-light)', cursor:'pointer', display:'flex', alignItems:'center' }}><ChevronLeft size={15}/></button>
            <span style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:14, padding:'0 4px', whiteSpace:'nowrap', minWidth:90, textAlign:'center' }}>{format(current, 'MMM yyyy')}</span>
            <button onClick={() => setCurrent(addMonths(current, 1))} style={{ padding:'8px 12px', background:'none', border:'none', color:'var(--muted-light)', cursor:'pointer', display:'flex', alignItems:'center' }}><ChevronRight size={15}/></button>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={() => setCurrent(new Date())}>Today</button>

          {/* Brand filter — desktop only */}
          <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}
            className="desktop-only"
            style={{ padding:'7px 10px', background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', color:'var(--text)', fontFamily:'var(--font-body)', fontSize:13 }}>
            <option value="all">All Brands</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <button className="btn btn-secondary btn-sm" onClick={handleExport} style={{ marginLeft:'auto', whiteSpace:'nowrap' }}>
            <Download size={13}/> CSV
          </button>
        </div>

        {/* Legend */}
        <div style={{ display:'flex', gap:16, marginTop:10, fontSize:11, color:'var(--muted)', alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ display:'flex', gap:5, alignItems:'center' }}>
            <span style={{ width:8, height:8, borderRadius:2, background:'var(--green)', display:'inline-block' }}/> Relevant
          </span>
          <span style={{ display:'flex', gap:5, alignItems:'center', opacity:0.5 }}>
            <span style={{ width:8, height:8, borderRadius:2, background:'var(--muted)', display:'inline-block' }}/> Hidden
          </span>
          <span>Tap/click any holiday to toggle</span>
        </div>
      </div>

      {events.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--radius)' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📅</div>
          <p style={{ color:'var(--muted)' }}>Use Paste Import on the Dashboard to import holidays</p>
        </div>
      ) : (
        <>
          <div className="mobile-only">
            <MobileView {...sharedProps} />
          </div>
          <div className="desktop-only">
            <DesktopTable {...sharedProps} selectedBrand={selectedBrand} />
          </div>
        </>
      )}
    </div>
  )
}
