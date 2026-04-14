import { useState } from 'react'
import { Bell, Calendar, Trash2, Download, Sparkles, ExternalLink, Check } from 'lucide-react'
import { connectGoogleCalendar, getStoredToken } from '../utils/googleCalendar'
import { saveNow } from '../utils/cloudSync'
import { requestNotificationPermission, showToast } from '../utils/notifications'
import { testGeminiKey } from '../utils/aiMatching'

export default function Settings({ settings, setSettings, events, brands }) {
  const [clientId, setClientId] = useState(settings.googleClientId || '')
  const [geminiKey, setGeminiKey] = useState(settings.geminiApiKey || '')
  const [testingKey, setTestingKey] = useState(false)

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
    } else {
      const granted = await requestNotificationPermission()
      if (granted) {
        setSettings(s => ({ ...s, notificationsEnabled: true }))
        showToast('Notifications enabled ✓', 'You will be reminded before events', 'success')
        setTimeout(() => new Notification('BrandTrack', { body: 'Notifications are working!' }), 1000)
      } else {
        showToast('Permission denied', 'Allow notifications in browser settings', 'error')
      }
    }
  }

  const handleSaveGemini = async () => {
    if (!geminiKey.trim()) return
    setTestingKey(true)
    try {
      const { model } = await testGeminiKey(geminiKey.trim())
      setSettings(s => ({ ...s, geminiApiKey: geminiKey.trim(), geminiModel: model }))
      showToast(`Gemini Connected ✓`, `Using model: ${model}`, 'success')
    } catch (err) {
      showToast('Connection Failed', err.message, 'error')
    } finally {
      setTestingKey(false)
    }
  }

  const handleExport = () => {
    const data = { brands, events, exported: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `brandtrack-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const isGCalConnected = settings.googleCalendarConnected && settings.googleToken
  const isGeminiConnected = !!settings.geminiApiKey

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure AI matching, integrations, and preferences</p>
        </div>
      </div>

      {/* ── AI MATCHING ──────────────────────────────────────── */}
      <div className="settings-section">
        <div className="settings-section-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={16} style={{ color: '#7B5FF5' }} />
          AI-Powered Brand Matching
          <span className="badge badge-violet" style={{ marginLeft: 4, fontSize: 10 }}>FREE</span>
        </div>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            background: 'rgba(123,95,245,0.08)', border: '1px solid rgba(123,95,245,0.2)',
            borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 16,
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
              🤖 Use Google Gemini AI — 100% Free
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted-light)', lineHeight: 1.6 }}>
              Gemini's free tier gives you 1,500 AI requests per day — far more than you'll ever need.
              It reads every holiday from nationaltoday.com and intelligently decides which brands
              it suits, so nothing gets missed (like Malbec World Day for Oak Creek).
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginTop: 10, color: '#7B5FF5', fontSize: 12, fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Get your free key at aistudio.google.com <ExternalLink size={11} />
            </a>
          </div>

          {!isGeminiConnected ? (
            <div>
              <label>Gemini API Key</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  type="password"
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleSaveGemini}
                  disabled={!geminiKey.trim() || testingKey}
                >
                  {testingKey ? <span className="loading-spinner" /> : <Check size={14} />}
                  {testingKey ? 'Testing...' : 'Connect'}
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                Steps: Go to aistudio.google.com → Sign in with Google → Click "Get API Key" → Create key → Paste here
              </div>
            </div>
          ) : (
            <div className="settings-row" style={{ padding: 0 }}>
              <div>
                <div style={{ fontWeight: 600 }}>Gemini AI</div>
                <div style={{ fontSize: 12, color: 'var(--green)' }}>
                  ✓ Connected — {settings.geminiModel || 'auto-detected model'}
                </div>
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => { setSettings(s => ({ ...s, geminiApiKey: '' })); setGeminiKey('') }}
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', fontSize: 12, color: 'var(--muted)' }}>
          Without Gemini key: uses smart keyword matching (good). With key: uses AI (better — catches everything).
        </div>
      </div>

      {/* ── GOOGLE CALENDAR ──────────────────────────────────── */}
      <div className="settings-section">
        <div className="settings-section-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Calendar size={16} style={{ color: 'var(--gold)' }} />
          Google Calendar
        </div>
        {!isGCalConnected ? (
          <div style={{ padding: '16px 20px' }}>
            <div className="form-group">
              <label>Google OAuth Client ID</label>
              <input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="xxxxxxxx.apps.googleusercontent.com" />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, lineHeight: 1.6 }}>
                Get from <strong style={{ color: 'var(--gold)' }}>console.cloud.google.com</strong> → APIs & Services → Credentials → OAuth 2.0 Client IDs
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleGoogleConnect} disabled={!clientId.trim()}>
              <Calendar size={14} /> Connect Google Calendar
            </button>
          </div>
        ) : (
          <div className="settings-row">
            <div>
              <div>Google Calendar</div>
              <div style={{ fontSize: 12, color: 'var(--green)' }}>✓ Connected</div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={handleDisconnect}>Disconnect</button>
          </div>
        )}
      </div>

      {/* ── NOTIFICATIONS ──────────────────────────────────── */}
      <div className="settings-section">
        <div className="settings-section-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={16} style={{ color: 'var(--violet)' }} />
          Browser Notifications
        </div>
        <div className="settings-row">
          <div>
            <div>Reminders</div>
            <div className="settings-row-desc">Notify before events are due</div>
          </div>
          <button className={`toggle ${settings.notificationsEnabled ? 'on' : ''}`} onClick={handleNotifications} />
        </div>
      </div>

      {/* ── DATA ──────────────────────────────────────────── */}
      <div className="settings-section">
        <div className="settings-section-header">Data</div>


        {/* Font size */}
        <div className="settings-row">
          <div>
            <div>Font Size</div>
            <div className="settings-row-desc">Adjust text size across the dashboard</div>
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            {[
              { label:'S', value:'sm' },
              { label:'M', value:'md' },
              { label:'L', value:'lg' },
              { label:'XL', value:'xl' },
            ].map(({ label, value }) => {
              const active = (settings.fontSize || 'md') === value
              return (
                <button key={value} onClick={() => setSettings(s => ({ ...s, fontSize: value }))}
                  style={{
                    width:36, height:36, borderRadius:'var(--radius-sm)',
                    border:`1px solid ${active ? 'var(--gold)' : 'var(--border-light)'}`,
                    background: active ? 'var(--gold-dim)' : 'transparent',
                    color: active ? 'var(--gold)' : 'var(--muted-light)',
                    fontFamily:'var(--font-body)', fontWeight: active ? 700 : 400,
                    fontSize: 12, cursor:'pointer', transition:'all 0.15s ease',
                  }}
                >{label}</button>
              )
            })}
          </div>
        </div>

        <div className="settings-row">
          <div>
            <div>Export</div>
            <div className="settings-row-desc">Download all brands and events as JSON</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <Download size={13} /> Export
          </button>
        </div>
        <div className="settings-row">
          <div>
            <div>Clear All Events</div>
            <div className="settings-row-desc">Remove all events and re-fetch fresh</div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => {
            if (confirm('Clear all events and start fresh?')) {
              // Clear localStorage
              localStorage.removeItem('events')
              localStorage.removeItem('relevanceOverrides')
              // Clear cloud too so it doesn't restore on reload
              const currentBrands = JSON.parse(localStorage.getItem('brands') || '[]')
              saveNow(currentBrands, [], {}).then(() => window.location.reload())
            }
          }}>
            <Trash2 size={13} /> Clear
          </button>
        </div>
      </div>

      {/* ── SETUP GUIDE ──────────────────────────────────── */}
      <div className="settings-section">
        <div className="settings-section-header">🚀 Quick Setup</div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { step: '1', title: 'Get free Gemini key', desc: 'Visit aistudio.google.com → sign in → Get API Key → paste above. Takes 2 minutes.' },
            { step: '2', title: 'Fetch Holidays', desc: 'Dashboard → Fetch Holidays. The app reads nationaltoday.com and AI matches everything.' },
            { step: '3', title: 'View Brand Schedule', desc: 'See all holidays mapped to each brand in the spreadsheet-style grid.' },
            { step: '4', title: 'Push to Calendar', desc: 'Select events and push to Google Calendar with automatic reminders.' },
          ].map(({ step, title, desc }) => (
            <div key={step} style={{ display: 'flex', gap: 14 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: 'var(--gold-dim)', border: '1px solid var(--gold-glow)',
                color: 'var(--gold)', fontFamily: 'var(--font-head)', fontWeight: 800,
                fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{step}</div>
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
