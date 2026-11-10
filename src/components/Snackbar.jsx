import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Lightweight snackbar/toast shown in the bottom-right corner.
 * Auto-dismisses after `duration` ms (default 3.5s).
 *
 * props:
 *  - message: string | null  (null hides the snackbar)
 *  - type: 'error' | 'success'
 *  - onClose(): called when dismissed or after the timeout
 *  - duration: ms before auto-dismiss
 */
export default function Snackbar({ message, type = 'error', onClose, duration = 3500 }) {
  useEffect(() => {
    if (!message) return undefined
    const timer = setTimeout(() => onClose?.(), duration)
    return () => clearTimeout(timer)
  }, [message, duration, onClose])

  if (!message) return null

  const palette = type === 'success'
    ? { border: 'rgba(32,217,107,0.45)', background: 'rgba(32,217,107,0.12)', color: '#20d96b' }
    : { border: 'rgba(255,64,64,0.45)', background: 'rgba(255,64,64,0.12)', color: '#ff8a8a' }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', right: '18px', bottom: '18px', zIndex: 2000,
        display: 'flex', alignItems: 'center', gap: '10px',
        maxWidth: '340px', padding: '10px 12px', borderRadius: '5px',
        border: `1px solid ${palette.border}`, background: palette.background,
        color: palette.color, fontSize: '11.5px', fontWeight: 600,
        boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <span style={{ flex: 1, lineHeight: 1.4 }}>{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        style={{
          background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer',
          display: 'inline-flex', padding: '2px', opacity: 0.8,
        }}
      >
        <X size={12} />
      </button>
    </div>
  )
}
