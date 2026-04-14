import { useState } from 'react'
import { ClipboardPaste, X, Check, AlertCircle } from 'lucide-react'

const MONTH_NAMES = [
  'january','february','march','april','may','june',
  'july','august','september','october','november','december'
]
const MONTH_SHORT = [
  'jan','feb','mar','apr','may','jun',
  'jul','aug','sep','oct','nov','dec'
]

// Detect month from pasted text — tries many patterns
function detectMonth(text) {
  const lower = text.toLowerCase().slice(0, 2000) // only check start

  // Pattern 1: "April Holidays" or "april holidays"
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (lower.includes(`${MONTH_NAMES[i]} holiday`)) return i + 1
  }
  // Pattern 2: URL pattern "april-holidays"
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (lower.includes(`${MONTH_NAMES[i]}-holiday`)) return i + 1
  }
  // Pattern 3: "Holidays in April" 
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (lower.includes(`holidays in ${MONTH_NAMES[i]}`)) return i + 1
  }
  // Pattern 4: Date line like "Apr 1" or "April 1"
  for (let i = 0; i < MONTH_SHORT.length; i++) {
    const re = new RegExp(`\\b${MONTH_SHORT[i]}\\w*\\.?\\s+\\d{1,2}\\b`)
    if (re.test(lower)) return i + 1
  }
  // Pattern 5: Just find any month name in the page title area
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (lower.includes(MONTH_NAMES[i])) return i + 1
  }
  return null
}

// Extract holiday titles from pasted nationaltoday.com text
function parseHolidays(rawText, month) {
  const holidays = []
  const seen = new Set()
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)

  const MONTH_SHORT_PROPER = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthShort = MONTH_SHORT_PROPER[month]

  // Words/phrases that are NOT holiday titles
  const SKIP_PATTERNS = [
    /^(sun|mon|tue|wed|thu|fri|sat)/i,
    /^(january|february|march|april|may|june|july|august|september|october|november|december)$/i,
    /^(special interest|food & beverage|food and beverage|health|relationships|cause|arts|entertainment|cultural|federal|fun|animals|sports|technology|business|finance|seasonal|religious|activities|awareness|educational|historical|civic|christian|catholic|career|books|fashion|environmental|children|appreciation|other models|civic|international)$/i,
    /^(holiday|date|category|tags|share|tweet|pin|search|menu|sign|log in|sign up|subscribe|follow|today|national today|nationaltoday)$/i,
    /^\d+$/,                        // pure numbers
    /^https?:\/\//,                  // URLs
    /^\d{1,2}:\d{2}/,               // times
    /^[<>[\]{}]/,                    // HTML artifacts
    /^(©|®|™)/,                     // copyright
    /^[\W\d]{0,3}$/,                // very short non-word
  ]

  // Track current day from date lines
  let currentDay = null
  const dateLineRe = new RegExp(`^${monthShort}\\w*\\.?\\s+(\\d{1,2})`, 'i')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check if this is a date line e.g. "Apr 1" or "Apr 1 Wednesday"
    const dateMatch = line.match(dateLineRe)
    if (dateMatch) {
      currentDay = parseInt(dateMatch[1])
      continue
    }

    // Also match "April 1" full month name  
    const fullDateMatch = line.match(new RegExp(`^${MONTH_NAMES[month-1]}\\s+(\\d{1,2})`, 'i'))
    if (fullDateMatch) {
      currentDay = parseInt(fullDateMatch[1])
      continue
    }

    // Skip lines matching non-holiday patterns
    if (SKIP_PATTERNS.some(p => p.test(line))) continue

    // Skip very short or very long lines
    if (line.length < 4 || line.length > 80) continue

    // Must start with uppercase (holiday titles do)
    if (!/^[A-Z]/.test(line)) continue

    // Must contain a space or apostrophe (not a single word like "Monday")
    if (!line.includes(' ') && !line.includes("'") && !line.includes('-')) continue

    // Skip lines that look like categories or tags (all lowercase after first char)
    const words = line.split(' ')
    const hasProperNouns = words.some(w => /^[A-Z]/.test(w))
    if (!hasProperNouns) continue

    // If we have a current day, this is likely a holiday
    if (currentDay) {
      const mmdd = `${String(month).padStart(2,'0')}-${String(currentDay).padStart(2,'0')}`
      const key = `${mmdd}|${line.toLowerCase()}`
      if (!seen.has(key)) {
        seen.add(key)
        holidays.push({
          id: `h_${mmdd}_${line.replace(/\W+/g,'_')}`,
          title: line,
          date: mmdd, // stored as MM-DD — year-agnostic
          category: '',
          tags: '',
          description: line,
          url: `https://nationaltoday.com/${line.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}/`,
        })
      }
    }
  }

  return holidays.sort((a, b) => a.date.localeCompare(b.date))
}

