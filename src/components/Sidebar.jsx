import { LayoutDashboard, Tag, Calendar, List, Settings, Plus, TableProperties, X, ChevronLeft, ChevronRight } from 'lucide-react'

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
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />

      <aside className={`sidebar ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo" style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
          {!collapsed && (
            <>
              <div className="logo-mark">B</div>
              <div style={{ flex: 1 }}>
                <div className="logo-text">BrandTrack</div>
                <div className="logo-sub">Holiday Dashboard</div>
              </div>
            </>
          )}
          {collapsed && <div className="logo-mark">B</div>}
          {/* Mobile close */}
          <button onClick={onClose} className="mobile-close-btn"
            style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', padding:4, display:'flex' }}>
            <X size={18}/>
          </button>
        </div>

        {/* Nav */}
        <nav className="nav-section" style={{ flex: 1 }}>
          {!collapsed && <div className="nav-label">Main</div>}
          {NAV.map(({ id, label, icon: Icon }) => (
            <div key={id}
              className={`nav-item ${view === id ? 'active' : ''}`}
              onClick={() => handleNav(id)}
              title={collapsed ? label : undefined}
              style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '10px' : undefined }}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
            </div>
          ))}

          {!collapsed && <div className="nav-label" style={{ marginTop: 12 }}>System</div>}
          <div className={`nav-item ${view === 'settings' ? 'active' : ''}`}
            onClick={() => handleNav('settings')}
            title={collapsed ? 'Settings' : undefined}
            style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '10px' : undefined }}
          >
            <Settings size={16} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Settings</span>}
          </div>
        </nav>

        {/* Bottom: collapse toggle + add button */}
        <div className="sidebar-bottom" style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed?.(v => !v)}
            className="desktop-only"
            style={{
              display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'flex-end',
              gap:6, background:'none', border:'none', color:'var(--muted)', cursor:'pointer',
              padding:'6px 8px', borderRadius:'var(--radius-sm)', width:'100%', fontSize:11,
              transition:'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
          >
            {collapsed
              ? <><ChevronRight size={14}/></>
              : <><span>Collapse</span><ChevronLeft size={14}/></>
            }
          </button>

          {!collapsed && (
            <button className="add-btn" onClick={() => { onAddEvent(); onClose?.() }}>
              <Plus size={15}/> Add Event
            </button>
          )}
          {collapsed && (
            <button onClick={() => { onAddEvent(); onClose?.() }}
              title="Add Event"
              style={{ background:'var(--gold)', border:'none', borderRadius:'var(--radius-sm)', padding:'10px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#07070F' }}>
              <Plus size={16}/>
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
