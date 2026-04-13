import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

const ICONS = {
  success: <CheckCircle size={18} style={{ color: 'var(--green)' }} />,
  error: <AlertCircle size={18} style={{ color: 'var(--red)' }} />,
  info: <Info size={18} style={{ color: 'var(--violet)' }} />,
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handler = (e) => {
      const { title, body, type } = e.detail
      const id = Date.now()
      setToasts(prev => [...prev, { id, title, body, type }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
    }
    window.addEventListener('app-toast', handler)
    return () => window.removeEventListener('app-toast', handler)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className="toast">
          <div className="toast-icon">{ICONS[t.type] || ICONS.info}</div>
          <div style={{ flex: 1 }}>
            <div className="toast-title">{t.title}</div>
            {t.body && <div className="toast-body">{t.body}</div>}
          </div>
          <button
            className="btn btn-ghost btn-icon"
            style={{ padding: 4 }}
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
