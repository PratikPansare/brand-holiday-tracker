import { LayoutDashboard, Tag, Calendar, List, Settings, Plus } from 'lucide-react'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'brands', label: 'Brands', icon: Tag },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'events', label: 'All Events', icon: List },
]

export default function Sidebar({ view, setView, onAddEvent }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">B</div>
        <div>
          <div className="logo-text">BrandTrack</div>
          <div className="logo-sub">Holiday Dashboard</div>
        </div>
      </div>

      <nav className="nav-section">
        <div className="nav-label">Main</div>
        {NAV.map(({ id, label, icon: Icon }) => (
          <div
            key={id}
            className={`nav-item ${view === id ? 'active' : ''}`}
            onClick={() => setView(id)}
          >
            <Icon size={16} />
            {label}
          </div>
        ))}

        <div className="nav-label" style={{ marginTop: 12 }}>System</div>
        <div
          className={`nav-item ${view === 'settings' ? 'active' : ''}`}
          onClick={() => setView('settings')}
        >
          <Settings size={16} />
          Settings
        </div>
      </nav>

      <div className="sidebar-bottom">
        <button className="add-btn" onClick={onAddEvent}>
          <Plus size={15} />
          Add Event
        </button>
      </div>
    </aside>
  )
}
