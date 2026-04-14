import { useState } from 'react'
import { ClipboardPaste, X, Check, AlertCircle } from 'lucide-react'

const MONTH_NAMES = [
  'january','february','march','april','may','june',
  'july','august','september','october','november','december'
]
const MONTH_DISPLAY = [
  '','January','February','March','April','May','June',
  'July','August','September','October','November','December'
]
const MONTH_SHORT = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function detectMonth(text) {
  const lower = text.toLowerCase()
  // Try every month name — first one found wins
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (lower.includes(MONTH_NAMES[i])) return i + 1
  }
  return null
}

function parseHolidays(rawText, month) {
  const holidays = []
  const seen = new Set()

  // Split into raw lines (keep tabs intact for now)
  const rawLines = rawText.split('\n')
  const monthShort = MONTH_SHORT[month]

  // Date line pattern: "Apr 1", "Apr 1 Wednesday", "Apr 30 Thursday" etc.
  const dateLine = new RegExp(`^\\s*${monthShort}\\w*\\.?\\s+(\\d{1,2})`, 'i')
  // Also match full month name: "April 1"
  const dateLineFull = new RegExp(`^\\s*${MONTH_NAMES[month-1]}\\s+(\\d{1,2})`, 'i')

  let currentDay = null

  for (const rawLine of rawLines) {
    // Split on tabs — nationaltoday table copies as:
    // Date row:    "Apr 1 Wednesday\t\t\t"
    // Holiday row: "\tHoliday Title\tCategory\tTag1, Tag2"
    const cols = rawLine.split('\t').map(c => c.trim())
    const firstCol = cols[0]

    // Check if this is a date row
    const dm = firstCol.match(dateLine) || firstCol.match(dateLineFull)
    if (dm) {
      currentDay = parseInt(dm[1])
      continue
    }

    if (!currentDay) continue

    // Holiday rows: first col is empty, title is in second col
    // OR: first col IS the title (some copy formats)
    let title = ''
    let category = ''
    let tags = ''

    if (cols.length >= 2 && firstCol === '' && cols[1]) {
      // Standard table copy: empty first col, title in second
      title = cols[1]
      category = cols[2] || ''
      tags = cols[3] || ''
    } else if (cols.length === 1 && firstCol) {
      // Single-column copy — whole line is the title
      title = firstCol
    } else if (cols.length >= 2 && firstCol) {
      // First col has title, rest are category/tags
      title = firstCol
      category = cols[1] || ''
      tags = cols[2] || ''
    }

    if (!title) continue

    // Clean up title
    title = title.replace(/\s+/g, ' ').trim()

    // Skip non-holiday lines
    if (title.length < 4 || title.length > 80) continue
    if (!/^[A-Z]/.test(title)) continue
    if (/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)/.test(title)) continue
    if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/.test(title)) continue
    if (/^(Share|Tweet|Pin|Menu|Search|Today|National Today|Holiday|Date|Category|Tags)$/.test(title)) continue
    if (/^https?:\/\//.test(title)) continue

    const mmdd = `${String(month).padStart(2,'0')}-${String(currentDay).padStart(2,'0')}`
    const key = `${mmdd}|${title.toLowerCase()}`

    if (!seen.has(key)) {
      seen.add(key)
      holidays.push({
        id: `h_${mmdd}_${title.replace(/\W+/g,'_')}`,
        title,
        date: mmdd,
        category: category.replace(/\s+/g,' ').trim(),
        tags: tags.toLowerCase().replace(/\s+/g,' ').trim(),
        description: title,
        url: `https://nationaltoday.com/${title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}/`,
      })
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
    const month = detectMonth(text)
    if (!month) {
      setError('Could not detect month. Make sure you copied from nationaltoday.com/[month]-holidays/')
      return
    }
    const all = parseHolidays(text, month)
    const fresh = all.filter(h => !existingIds?.has(h.id))
    setPreview({ holidays: fresh, allCount: all.length, month })
    setStep('preview')
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display:'flex', alignItems:'center', gap:10 }}>
            <ClipboardPaste size={20} style={{ color:'var(--gold)' }} />
            Import from nationaltoday.com
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18}/></button>
        </div>

        {step === 'paste' && (<>
          <div style={{
            background:'var(--gold-dim)', border:'1px solid var(--gold-glow)',
            borderRadius:'var(--radius-sm)', padding:'14px 16px', marginBottom:20
          }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>3-step import:</div>
            {[
              <><strong style={{color:'var(--gold)'}}>Open</strong> nationaltoday.com/april-holidays/ (or any month)</>,
              <><strong style={{color:'var(--gold)'}}>Ctrl+A</strong> to select all, then <strong style={{color:'var(--gold)'}}>Ctrl+C</strong> to copy</>,
              <>Click the box below, press <strong style={{color:'var(--gold)'}}>Ctrl+V</strong>, then click Parse</>,
            ].map((s,i) => (
              <div key={i} style={{ display:'flex', gap:10, fontSize:12, color:'var(--muted-light)', marginBottom:6, alignItems:'flex-start' }}>
                <span style={{ width:20,height:20,borderRadius:'50%',background:'var(--gold)',color:'#07070F',fontWeight:800,fontSize:10,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center' }}>{i+1}</span>
                <span>{s}</span>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background:'rgba(232,64,85,0.1)',border:'1px solid rgba(232,64,85,0.3)',borderRadius:'var(--radius-sm)',padding:'12px 14px',marginBottom:16,display:'flex',gap:10,fontSize:13 }}>
              <AlertCircle size={16} style={{ color:'var(--red)',flexShrink:0,marginTop:1 }} />
              {error}
            </div>
          )}

          <div className="form-group">
            <label>Paste page content here</label>
            <textarea
              value={text}
              onChange={e => { setText(e.target.value); setError('') }}
              placeholder="Paste here (Ctrl+V)..."
              style={{ minHeight:220, fontFamily:'monospace', fontSize:12 }}
              autoFocus
            />
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>
              {text.length > 0
                ? `${text.length.toLocaleString()} characters — ${text.split('\n').length} lines pasted ✓`
                : 'Nothing pasted yet'
              }
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleParse} disabled={text.trim().length < 100}>
              <ClipboardPaste size={14}/> Parse Holidays
            </button>
          </div>
        </>)}

        {step === 'preview' && preview && (<>
          <div style={{
            background: preview.holidays.length > 0 ? 'rgba(32,192,122,0.1)' : 'rgba(232,64,85,0.1)',
            border: `1px solid ${preview.holidays.length > 0 ? 'rgba(32,192,122,0.3)' : 'rgba(232,64,85,0.3)'}`,
            borderRadius:'var(--radius-sm)', padding:'14px 16px', marginBottom:16,
            display:'flex', gap:12, alignItems:'flex-start',
          }}>
            {preview.holidays.length > 0
              ? <Check size={20} style={{ color:'var(--green)', flexShrink:0 }}/>
              : <AlertCircle size={20} style={{ color:'var(--red)', flexShrink:0 }}/>
            }
            <div>
              <div style={{ fontWeight:700, fontSize:14 }}>
                {preview.holidays.length > 0
                  ? `${preview.holidays.length} new holidays ready to import`
                  : 'No new holidays found'
                }
              </div>
              <div style={{ fontSize:12, color:'var(--muted-light)', marginTop:3 }}>
                Month detected: <strong style={{ color:'var(--text)' }}>{MONTH_DISPLAY[preview.month]}</strong>
                {' · '}{preview.allCount} parsed total
                {preview.allCount > preview.holidays.length && ` · ${preview.allCount - preview.holidays.length} already in your database`}
              </div>
            </div>
          </div>

          {preview.holidays.length > 0 && (
            <div style={{ maxHeight:300, overflowY:'auto', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', marginBottom:16 }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--muted)', background:'var(--surface)', whiteSpace:'nowrap' }}>Date</th>
                    <th style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--muted)', background:'var(--surface)' }}>Holiday</th>
                    <th style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--muted)', background:'var(--surface)' }}>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.holidays.map(h => (
                    <tr key={h.id} style={{ borderTop:'1px solid var(--border)' }}>
                      <td style={{ padding:'8px 12px', fontSize:12, color:'var(--gold)', fontFamily:'var(--font-head)', fontWeight:700, background:'var(--card)', whiteSpace:'nowrap' }}>
                        {MONTH_DISPLAY[preview.month].slice(0,3)} {h.date.split('-')[1]}
                      </td>
                      <td style={{ padding:'8px 12px', fontSize:13, background:'var(--card)' }}>{h.title}</td>
                      <td style={{ padding:'8px 12px', fontSize:11, color:'var(--muted)', background:'var(--card)' }}>{h.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => { setStep('paste'); setPreview(null) }}>← Back</button>
            {preview.holidays.length > 0 && (
              <button className="btn btn-primary" onClick={() => onImport(preview.holidays)}>
                <Check size={14}/> Import {preview.holidays.length} holidays
              </button>
            )}
          </div>
        </>)}
      </div>
    </div>
  )
}
