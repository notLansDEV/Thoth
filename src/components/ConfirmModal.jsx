export default function ConfirmModal({ title, message, note, confirmLabel = 'Delete', busy, onConfirm, onCancel }) {
  return (
    <div onClick={onCancel} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1200,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#151515', border: '1px solid #292929', borderRadius: '6px',
        padding: '22px', width: '100%', maxWidth: '380px',
        boxShadow: '0 20px 25px rgba(0,0,0,0.3)',
      }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 700 }}>{title}</h2>
        {message && (
          <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#bbb', lineHeight: 1.5 }}>{message}</p>
        )}
        {note && (
          <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#e8c547' }}>{note}</p>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '18px' }}>
          <button className="btn" onClick={onCancel} disabled={busy} style={{ cursor: 'pointer' }}>No</button>
          <button className="btn primary" onClick={onConfirm} disabled={busy} style={{ cursor: 'pointer', background: '#ff4040' }}>
            {busy ? 'Working…' : `Yes, ${confirmLabel}`}
          </button>
        </div>
      </div>
    </div>
  )
}
