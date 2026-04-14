import { useState } from 'react'
import { ClipboardPaste, X, Check, AlertCircle } from 'lucide-react'

function parseHolidaysFromText(rawText, year) {
  const holidays = []
  const seen = new Set()

  // Strategy 1: detect month from content
  const MONTHS = ['january','february','march','april','may','june',
                  'july','august','september','october','november','december']
  const MONTH_SHORT = ['','Jan','Feb','Mar','Apr','May','Jun',
                       'Jul','Aug','Sep','Oct','Nov','Dec']

  // Try to detect which month this page is for
  let detectedMonth = null
  const lowerText = rawText.toLowerCase()
  for (let i = 0; i < MONTHS.length; i++) {
    // Look for patterns like "April Holidays" or "april-holidays"
    if (lowerText.includes(`${MONTHS[i]} holidays`) ||
        lowerText.includes(`${MONTHS[i]}-holidays`) ||
        lowerText.includes(`${MONTHS[i]}\nholidays`)) {
      detectedMonth = i + 1
      break
    }
  }

  // Strategy: extract from table text pattern
  // nationaltoday.com table text looks like:
  // "Apr 1 Wednesday\n\nApril Fools' Day\nSpecial Interest\nActivities, Fun"
  // OR when copied as plain text from browser: day headers then holiday names

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)

  let currentDay = null
  let currentMonth = detectedMonth

  // Match date lines like "Apr 1", "Apr 1 Wednesday", "April 1", "April 1, 2026"
  const dateLine = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:\s|,|$)/i
  // Match holiday title lines - capitalized words, not a category/tag
  const categoryWords = new Set([
    'special interest','food & beverage','food and beverage','health','relationships',
    'cause','arts & entertainment','arts and entertainment','cultural','federal',
    'fun','animals','sports','technology','business','finance','seasonal','religious',
    'activities','awareness','educational','historical','civic','christian','catholic',
    'career','books','fashion','environmental','children','appreciation'
  ])

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lower = line.toLowerCase()

    // Check for date line
    const dateMatch = line.match(dateLine)
    if (dateMatch) {
      const monthStr = dateMatch[1].toLowerCase().slice(0, 3)
      const monthIdx = MONTH_SHORT.findIndex(m => m.toLowerCase() === monthStr)
      if (monthIdx > 0) currentMonth = monthIdx
      currentDay = parseInt(dateMatch[2])
      continue
    }

    // Skip obvious non-holiday lines
    if (!currentDay || !currentMonth) continue
    if (lower.length < 3 || lower.length > 80) continue
    if (categoryWords.has(lower)) continue
    if (/^\d+$/.test(line)) continue // pure numbers
    if (/^(sun|mon|tue|wed|thu|fri|sat)/i.test(line)) continue // day names
    if (/share|tweet|pin|follow|subscribe|sign up|log in|search/i.test(lower)) continue
    if (/^(holiday|date|category|tags)$/i.test(lower)) continue // table headers

    // Looks like a holiday title — must start with capital, have 2+ words or be a known pattern
    const isHolidayTitle = (
      /^[A-Z]/.test(line) &&
      (line.includes(' ') || line.includes("'")) &&
      !/^https?:\/\//.test(line) &&
      !line.includes('@') &&
      !/^\d{4}/.test(line)
    )

    if (isHolidayTitle) {
      const dateStr = `${year}-${String(currentMonth).padStart(2,'0')}-${String(currentDay).padStart(2,'0')}`
      const key = dateStr + '|' + lower
      if (!seen.has(key)) {
        seen.add(key)
        // Try to pick up category from next line
        const nextLine = lines[i + 1] || ''
        const category = categoryWords.has(nextLine.toLowerCase()) ? nextLine : ''
        holidays.push({
          id: `h_${dateStr}_${line.replace(/\W+/g,'_')}`,
          title: line,
          date: dateStr,
          category,
          tags: category.toLowerCase(),
          description: line,
          url: `https://nationaltoday.com/${line.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}/`,
        })
      }
    }
  }

  // Sort by date
  holidays.sort((a, b) => a.date.localeCompare(b.date))
  return { holidays, detectedMonth, year }
}

