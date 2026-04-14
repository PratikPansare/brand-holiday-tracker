import { useState, useMemo, useEffect, useRef } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         isToday, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Download, Star, ThumbsUp, Minus, EyeOff, ChevronDown } from 'lucide-react'
import { scoreHolidayForBrandById } from '../utils/matching'

// 4 tiers — can be overridden manually by user
const TIERS = {
  high:      { label: 'Must Post',  icon: '★', color: null /* uses brand color */, opacity: 1,    fontWeight: 700 },
  medium:    { label: 'Good Fit',   icon: '●', color: null,                        opacity: 0.85, fontWeight: 600 },
  low:       { label: 'Possible',   icon: '○', color: '#7B5FF5',                   opacity: 0.6,  fontWeight: 400 },
  dismissed: { label: 'Hidden',     icon: '×', color: '#3a3a5a',                   opacity: 0.25, fontWeight: 400 },
}

function scoreTier(score) {
  if (score >= 9) return 'high'
  if (score >= 6) return 'medium'
  if (score >= 3) return 'low'
  return 'low' // default to low instead of dismissed so nothing is hidden by default
}

// Small popover that appears when clicking a holiday
function RelevancePopover({ event, brand, currentTier, onSelect, onClose }) {
  const ref = useRef()
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const options = [
    { tier: 'high',      icon: <Star size={13} />,      label: 'Must Post',  desc: 'Top priority' },
    { tier: 'medium',    icon: <ThumbsUp size={13} />,  label: 'Good Fit',   desc: 'Worth posting' },
    { tier: 'low',       icon: <Minus size={13} />,     label: 'Possible',   desc: 'Low priority' },
    { tier: 'dismissed', icon: <EyeOff size={13} />,    label: 'Hide',       desc: 'Hide for this brand' },
  ]

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', left: 0, zIndex: 999,
      background: 'var(--surface)', border: '1px solid var(--border-light)',
      borderRadius: 10, padding: 6, minWidth: 170,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      animation: 'slideUp 0.12s ease',
    }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 8px 6px' }}>
        Set relevance for {brand.name}
      </div>
      {options.map(opt => (
        <div
          key={opt.tier}
          onClick={() => { onSelect(opt.tier); onClose() }}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
            background: currentTier === opt.tier ? 'var(--gold-dim)' : 'transparent',
            color: currentTier === opt.tier ? 'var(--gold)' : 'var(--muted-light)',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => { if (currentTier !== opt.tier) e.currentTarget.style.background = 'var(--card)' }}
          onMouseLeave={e => { if (currentTier !== opt.tier) e.currentTarget.style.background = 'transparent' }}
        >
          <span style={{ color: currentTier === opt.tier ? 'var(--gold)' : 'var(--muted)' }}>{opt.icon}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{opt.label}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{opt.desc}</div>
          </div>
          {currentTier === opt.tier && <span style={{ marginLeft: 'auto', fontSize: 10 }}>✓</span>}
        </div>
      ))}
    </div>
  )
}

