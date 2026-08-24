import { useEffect } from 'react'
import { priorityStyle } from '../../tasks/tasks.service.js'

const labelStyle = {
  marginBottom: '4px',
  fontSize: '10px',
  fontWeight: '700',
  color: '#777',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

function Section({ label, value }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: '12px', color: value ? '#ccc' : '#555', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
        {value || '—'}
      </div>
    </div>
  )
}

export default function BugPreviewModal({ bug, projectName, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const stageName = bug.kanban_column || bug.status || 'New'

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.65)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#151515', border: '1px solid #292929', borderRadius: '6px',
        padding: '20px', width: '100%', maxWidth: '560px', maxHeight: '86vh', overflowY: 'auto',
        boxShadow: '0 20px 25px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '14px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {bug.bug_id && (
                <span style={{
                  fontFamily: 'monospace', fontSize: '10px', fontWeight: 700,
                  color: '#ff6b6b', background: 'rgba(255,64,64,0.08)',
                  border: '1px solid rgba(255,64,64,0.3)', borderRadius: '3px',
                  padding: '2px 6px',
                }}>{bug.bug_id}</span>
              )}
              <span className="badge" style={{ ...priorityStyle(bug.priority), background: 'transparent', fontSize: '9px' }}>
                {bug.priority || 'medium'}
              </span>
              <span className="badge paused" style={{ fontSize: '9px' }}>{stageName}</span>
            </div>
            <h2 style={{ margin: '8px 0 0', fontSize: '15px', fontWeight: 700, color: '#f1f1f1', lineHeight: 1.35 }}>
              {bug.title}
            </h2>
          </div>
          <button className="icon-btn" title="Close" onClick={onClose}>✕</button>
        </div>

        {/* Meta row */}
        <div style={{
          display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center',
          padding: '9px 11px', borderRadius: '4px', background: '#101010',
          border: '1px solid #232323', marginBottom: '16px', fontSize: '10.5px', color: '#777',
        }}>
          {projectName && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span className="dot" style={{ width: 7, height: 7 }} />
              {projectName}
            </span>
          )}
          <span>Reported {new Date(bug.created_at).toLocaleDateString()}</span>
          <span>{new Date(bug.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <Section label="Description" value={bug.description} />
        <Section label="Steps to reproduce" value={bug.steps_to_reproduce} />
        <Section label="Expected behavior" value={bug.expected_behavior} />
        <Section label="Actual behavior" value={bug.actual_behavior} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button className="btn primary" onClick={onClose} style={{ cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  )
}