export default function PasteImportModal({ onClose, onImport, existingIds }) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState(null)
  const [step, setStep] = useState('paste')
  const [error, setError] = useState('')

  const handleParse = () => {
    setError('')
    if (!text.trim()) return

    const month = detectMonth(text)
    if (!month) {
      setError('Could not detect which month this is. Make sure you copied from a nationaltoday.com/[month]-holidays/ page.')
      return
    }

    const allHolidays = parseHolidays(text, month)
    const newHolidays = allHolidays.filter(h => !existingIds.has(h.id))

    setPreview({ holidays: newHolidays, allCount: allHolidays.length, month })
    setStep('preview')
  }

  const MONTH_DISPLAY = ['','January','February','March','April','May','June',
                          'July','August','September','October','November','December']

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display:'flex', alignItems:'center', gap: 10 }}>
            <ClipboardPaste size={20} style={{ color: 'var(--gold)' }} />
            Import from nationaltoday.com
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {step === 'paste' && (
          <>
            <div style={{
              background: 'var(--gold-dim)', border: '1px solid var(--gold-glow)',
              borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 20,
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
                3-step import:
              </div>
              {[
                <>Go to <strong style={{color:'var(--gold)'}}>nationaltoday.com/april-holidays/</strong> (any month)</>,
                <>Press <strong style={{color:'var(--gold)'}}>Ctrl+A</strong> then <strong style={{color:'var(--gold)'}}>Ctrl+C</strong> to copy the whole page</>,
                <>Click below, press <strong style={{color:'var(--gold)'}}>Ctrl+V</strong> to paste, then click Parse</>,
              ].map((s, i) => (
                <div key={i} style={{ display:'flex', gap: 10, fontSize: 12, color: 'var(--muted-light)', marginBottom: 6, alignItems: 'flex-start' }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', background: 'var(--gold)',
                    color: '#07070F', fontWeight: 800, fontSize: 10, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{i+1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>

            {error && (
              <div style={{
                background: 'rgba(232,64,85,0.1)', border: '1px solid rgba(232,64,85,0.3)',
                borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 16,
                display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13,
              }}>
                <AlertCircle size={16} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}

            <div className="form-group">
              <label>Paste page content here</label>
              <textarea
                value={text}
                onChange={e => { setText(e.target.value); setError('') }}
                placeholder="Paste the copied text from nationaltoday.com here (Ctrl+V)..."
                style={{ minHeight: 220, fontFamily: 'monospace', fontSize: 12 }}
                autoFocus
              />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                {text.length > 0
                  ? `${text.length.toLocaleString()} characters — ${text.split('\n').length} lines`
                  : 'Nothing pasted yet — use Ctrl+A on the nationaltoday page then Ctrl+C, then Ctrl+V here'
                }
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleParse} disabled={text.trim().length < 200}>
                <ClipboardPaste size={14} /> Parse Holidays
              </button>
            </div>
          </>
        )}

        {step === 'preview' && preview && (
          <>
            <div style={{
              background: preview.holidays.length > 0 ? 'rgba(32,192,122,0.1)' : 'rgba(232,64,85,0.1)',
              border: `1px solid ${preview.holidays.length > 0 ? 'rgba(32,192,122,0.3)' : 'rgba(232,64,85,0.3)'}`,
              borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 16,
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              {preview.holidays.length > 0
                ? <Check size={20} style={{ color: 'var(--green)', flexShrink: 0 }} />
                : <AlertCircle size={20} style={{ color: 'var(--red)', flexShrink: 0 }} />
              }
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {preview.holidays.length > 0
                    ? `${preview.holidays.length} new holidays ready to import`
                    : 'No new holidays to import'
                  }
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted-light)', marginTop: 3 }}>
                  Detected month: <strong style={{ color: 'var(--text)' }}>{MONTH_DISPLAY[preview.month]}</strong>
                  {' · '}{preview.allCount} total parsed
                  {preview.allCount > preview.holidays.length && ` · ${preview.allCount - preview.holidays.length} already in database`}
                </div>
              </div>
            </div>

            {preview.holidays.length > 0 && (
              <div style={{
                maxHeight: 280, overflowY: 'auto',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                marginBottom: 16,
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', background: 'var(--surface)', whiteSpace: 'nowrap' }}>Day</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', background: 'var(--surface)' }}>Holiday</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.holidays.map(h => (
                      <tr key={h.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--gold)', fontFamily: 'var(--font-head)', fontWeight: 700, background: 'var(--card)', whiteSpace: 'nowrap' }}>
                          {MONTH_DISPLAY[preview.month].slice(0,3)} {h.date.split('-')[1]}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: 13, background: 'var(--card)' }}>{h.title}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setStep('paste'); setPreview(null) }}>
                ← Back
              </button>
              {preview.holidays.length > 0 && (
                <button className="btn btn-primary" onClick={() => onImport(preview.holidays)}>
                  <Check size={14} /> Import {preview.holidays.length} holidays
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
