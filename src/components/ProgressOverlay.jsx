import { CheckCircle, Circle, Loader, AlertCircle } from 'lucide-react'

// Each step: { id, label, status: 'waiting' | 'active' | 'done' | 'error', detail }
export default function ProgressOverlay({ steps, title, onDone, visible }) {
  if (!visible) return null

  const allDone = steps.every(s => s.status === 'done' || s.status === 'error')
  const hasError = steps.some(s => s.status === 'error')

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(7,7,15,0.82)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: 20,
      animation: 'fadeIn 0.15s ease',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border-light)',
        borderRadius: 16, padding: '32px 28px', width: '100%', maxWidth: 400,
        animation: 'slideUp 0.2s ease',
      }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 18, marginBottom: 24 }}>
          {title}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1
            return (
              <div key={step.id}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  {/* Icon */}
                  <div style={{ flexShrink: 0, width: 22, display: 'flex', justifyContent: 'center', paddingTop: 1 }}>
                    {step.status === 'done' && <CheckCircle size={20} style={{ color: 'var(--green)' }} />}
                    {step.status === 'active' && (
                      <Loader size={20} style={{ color: 'var(--gold)', animation: 'spin 0.8s linear infinite' }} />
                    )}
                    {step.status === 'waiting' && <Circle size={20} style={{ color: 'var(--border-light)' }} />}
                    {step.status === 'error' && <AlertCircle size={20} style={{ color: 'var(--red)' }} />}
                  </div>

                  {/* Label + detail */}
                  <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
                    <div style={{
                      fontSize: 14, fontWeight: step.status === 'active' ? 700 : 500,
                      color: step.status === 'waiting' ? 'var(--muted)' : step.status === 'error' ? 'var(--red)' : 'var(--text)',
                      transition: 'color 0.2s',
                    }}>
                      {step.label}
                    </div>
                    {step.detail && (
                      <div style={{ fontSize: 12, color: step.status === 'error' ? 'var(--red)' : 'var(--muted)', marginTop: 3, lineHeight: 1.4 }}>
                        {step.detail}
                      </div>
                    )}
                    {/* Animated bar for active step */}
                    {step.status === 'active' && (
                      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', background: 'var(--gold)', borderRadius: 2,
                          animation: 'progressPulse 1.5s ease-in-out infinite',
                          width: '60%',
                        }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Connector line between steps */}
                {!isLast && (
                  <div style={{
                    width: 2, height: 16, marginLeft: 10,
                    background: step.status === 'done' ? 'var(--green)' : 'var(--border)',
                    transition: 'background 0.3s',
                    borderRadius: 1,
                  }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Done state */}
        {allDone && (
          <div style={{ marginTop: 24 }}>
            <div style={{
              background: hasError ? 'rgba(232,64,85,0.1)' : 'rgba(32,192,122,0.1)',
              border: `1px solid ${hasError ? 'rgba(232,64,85,0.3)' : 'rgba(32,192,122,0.3)'}`,
              borderRadius: 10, padding: '12px 16px', marginBottom: 16,
              fontSize: 13, color: hasError ? 'var(--red)' : 'var(--green)', fontWeight: 600,
            }}>
              {hasError ? '⚠ Some steps had issues — check your settings' : '✓ All done! Your schedule has been updated.'}
            </div>
            <button className="btn btn-primary" onClick={onDone} style={{ width: '100%', justifyContent: 'center' }}>
              View Brand Schedule →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
