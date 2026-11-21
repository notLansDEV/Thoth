import { useState } from 'react'

export default function ConfirmModal({ title, message, note, confirmLabel = 'Delete', busy, onConfirm, onCancel, requiredText = '' }) {
  const [confirmText, setConfirmText] = useState('')
  const needsText = String(requiredText || '').trim().length > 0
  const canConfirm = !busy && (!needsText || confirmText.trim().toLowerCase() === String(requiredText).trim().toLowerCase())

  return (
    <div onClick={busy ? undefined : onCancel} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1200,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: '6px',
        padding: '22px', width: '100%', maxWidth: '420px',
        boxShadow: '0 20px 25px rgba(0,0,0,0.3)',
      }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 700 }}>{title}</h2>
        {message && (
          <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--text-soft)', lineHeight: 1.5 }}>{message}</p>
        )}
        {note && (
          <p className="confirm-note" style={{ margin: '0 0 4px', fontSize: '11px', color: '#f59e0b', fontWeight: 600, lineHeight: 1.5 }}>{note}</p>
        )}

        {needsText && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
              Type <strong style={{ color: 'var(--text-strong)' }}>{requiredText}</strong> to confirm.
            </div>
            <input
              className="settings-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={requiredText}
              autoFocus
              disabled={busy}
              style={{ width: '100%' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '18px' }}>
          <button className="btn" onClick={onCancel} disabled={busy} style={{ cursor: 'pointer' }}>No</button>
          <button className="btn primary" onClick={onConfirm} disabled={!canConfirm} style={{ cursor: canConfirm ? 'pointer' : 'not-allowed', background: '#ff4040', opacity: canConfirm ? 1 : 0.6 }}>
            {busy ? 'Working…' : `Yes, ${confirmLabel}`}
          </button>
        </div>
      </div>
    </div>
  )
}
