import { LayoutDashboard, Tag, Calendar, List, Settings, Plus, TableProperties, X } from 'lucide-react'

export default function Sidebar({ view, setView, onAddEvent, isOpen, onClose }) {
  const NAV = [
    { id: 'dashboard', label: 'Dashboard',      icon: LayoutDashboard },
    { id: 'schedule',  label: 'Brand Schedule', icon: TableProperties },
    { id: 'brands',    label: 'Brands',         icon: Tag },
    { id: 'calendar',  label: 'Calendar',       icon: Calendar },
    { id: 'events',    label: 'All Events',     icon: List },
  ]

  const handleNav = (id) => {
    setView(id)
    onClose?.()
  }

  return (
    <>
      {/* Overlay for mobile */}
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-mark">B</div>
          <div style={{ flex: 1 }}>
            <div className="logo-text">BrandTrack</div>
            <div className="logo-sub">Holiday Dashboard</div>
          </div>
          {/* Close button — only shows on mobile */}
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, display: 'flex' }}
            className="mobile-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="nav-section">
          <div className="nav-label">Main</div>
          {NAV.map(({ id, label, icon: Icon }) => (
            <div key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => handleNav(id)}>
              <Icon size={16} />
              <span>{label}</span>
            </div>
          ))}
          <div className="nav-label" style={{ marginTop: 12 }}>System</div>
          <div className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => handleNav('settings')}>
            <Settings size={16} />
            Settings
          </div>
        </nav>

        <div className="sidebar-bottom">
          <button className="add-btn" onClick={() => { onAddEvent(); onClose?.() }}>
            <Plus size={15} /> Add Event
          </button>
        </div>
      </aside>
    </>
  )
}