export default function PasteImportModal({ onClose, onImport, existingEventIds }) {
  const [text, setText] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [preview, setPreview] = useState(null)
  const [step, setStep] = useState('paste') // paste | preview

  const handleParse = () => {
    if (!text.trim()) return
    const result = parseHolidaysFromText(text, year)
    // Filter already imported
    result.holidays = result.holidays.filter(h => !existingEventIds.has(h.id))
    setPreview(result)
    setStep('preview')
  }

  const handleConfirm = () => {
    onImport(preview.holidays)
    onClose()
  }

  const MONTHS = ['January','February','March','April','May','June',
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
            {/* Instructions */}
            <div style={{
              background: 'var(--gold-dim)', border: '1px solid var(--gold-glow)',
              borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 20,
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                How to import (30 seconds):
              </div>
              {[
                'Go to nationaltoday.com/april-holidays/ (or any month)',
                'Press Ctrl+A (select all) then Ctrl+C (copy)',
                'Click in the box below and press Ctrl+V (paste)',
                'Click Parse — holidays are extracted automatically',
              ].map((s, i) => (
                <div key={i} style={{ display:'flex', gap: 10, fontSize: 12, color: 'var(--muted-light)', marginBottom: 4 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%', background: 'var(--gold)',
                    color: '#07070F', fontWeight: 800, fontSize: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>{i+1}</span>
                  {s}
                </div>
              ))}
            </div>

            <div className="form-row" style={{ marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Year</label>
                <select value={year} onChange={e => setYear(parseInt(e.target.value))}>
                  {[2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Tip</label>
                <div style={{ fontSize: 12, color: 'var(--muted)', paddingTop: 10 }}>
                  Month is auto-detected from the page content
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Paste page content here</label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste the copied text from nationaltoday.com here..."
                style={{ minHeight: 200, fontFamily: 'monospace', fontSize: 12 }}
                autoFocus
              />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                {text.length > 0 ? `${text.length.toLocaleString()} characters pasted` : 'Nothing pasted yet'}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleParse}
                disabled={text.trim().length < 100}
              >
                <ClipboardPaste size={14} /> Parse Holidays
              </button>
            </div>
          </>
        )}

        {step === 'preview' && preview && (
          <>
            {/* Result summary */}
            <div style={{
              background: preview.holidays.length > 0 ? 'rgba(32,192,122,0.1)' : 'rgba(232,64,85,0.1)',
              border: `1px solid ${preview.holidays.length > 0 ? 'rgba(32,192,122,0.3)' : 'rgba(232,64,85,0.3)'}`,
              borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              {preview.holidays.length > 0
                ? <Check size={20} style={{ color: 'var(--green)', flexShrink: 0 }} />
                : <AlertCircle size={20} style={{ color: 'var(--red)', flexShrink: 0 }} />
              }
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {preview.holidays.length > 0
                    ? `${preview.holidays.length} new holidays found`
                    : 'No new holidays found'
                  }
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted-light)', marginTop: 2 }}>
                  {preview.detectedMonth
                    ? `Detected: ${MONTHS[preview.detectedMonth - 1]} ${preview.year}`
                    : 'Could not detect month — check you pasted from the right page'
                  }
                  {preview.holidays.length === 0 && ' · Already imported or text not recognised'}
                </div>
              </div>
            </div>

            {preview.holidays.length > 0 && (
              <div style={{
                maxHeight: 300, overflowY: 'auto',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                marginBottom: 16,
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: 'var(--muted)', background: 'var(--surface)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Date</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: 'var(--muted)', background: 'var(--surface)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Holiday</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.holidays.map(h => (
                      <tr key={h.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', background: 'var(--card)' }}>
                          {h.date}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 500, background: 'var(--card)' }}>
                          {h.title}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setStep('paste')}>
                ← Back
              </button>
              {preview.holidays.length > 0 && (
                <button className="btn btn-primary" onClick={handleConfirm}>
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
