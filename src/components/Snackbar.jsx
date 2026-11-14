import { useEffect } from 'react'
import { X } from 'lucide-react'

const PALETTES = {
  error: { border: 'rgba(255,64,64,0.45)', background: 'rgba(255,64,64,0.14)', color: '#ff8a8a' },
  success: { border: 'rgba(32,217,107,0.45)', background: 'rgba(32,217,107,0.14)', color: '#20d96b' },
  warning: { border: 'rgba(255,185,0,0.45)', background: 'rgba(255,185,0,0.14)', color: '#ffcf66' },
  info: { border: 'rgba(95,116,255,0.5)', background: 'rgba(95,116,255,0.16)', color: '#9eb0ff' },
}

/**
 * Lightweight snackbar/toast shown in the top-right corner.
 * Auto-dismisses after `duration` ms (default 3.5s).
 *
 * props:
 *  - message: string | null  (null hides the snackbar)
 *  - type: 'error' | 'success' | 'warning' | 'info'
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

  const palette = PALETTES[type] || PALETTES.info

  return (
    <div
      role="status"
      aria-live="polite"
      className="snackbar snackbar-enter"
      style={{
        position: 'fixed', right: '18px', top: '18px', zIndex: 2000,
        display: 'flex', alignItems: 'center', gap: '10px',
        maxWidth: '360px', padding: '10px 12px', borderRadius: '5px',
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
