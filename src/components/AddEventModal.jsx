import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { format } from 'date-fns'

export default function AddEventModal({ brands, onClose, onAdd }) {
  const [form, setForm] = useState({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    brandIds: [],
    notifyDays: 1,
  })

  const toggleBrand = (id) => {
    setForm(f => ({
      ...f,
      brandIds: f.brandIds.includes(id) ? f.brandIds.filter(b => b !== id) : [...f.brandIds, id]
    }))
  }

  const handleAdd = () => {
    if (!form.title.trim() || !form.date) return
    onAdd(form)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Add Manual Event</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="form-group">
          <label>Event Title *</label>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. World Environment Day"
            autoFocus
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Date *</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Notify (days before)</label>
            <select value={form.notifyDays} onChange={e => setForm(f => ({ ...f, notifyDays: Number(e.target.value) }))}>
              <option value={0}>Same day</option>
              <option value={1}>1 day before</option>
              <option value={2}>2 days before</option>
              <option value={3}>3 days before</option>
              <option value={7}>1 week before</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Description / Post Brief</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="What should be posted? Any specific messaging, tone, or ideas..."
          />
        </div>

        <div className="form-group">
          <label>Assign to Brands</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {brands.length === 0 && (
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>No brands yet — add brands first</span>
            )}
            {brands.map(brand => (
              <div
                key={brand.id}
                onClick={() => toggleBrand(brand.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 20,
                  border: `1px solid ${form.brandIds.includes(brand.id) ? brand.color : 'var(--border-light)'}`,
                  background: form.brandIds.includes(brand.id) ? brand.color + '20' : 'transparent',
                  color: form.brandIds.includes(brand.id) ? brand.color : 'var(--muted-light)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                }}
              >
                <span className="brand-dot" style={{ background: brand.color }} />
                {brand.name}
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={!form.title.trim() || !form.date}
          >
            <Check size={14} /> Add Event
          </button>
        </div>
      </div>
    </div>
  )
}