export default function BrandScheduleView({ brands, events, relevanceOverrides, setRelevanceOverrides }) {
  const [current, setCurrent] = useState(new Date())
  const [selectedBrand, setSelectedBrand] = useState('all')
  const [hideDismissed, setHideDismissed] = useState(true) // hide dismissed by default
  const [openPopover, setOpenPopover] = useState(null) // { eventId, brandId }

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Compute effective relevance tier for an event+brand
  const getEffectiveTier = (eventId, brandId, score) => {
    const override = relevanceOverrides?.[eventId]?.[brandId]
    return override || scoreTier(score)
  }

  const handleSetRelevance = (eventId, brandId, tier) => {
    setRelevanceOverrides(prev => ({
      ...prev,
      [eventId]: { ...(prev?.[eventId] || {}), [brandId]: tier }
    }))
  }

  // Pre-compute scores
  const scoreMap = useMemo(() => {
    const map = {}
    for (const event of events) {
      map[event.id] = {}
      for (const brand of brands) {
        if (event.brandIds?.includes(brand.id)) {
          map[event.id][brand.id] = scoreHolidayForBrandById(event, brand)
        }
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

  // Count dismissed events per brand for the month
  const dismissedCount = useMemo(() => {
    let count = 0
    for (const brand of brands) {
      for (const day of days) {
        const evts = getEventsForBrandDay(brand.id, day)
        for (const e of evts) {
          const score = scoreMap[e.id]?.[brand.id] ?? 0
          const tier = getEffectiveTier(e.id, brand.id, score)
          if (tier === 'dismissed') count++
        }
      }
    }
    return count
  }, [events, brands, days, relevanceOverrides, scoreMap])

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
        const evts = getEventsForBrandDay(brand.id, day).filter(e => {
          const score = scoreMap[e.id]?.[brand.id] ?? 0
          return getEffectiveTier(e.id, brand.id, score) !== 'dismissed'
        })
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
          <p className="page-subtitle">{format(current, 'MMMM yyyy')} · Click any holiday to set its relevance</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
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
          <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)} style={{ width: 'auto' }}>
            <option value="all">All Brands</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setHideDismissed(v => !v)}
            style={{ borderColor: !hideDismissed ? 'var(--gold)' : undefined, color: !hideDismissed ? 'var(--gold)' : undefined }}
          >
            <EyeOff size={13} />
            {hideDismissed ? `Show Hidden (${dismissedCount})` : 'Hide Dismissed'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap',
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', padding: '10px 16px', marginBottom: 16, fontSize: 12,
      }}>
        <span style={{ color: 'var(--muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Relevance:</span>
        {[
          { label: '★ Must Post',  bg: 'var(--green)', opacity: 1 },
          { label: '● Good Fit',   bg: 'var(--gold)',  opacity: 0.85 },
          { label: '○ Possible',   bg: '#7B5FF5',      opacity: 0.6 },
          { label: '× Hidden',     bg: '#3a3a5a',      opacity: 0.4 },
        ].map(({ label, bg, opacity }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted-light)', opacity }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: bg, display: 'inline-block' }} />
            {label}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
          Click any holiday pill to change relevance
        </span>
      </div>

      {events.length === 0 ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
          <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 18, marginBottom: 8 }}>No events yet</h3>
          <p style={{ color: 'var(--muted)' }}>Use Paste Import on the Dashboard to import holidays from nationaltoday.com</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '100%' }}>
            <thead>
              <tr>
                <th style={{
                  position: 'sticky', left: 0, zIndex: 10,
                  background: 'var(--surface)', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)',
                  padding: '10px 16px', minWidth: 210, fontFamily: 'var(--font-head)', fontSize: 11, fontWeight: 700,
                  color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left',
                }}>Brand</th>
                {days.map(day => {
                  const isCurrentDay = isToday(day)
                  const isWeekend = [0, 6].includes(day.getDay())
                  return (
                    <th key={day.toISOString()} style={{
                      background: isCurrentDay ? 'rgba(232,160,32,0.15)' : isWeekend ? 'rgba(255,255,255,0.02)' : 'var(--surface)',
                      borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)',
                      padding: '8px 6px', minWidth: 110, textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: isCurrentDay ? 'var(--gold)' : 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {format(day, 'EEE')}
                      </div>
                      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 800, color: isCurrentDay ? 'var(--gold)' : 'var(--muted-light)', lineHeight: 1.2, marginTop: 2 }}>
                        {format(day, 'd')}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {filteredBrands.map(brand => (
                <tr key={brand.id}>
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 5, background: 'var(--surface)',
                    borderBottom: '1px solid var(--border)', borderRight: '2px solid var(--border-light)', padding: '10px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 4, height: 36, background: brand.color, borderRadius: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 12.5, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                          {brand.name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                          {brand.category} · <span style={{ color: brand.color, fontWeight: 700 }}>{brandTotals[brand.id] || 0}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {days.map(day => {
                    const allCellEvents = getEventsForBrandDay(brand.id, day)
                    const isCurrentDay = isToday(day)
                    const isWeekend = [0, 6].includes(day.getDay())

                    // Separate by tier
                    const tieredEvents = allCellEvents.map(e => {
                      const score = scoreMap[e.id]?.[brand.id] ?? 0
                      const tier = getEffectiveTier(e.id, brand.id, score)
                      return { event: e, score, tier }
                    })

                    // Visible = everything except dismissed (if hideDismissed is true)
                    const visible = tieredEvents.filter(({ tier }) =>
                      hideDismissed ? tier !== 'dismissed' : true
                    )

                    // Sort: high first, then medium, then low, then dismissed
                    const tierOrder = { high: 0, medium: 1, low: 2, dismissed: 3 }
                    visible.sort((a, b) => (tierOrder[a.tier] ?? 2) - (tierOrder[b.tier] ?? 2))

                    const dismissedInCell = tieredEvents.filter(({ tier }) => tier === 'dismissed').length

                    return (
                      <td key={day.toISOString()} style={{
                        borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)',
                        padding: '5px', verticalAlign: 'top', minWidth: 110,
                        background: isCurrentDay ? 'rgba(232,160,32,0.04)' : isWeekend ? 'rgba(0,0,0,0.15)' : 'var(--card)',
                      }}>
                        {visible.length === 0 && dismissedInCell === 0 ? (
                          <div style={{ minHeight: 32 }} />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {visible.map(({ event, tier }) => {
                              const isPopoverOpen = openPopover?.eventId === event.id && openPopover?.brandId === brand.id

                              // Tier-based styles
                              const tierColor = tier === 'low' || tier === 'dismissed' ? TIERS[tier].color : brand.color
                              const bgAlpha = tier === 'high' ? '35' : tier === 'medium' ? '22' : tier === 'dismissed' ? '08' : '12'
                              const borderAlpha = tier === 'high' ? '70' : tier === 'medium' ? '45' : tier === 'dismissed' ? '15' : '25'

                              return (
                                <div key={event.id} style={{ position: 'relative' }}>
                                  <div
                                    onClick={() => setOpenPopover(isPopoverOpen ? null : { eventId: event.id, brandId: brand.id })}
                                    style={{
                                      fontSize: 10, fontWeight: TIERS[tier].fontWeight,
                                      padding: '3px 6px', borderRadius: 4, cursor: 'pointer',
                                      background: tierColor + bgAlpha,
                                      color: tier === 'dismissed' ? '#505070' : tierColor,
                                      border: `1px solid ${tierColor + borderAlpha}`,
                                      borderLeft: tier === 'high' ? `3px solid ${tierColor}` : `1px solid ${tierColor + borderAlpha}`,
                                      opacity: TIERS[tier].opacity,
                                      lineHeight: 1.3, wordBreak: 'break-word',
                                      transition: 'opacity 0.1s, transform 0.1s',
                                      textDecoration: tier === 'dismissed' ? 'line-through' : 'none',
                                      userSelect: 'none',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.02)' }}
                                    onMouseLeave={e => { e.currentTarget.style.opacity = String(TIERS[tier].opacity); e.currentTarget.style.transform = 'none' }}
                                    title="Click to set relevance for this brand"
                                  >
                                    {tier === 'high' && <span style={{ marginRight: 3 }}>★</span>}
                                    {event.title}
                                  </div>

                                  {isPopoverOpen && (
                                    <RelevancePopover
                                      event={event}
                                      brand={brand}
                                      currentTier={tier}
                                      onSelect={(newTier) => handleSetRelevance(event.id, brand.id, newTier)}
                                      onClose={() => setOpenPopover(null)}
                                    />
                                  )}
                                </div>
                              )
                            })}

                            {/* Show count of hidden items */}
                            {hideDismissed && dismissedInCell > 0 && (
                              <div
                                onClick={() => setHideDismissed(false)}
                                style={{ fontSize: 9, color: 'var(--muted)', cursor: 'pointer', padding: '2px 4px', opacity: 0.6 }}
                              >
                                +{dismissedInCell} hidden
                              </div>
                            )}
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

      <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap', fontSize: 11, color: 'var(--muted)' }}>
        <span>★ = Must Post</span>
        <span style={{ background: 'rgba(232,160,32,0.15)', padding: '1px 6px', borderRadius: 3 }}>■ Today</span>
        <span style={{ background: 'rgba(0,0,0,0.15)', padding: '1px 6px', borderRadius: 3 }}>■ Weekend</span>
        <span>Click any holiday to change its relevance per brand</span>
      </div>
    </div>
  )
}
