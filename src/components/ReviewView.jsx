import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Check, X, ExternalLink, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

// Single holiday card with brand selector
function HolidayCard({ holiday, brands, onApprove, onDismiss }) {
  const [selected, setSelected] = useState(holiday.brandIds || [])
  const [expanded, setExpanded] = useState(false)

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    )
  }

  const hasSuggestions = (holiday.brandIds || []).length > 0

  return (
    <div style={{
      background: 'var(--card)',
      border: `1px solid ${selected.length > 0 ? 'var(--border-light)' : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      transition: 'border-color 0.15s ease',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px' }}>
        {/* Date block */}
        <div style={{ textAlign: 'center', minWidth: 44, flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 24, color: 'var(--gold)', lineHeight: 1 }}>
            {format(parseISO(holiday.date), 'd')}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>
            {format(parseISO(holiday.date), 'MMM')}
          </div>
        </div>

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15 }}>
              {holiday.title}
            </span>
            {hasSuggestions && (
              <span className="badge badge-gold" style={{ fontSize: 10 }}>
                {holiday.brandIds.length} suggestion{holiday.brandIds.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Description toggle */}
          {holiday.description && (
            <div style={{ marginTop: 4 }}>
              <div style={{
                fontSize: 12, color: 'var(--muted-light)',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: expanded ? 'unset' : 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {holiday.description}
              </div>
              {holiday.description.length > 120 && (
                <button
                  onClick={() => setExpanded(e => !e)}
                  style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 11, cursor: 'pointer', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  {expanded ? <><ChevronUp size={12} /> Less</> : <><ChevronDown size={12} /> More</>}
                </button>
              )}
            </div>
          )}

          {holiday.url && (
            <a href={holiday.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4, textDecoration: 'none' }}>
              <ExternalLink size={10} /> nationaltoday.com
            </a>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onApprove(holiday.id, selected)}
            disabled={selected.length === 0}
            title={selected.length === 0 ? 'Select at least one brand' : 'Approve & add to events'}
            style={{ opacity: selected.length === 0 ? 0.4 : 1 }}
          >
            <Check size={13} /> Approve
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDismiss(holiday.id)} title="Skip this holiday">
            <X size={14} style={{ color: 'var(--muted)' }} />
          </button>
        </div>
      </div>

      {/* Brand selector */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '12px 18px',
        background: 'rgba(0,0,0,0.15)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
          Assign to brands
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {brands.map(brand => {
            const isSelected = selected.includes(brand.id)
            const isSuggested = (holiday.brandIds || []).includes(brand.id)
            return (
              <div
                key={brand.id}
                onClick={() => toggle(brand.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 11px',
                  borderRadius: 20,
                  border: `1px solid ${isSelected ? brand.color : 'var(--border-light)'}`,
                  background: isSelected ? brand.color + '22' : 'transparent',
                  color: isSelected ? brand.color : 'var(--muted-light)',
                  cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: isSelected ? brand.color : 'var(--muted)',
                  flexShrink: 0,
                }} />
                {brand.name}
                {isSuggested && !isSelected && (
                  <span style={{
                    fontSize: 9, background: 'var(--gold-dim)', color: 'var(--gold)',
                    borderRadius: 4, padding: '0 4px', fontWeight: 700
                  }}>✦</span>
                )}
              </div>
            )
          })}
        </div>
        {selected.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
            ✓ Will be added for: <strong style={{ color: 'var(--text)' }}>
              {brands.filter(b => selected.includes(b.id)).map(b => b.name).join(', ')}
            </strong>
          </div>
        )}
        {selected.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
            Select at least one brand to approve, or dismiss if not relevant
          </div>
        )}
      </div>
    </div>
  )
}

export default function ReviewView({ pending, brands, onApprove, onDismiss, onFetch, fetching }) {
  const [monthFilter, setMonthFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Get unique months from pending
  const months = [...new Set(pending.map(h => h.date.slice(0, 7)))].sort()

  const filtered = pending.filter(h => {
    const matchMonth = monthFilter === 'all' || h.date.startsWith(monthFilter)
    const matchSearch = h.title.toLowerCase().includes(search.toLowerCase())
    return matchMonth && matchSearch
  })

  const handleApproveAll = () => {
    // Approve all that have at least one brand suggested
    const withBrands = filtered.filter(h => (h.brandIds || []).length > 0)
    withBrands.forEach(h => onApprove(h.id, h.brandIds))
  }

  const handleDismissAll = () => {
    if (confirm(`Dismiss all ${filtered.length} holidays? They won't appear again.`)) {
      filtered.forEach(h => onDismiss(h.id))
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Review Holidays</h1>
          <p className="page-subtitle">
            {pending.length > 0
              ? `${pending.length} holidays waiting — assign brands and approve to add to your calendar`
              : 'No holidays pending review'
            }
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={onFetch} disabled={fetching}>
            {fetching ? <span className="loading-spinner" /> : <RefreshCw size={14} />}
            {fetching ? 'Fetching...' : 'Fetch More'}
          </button>
          {filtered.length > 0 && (
            <>
              <button className="btn btn-secondary" onClick={handleDismissAll}>
                <X size={14} /> Dismiss All
              </button>
              <button className="btn btn-primary" onClick={handleApproveAll}>
                <Check size={14} /> Approve Suggested
              </button>
            </>
          )}
        </div>
      </div>

      {pending.length === 0 ? (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '60px 40px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 18, marginBottom: 8 }}>No holidays to review</h3>
          <p style={{ color: 'var(--muted)', marginBottom: 20 }}>
            Click "Fetch More" to pull the latest holidays from nationaltoday.com
          </p>
          <button className="btn btn-primary" onClick={onFetch} disabled={fetching}>
            {fetching ? <span className="loading-spinner" /> : <RefreshCw size={14} />}
            {fetching ? 'Fetching...' : 'Fetch Holidays Now'}
          </button>
        </div>
      ) : (
        <>
          {/* Legend */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '12px 16px',
            marginBottom: 20, display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted-light)'
          }}>
            <span><strong style={{ color: 'var(--gold)' }}>✦</strong> = Auto-suggested based on brand keywords</span>
            <span>Click brand pills to select/deselect</span>
            <span><strong style={{ color: 'var(--text)' }}>Approve</strong> = adds to your Events & Calendar</span>
            <span><strong style={{ color: 'var(--text)' }}>✕</strong> = skip this holiday</span>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search holidays..."
                style={{ paddingLeft: 14 }}
              />
            </div>
            <select
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="all">All months ({pending.length})</option>
              {months.map(m => {
                const count = pending.filter(h => h.date.startsWith(m)).length
                const label = format(parseISO(m + '-01'), 'MMMM yyyy')
                return <option key={m} value={m}>{label} ({count})</option>
              })}
            </select>
          </div>

          {/* Holiday cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(holiday => (
              <HolidayCard
                key={holiday.id}
                holiday={holiday}
                brands={brands}
                onApprove={onApprove}
                onDismiss={onDismiss}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
              No holidays match your search
            </div>
          )}
        </>
      )}
    </div>
  )
}
