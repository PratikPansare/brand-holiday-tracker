import { useState } from 'react'
import { Bell, Calendar, Trash2, Download } from 'lucide-react'
import { connectGoogleCalendar, getStoredToken } from '../utils/googleCalendar'
import { requestNotificationPermission, showToast } from '../utils/notifications'

export default function Settings({ settings, setSettings, events, brands }) {
  const [clientId, setClientId] = useState(settings.googleClientId || '')
  const [saving, setSaving] = useState(false)

  const handleGoogleConnect = () => {
    connectGoogleCalendar(clientId, (token) => {
      setSettings(s => ({ ...s, googleToken: token, googleCalendarConnected: true, googleClientId: clientId }))
      showToast('Google Calendar Connected ✓', 'You can now push events to your calendar', 'success')
    })
  }

  const handleDisconnect = () => {
    localStorage.removeItem('gCalToken')
    localStorage.removeItem('gCalExpiry')
    setSettings(s => ({ ...s, googleToken: null, googleCalendarConnected: false }))
    showToast('Disconnected', 'Google Calendar disconnected', 'info')
  }

  const handleNotifications = async () => {
    if (settings.notificationsEnabled) {
      setSettings(s => ({ ...s, notificationsEnabled: false }))
      showToast('Notifications off', 'Browser notifications disabled', 'info')
    } else {
      const granted = await requestNotificationPermission()
      if (granted) {
        setSettings(s => ({ ...s, notificationsEnabled: true }))
        showToast('Notifications enabled ✓', 'You will be reminded before events', 'success')
        // Send test notification
        setTimeout(() => new Notification('BrandTrack', { body: 'Notifications are working!' }), 1000)
      } else {
        showToast('Permission denied', 'Allow notifications in browser settings', 'error')
      }
    }
  }

  const handleExport = () => {
    const data = { brands, events, exported: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `brandtrack-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const handleClearEvents = () => {
    if (confirm('Clear ALL events? This cannot be undone.')) {
      localStorage.removeItem('events')
      window.location.reload()
    }
  }

  const isConnected = settings.googleCalendarConnected && settings.googleToken
  
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure integrations and preferences</p>
        </div>
      </div>

      {/* Google Calendar */}
      <div className="settings-section">
        <div className="settings-section-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Calendar size={16} style={{ color: 'var(--gold)' }} />
          Google Calendar Integration
        </div>

        {!isConnected ? (
          <div style={{ padding: '20px 20px' }}>
            <div style={{ marginBottom: 16 }}>
              <label>Google OAuth Client ID</label>
              <input
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder="xxxxxxxx.apps.googleusercontent.com"
              />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.6 }}>
                Get this from <strong style={{ color: 'var(--gold)' }}>console.cloud.google.com</strong> → APIs &amp; Services → Credentials → OAuth 2.0 Client IDs.
                Add <code style={{ background: 'var(--bg)', padding: '1px 5px', borderRadius: 4 }}>https://your-netlify-site.netlify.app</code> as an authorized origin.
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleGoogleConnect} disabled={!clientId.trim()}>
              <Calendar size={14} /> Connect Google Calendar
            </button>
          </div>
        ) : (
          <div className="settings-row">
            <div className="settings-row-info">
              <div>Google Calendar</div>
              <div className="settings-row-desc" style={{ color: 'var(--green)' }}>✓ Connected</div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={handleDisconnect}>Disconnect</button>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="settings-section">
        <div className="settings-section-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={16} style={{ color: 'var(--violet)' }} />
          Browser Notifications
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div>Enable Reminders</div>
            <div className="settings-row-desc">Get browser notifications before events</div>
          </div>
          <button className={`toggle ${settings.notificationsEnabled ? 'on' : ''}`} onClick={handleNotifications} />
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div>Notification Status</div>
            <div className="settings-row-desc">Current browser permission level</div>
          </div>
          <span className={`badge ${Notification.permission === 'granted' ? 'badge-green' : 'badge-muted'}`}>
            {typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'}
          </span>
        </div>
      </div>

      {/* Data */}
      <div className="settings-section">
        <div className="settings-section-header">Data Management</div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div>Export Data</div>
            <div className="settings-row-desc">Download all brands and events as JSON</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <Download size={13} /> Export
          </button>
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div>Clear All Events</div>
            <div className="settings-row-desc">Remove all fetched and manual events</div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={handleClearEvents}>
            <Trash2 size={13} /> Clear Events
          </button>
        </div>
      </div>

      {/* Setup Guide */}
      <div className="settings-section">
        <div className="settings-section-header">🚀 Setup Guide</div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { step: '1', title: 'Add your brands', desc: 'Go to Brands → Add Brand. Include keywords to auto-match holidays.' },
            { step: '2', title: 'Connect Google Calendar', desc: 'Get OAuth Client ID from Google Cloud Console and paste above.' },
            { step: '3', title: 'Enable notifications', desc: 'Turn on browser notifications to get reminders before events.' },
            { step: '4', title: 'Fetch holidays', desc: 'Click "Fetch Holidays" on Dashboard to auto-import holidays from nationaltoday.com.' },
            { step: '5', title: 'Push to calendar', desc: 'Review events and push them to Google Calendar with one click.' },
          ].map(({ step, title, desc }) => (
            <div key={step} style={{ display: 'flex', gap: 14 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--gold-dim)', border: '1px solid var(--gold-glow)',
                color: 'var(--gold)', fontFamily: 'var(--font-head)', fontWeight: 800,
                fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                {step}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
