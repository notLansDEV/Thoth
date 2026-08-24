import { useEffect, useRef, useState } from 'react'
import { priorityStyle } from '../../tasks/tasks.service.js'
import { getBugComments, addBugComment } from '../bugs.service.js'
import { Paperclip, X, Send } from 'lucide-react'

const labelStyle = {
  marginBottom: '4px',
  fontSize: '10px',
  fontWeight: '700',
  color: '#777',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

function Section({ label, value, accent }) {
  const boxStyle = accent === 'green'
    ? { borderColor: 'rgba(32,217,107,0.35)', background: 'rgba(32,217,107,0.05)' }
    : accent === 'red'
      ? { borderColor: 'rgba(255,64,64,0.35)', background: 'rgba(255,64,64,0.05)' }
      : {}
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={labelStyle}>{label}</div>
      <div style={{
        fontSize: '12px', color: value ? '#ccc' : '#555', lineHeight: 1.5, whiteSpace: 'pre-wrap',
        border: `1px solid ${boxStyle.borderColor || '#232323'}`, borderRadius: '4px',
        background: boxStyle.background || 'transparent', padding: value ? '9px 11px' : 0,
      }}>
        {value || '—'}
      </div>
    </div>
  )
}

function currentUser() {
  try {
    const u = JSON.parse(localStorage.getItem('thoth_user') || 'null')
    if (!u) return { id: null, name: 'Unknown' }
    return { id: u.id || null, name: u.full_name || u.username || 'Unknown' }
  } catch {
    return { id: null, name: 'Unknown' }
  }
}

export default function BugPreviewModal({ bug, projectName, onClose }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)
  const me = currentUser()
  const commentsEndRef = useRef(null)

  useEffect(() => {
    let alive = true
    getBugComments(bug.id)
      .then((rows) => { if (alive) setComments(Array.isArray(rows) ? rows : []) })
      .catch(() => {})
    return () => { alive = false }
  }, [bug.id])

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ block: 'nearest' })
  }, [comments.length])

  async function postComment(e) {
    e.preventDefault()
    if (!newComment.trim() || posting) return
    setPosting(true)
    try {
      const created = await addBugComment(bug.id, newComment.trim())
      setComments((cur) => [...cur, created])
      setNewComment('')
    } catch { /* keep text for retry */ }
    setPosting(false)
  }

  const stageName = bug.kanban_column || bug.status || 'New'
  const attachments = bug.attachments || bug.meta?.attachments || []

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.65)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#151515', border: '1px solid #292929', borderRadius: '6px',
        padding: '20px', width: '100%', maxWidth: '580px', maxHeight: '88vh', overflowY: 'auto',
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
          <button className="icon-btn" title="Close" onClick={onClose}><X size={13} /></button>
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
          <span>Reported {new Date(bug.created_at).toLocaleDateString()} · {new Date(bug.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <Section label="Description" value={bug.description} />
        <Section label="Steps to reproduce" value={bug.steps_to_reproduce} />
        <Section label="Expected behavior" value={bug.expected_behavior} accent="green" />
        <Section label="Actual behavior" value={bug.actual_behavior} accent="red" />

        {/* Attachments */}
        {attachments.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={labelStyle}>Attachments</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {attachments.map((f, i) => f.dataUrl && (f.type || '').startsWith('image/') ? (
                <img key={i} src={f.dataUrl} alt={f.name} title={f.name} style={{
                  width: 34, height: 34, objectFit: 'cover', borderRadius: '3px',
                  border: '1px solid #2a2a2a',
                }} />
              ) : (
                <span key={i} title={f.name} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#999',
                  background: '#101010', border: '1px solid #232323', borderRadius: '3px', padding: '4px 7px',
                }}>
                  <Paperclip size={10} /> {f.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div style={{ borderTop: '1px solid #292929', paddingTop: '13px' }}>
          <div style={labelStyle}>Comments ({comments.length})</div>

          {comments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '11px' }}>
              {comments.map((c) => (
                <div key={c.id} style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
                  <span className="avatar" title={c.author_full_name || c.author_name}>
                    {(c.author_full_name || c.author_name || '?').slice(0, 2).toUpperCase()}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#ddd' }}>
                        {c.author_full_name || c.author_name || 'Unknown'}
                      </span>
                      <span style={{ fontSize: '9.5px', color: '#666' }}>
                        {new Date(c.created_at).toLocaleDateString()} · {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#bbb', whiteSpace: 'pre-wrap', marginTop: '2px' }}>{c.content}</div>
                  </div>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>
          )}

          <form onSubmit={postComment} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="avatar" title={me.name}>{me.name.slice(0, 2).toUpperCase()}</span>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment…"
              className="search"
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn primary" disabled={posting || !newComment.trim()} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Send size={11} /> Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
