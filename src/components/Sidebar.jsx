import { LayoutDashboard, Tag, Calendar, List, Settings, Plus, TableProperties, Menu } from 'lucide-react'

export default function Sidebar({ view, setView, onAddEvent, isOpen, onClose, collapsed, setCollapsed }) {
  const NAV = [
    { id: 'dashboard', label: 'Dashboard',      icon: LayoutDashboard },
    { id: 'schedule',  label: 'Brand Schedule', icon: TableProperties },
    { id: 'brands',    label: 'Brands',         icon: Tag },
    { id: 'calendar',  label: 'Calendar',       icon: Calendar },
    { id: 'events',    label: 'All Events',     icon: List },
  ]

  const handleNav = (id) => {
    setView(id)
    // On mobile: close drawer after nav
    if (window.innerWidth <= 768) onClose?.()
    // On desktop collapsed: keep collapsed
  }

  // Desktop: hamburger toggles collapsed ↔ expanded
  // Mobile: hamburger is in the top bar (App.jsx), this just renders the drawer
  const handleHamburger = () => {
    if (window.innerWidth <= 768) {
      onClose?.() // close mobile drawer
    } else {
      setCollapsed?.(v => !v) // toggle desktop collapse
    }
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />

      <aside className={`sidebar ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>

        {/* Header row — hamburger is the ONLY control */}
        <div className="sidebar-logo" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '18px 0' : undefined,
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div className="logo-mark" style={{ flexShrink: 0 }}>B</div>
              <div>
                <div className="logo-text">BrandTrack</div>
                <div className="logo-sub">Holiday Dashboard</div>
              </div>
            </div>
          )}
          {collapsed && <div className="logo-mark">B</div>}

          {/* Single hamburger button — does everything */}
          <button
            onClick={handleHamburger}
            title={collapsed ? 'Expand' : 'Collapse'}
            style={{
              background: 'none', border: 'none', color: 'var(--muted)',
              cursor: 'pointer', padding: 6, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              // On desktop collapsed: show below logo mark, not beside it
              ...(collapsed ? { marginTop: 8 } : {}),
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="nav-section" style={{ flex: 1 }}>
          {!collapsed && <div className="nav-label">Main</div>}
          {NAV.map(({ id, label, icon: Icon }) => (
            <div
              key={id}
              className={`nav-item ${view === id ? 'active' : ''}`}
              onClick={() => handleNav(id)}
              title={collapsed ? label : undefined}
              style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '10px 0' : undefined }}
            >
              <Icon size={collapsed ? 20 : 16} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
            </div>
          ))}

          {!collapsed && <div className="nav-label" style={{ marginTop: 12 }}>System</div>}
          <div
            className={`nav-item ${view === 'settings' ? 'active' : ''}`}
            onClick={() => handleNav('settings')}
            title={collapsed ? 'Settings' : undefined}
            style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '10px 0' : undefined }}
          >
            <Settings size={collapsed ? 20 : 16} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Settings</span>}
          </div>
        </nav>

        {/* Bottom — add event */}
        <div className="sidebar-bottom">
          {!collapsed ? (
            <button className="add-btn" onClick={() => { onAddEvent(); if (window.innerWidth <= 768) onClose?.() }}>
              <Plus size={15} /> Add Event
            </button>
          ) : (
            <button
              onClick={() => { onAddEvent(); if (window.innerWidth <= 768) onClose?.() }}
              title="Add Event"
              style={{
                background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius-sm)',
                padding: '10px', cursor: 'pointer', width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#07070F',
              }}
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
