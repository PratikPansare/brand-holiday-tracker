import { useState } from 'react'
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react'
import { parseISO } from 'date-fns'

const COLORS = ['#E8A020', '#7B5FF5', '#20C07A', '#E84055', '#38B2F0', '#F06292', '#4DB6AC', '#FF7043', '#AB47BC', '#26A69A']
const CATEGORIES = ['Skincare', 'Food & Beverage', 'Fashion', 'Tech', 'Finance', 'Agency/Marketing', 'Lifestyle', 'Fitness', 'Travel', 'Entertainment', 'Barbershop', 'Retail', 'Other']

function BrandModal({ brand, onSave, onClose }) {
  const [form, setForm] = useState(brand || { name: '', category: '', color: COLORS[0], keywords: '' })

  const handleSave = () => {
    if (!form.name.trim()) return
    const keywords = typeof form.keywords === 'string'
      ? form.keywords.split(',').map(k => k.trim()).filter(Boolean)
      : form.keywords
    onSave({ ...form, keywords })
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{brand ? 'Edit Brand' : 'Add Brand'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="form-group">
          <label>Brand Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Aesthetic Revival" />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Custom Category</label>
            <input
              value={CATEGORIES.includes(form.category) ? '' : form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              placeholder="Or type your own"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Brand Color</label>
          <div className="color-options">
            {COLORS.map(c => (
              <div
                key={c}
                className={`color-opt ${form.color === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setForm(f => ({ ...f, color: c }))}
              />
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Keywords (comma separated)</label>
          <input
            value={typeof form.keywords === 'string' ? form.keywords : (form.keywords || []).join(', ')}
            onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
            placeholder="e.g. beauty, skincare, wellness, self-care"
          />
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
            Keywords help auto-match holidays to this brand
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Check size={14} /> {brand ? 'Save Changes' : 'Add Brand'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BrandsView({ brands, setBrands, events }) {
  const [showModal, setShowModal] = useState(false)
  const [editBrand, setEditBrand] = useState(null)

  const handleSave = (form) => {
    if (editBrand) {
      setBrands(prev => prev.map(b => b.id === editBrand.id ? { ...editBrand, ...form } : b))
    } else {
      setBrands(prev => [...prev, { ...form, id: Date.now().toString() }])
    }
    setShowModal(false)
    setEditBrand(null)
  }

  const handleDelete = (id) => {
    if (confirm('Delete this brand? Events assigned to it will remain.')) {
      setBrands(prev => prev.filter(b => b.id !== id))
    }
  }

  const today = new Date()

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Brands</h1>
          <p className="page-subtitle">Manage your brands and their holiday categories</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditBrand(null); setShowModal(true) }}>
          <Plus size={14} /> Add Brand
        </button>
      </div>

      {brands.length === 0 ? (
        <div className="empty-state">
          <Plus size={40} />
          <h3>No brands yet</h3>
          <p>Add your first brand to start tracking holidays</p>
        </div>
      ) : (
        <div className="brand-grid">
          {brands.map(brand => {
            const brandEvents = events.filter(e => e.brandIds?.includes(brand.id))
            const upcoming = brandEvents.filter(e => parseISO(e.date) >= today).length
            const keywords = Array.isArray(brand.keywords) ? brand.keywords : []

            return (
              <div className="brand-card" key={brand.id} style={{ borderColor: brand.color + '33' }}>
                <div className="brand-card-accent" style={{ background: brand.color }} />
                <div style={{ paddingLeft: 12 }}>
                  <div className="brand-card-top">
                    <div>
                      <div className="brand-name">{brand.name}</div>
                      {brand.category && (
                        <span className="badge badge-muted" style={{ marginTop: 4 }}>{brand.category}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditBrand(brand); setShowModal(true) }}>
                        <Edit2 size={13} />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(brand.id)}>
                        <Trash2 size={13} style={{ color: 'var(--red)' }} />
                      </button>
                    </div>
                  </div>

                  {keywords.length > 0 && (
                    <div className="brand-keywords">
                      {keywords.map(k => <span key={k} className="keyword-tag">{k}</span>)}
                    </div>
                  )}

                  <div className="brand-stats">
                    <div className="brand-stat">
                      <strong>{brandEvents.length}</strong>
                      Total Events
                    </div>
                    <div className="brand-stat">
                      <strong style={{ color: 'var(--gold)' }}>{upcoming}</strong>
                      Upcoming
                    </div>
                    <div className="brand-stat">
                      <strong style={{ color: 'var(--green)' }}>{brandEvents.filter(e => e.pushed).length}</strong>
                      Pushed
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <BrandModal
          brand={editBrand}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditBrand(null) }}
        />
      )}
    </div>
  )
}
