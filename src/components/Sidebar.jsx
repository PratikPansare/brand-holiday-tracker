import { LayoutDashboard, Tag, Calendar, List, Settings, Plus,
         TableProperties, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

export default function Sidebar({ view, setView, onAddEvent, isOpen, onClose, collapsed, setCollapsed }) {
  const NAV = [
    { id: 'dashboard', label: 'Dashboard',      icon: LayoutDashboard },
    { id: 'schedule',  label: 'Brand Schedule', icon: TableProperties },
    { id: 'brands',    label: 'Brands',         icon: Tag },
    { id: 'calendar',  label: 'Calendar',       icon: Calendar },
    { id: 'events',    label: 'All Events',     icon: List },
  ]

  const handleNav = (id) => { setView(id); onClose?.() }

  return (
    <>
      {/* Mobile backdrop */}
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />

      <aside className={`sidebar ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>

        {/* ── Header row ── */}
        <div className="sidebar-logo" style={{
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: collapsed ? 0 : 10,
        }}>
          {/* Logo always visible */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div className="logo-mark" style={{ flexShrink: 0 }}>B</div>
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div className="logo-text">BrandTrack</div>
                <div className="logo-sub">Holiday Dashboard</div>
              </div>
            )}
          </div>

          {/* Desktop: collapse/expand icon — hidden on mobile */}
          {!collapsed && (
            <button
              onClick={() => setCollapsed?.(v => !v)}
              title="Collapse sidebar"
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}
              className="desktop-only"
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
            >
              <PanelLeftClose size={17} />
            </button>
          )}

          {/* Mobile: close X — hidden on desktop */}
          <button
            onClick={onClose}
            title="Close"
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}
            className="mobile-only"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Nav items ── */}
        <nav className="nav-section" style={{ flex: 1 }}>
          {!collapsed && <div className="nav-label">Main</div>}

          {NAV.map(({ id, label, icon: Icon }) => (
            <div
              key={id}
              className={`nav-item ${view === id ? 'active' : ''}`}
              onClick={() => handleNav(id)}
              title={collapsed ? label : undefined}
              style={{
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '9px' : undefined,
              }}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
            </div>
          ))}

          {!collapsed && <div className="nav-label" style={{ marginTop: 12 }}>System</div>}
          <div
            className={`nav-item ${view === 'settings' ? 'active' : ''}`}
            onClick={() => handleNav('settings')}
            title={collapsed ? 'Settings' : undefined}
            style={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '9px' : undefined,
            }}
          >
            <Settings size={16} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Settings</span>}
          </div>
        </nav>

        {/* ── Bottom ── */}
        <div className="sidebar-bottom" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Expand button (desktop, collapsed state only) */}
          {collapsed && (
            <button
              onClick={() => setCollapsed?.(v => !v)}
              title="Expand sidebar"
              className="desktop-only"
              style={{ background: 'none', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--muted)', cursor: 'pointer', padding: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--gold)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border-light)' }}
            >
              <PanelLeftOpen size={16} />
            </button>
          )}

          {/* Add event button */}
          {!collapsed ? (
            <button className="add-btn" onClick={() => { onAddEvent(); onClose?.() }}>
              <Plus size={15} /> Add Event
            </button>
          ) : (
            <button
              onClick={() => { onAddEvent(); onClose?.() }}
              title="Add Event"
              style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#07070F' }}
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
