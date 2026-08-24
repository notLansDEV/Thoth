import { useEffect, useRef, useState } from 'react'
import {
  X, Paperclip, Send, FileImage, FileText, FileArchive, FileType2, FileSpreadsheet,
} from 'lucide-react'
import {
  BUG_STAGES,
  updateBug,
  getWorkspaceMembers,
  getMilestones,
} from '../bugs.service.js'
import {
  TASK_PRIORITIES,
  priorityStyle,
} from '../../tasks/tasks.service.js'

const inputStyle = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid #2a2a2a',
  background: '#101010',
  color: '#ddd',
  borderRadius: '4px',
  fontSize: '12px',
  boxSizing: 'border-box',
  outline: 'none',
}

const labelStyle = {
  display: 'block',
  marginBottom: '5px',
  fontSize: '10px',
  fontWeight: '700',
  color: '#777',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

function toDateInput(value) {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function fileIcon(name) {
  if (!name) return <Paperclip size={13} />
  const ext = name.split('.').pop().toLowerCase()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return <FileImage size={13} />
  if (['pdf'].includes(ext)) return <FileText size={13} />
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FileArchive size={13} />
  if (['doc', 'docx'].includes(ext)) return <FileType2 size={13} />
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet size={13} />
  return <Paperclip size={13} />
}

function formatSize(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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

const BUG_STAGE_OPTIONS = BUG_STAGES.map((s) => ({ value: s.value, label: s.label }))

export default function BugPreviewModal({ bug, workspaceId, projectName, stages, onUpdated, onClose }) {
  const stageOptions = (stages && stages.length > 0)
    ? stages.map((s) => ({ value: s.name, label: s.name }))
    : BUG_STAGE_OPTIONS
  const [title, setTitle] = useState(bug.title || '')
  const [description, setDescription] = useState(bug.description || '')
  const [stage, setStage] = useState(bug.kanban_column || bug.status || 'New')
  const [priority, setPriority] = useState(bug.priority || 'medium')
  const [assignee, setAssignee] = useState(bug.assigned_to || '')
  const [startDate, setStartDate] = useState(toDateInput(bug.start_date))
  const [dueDate, setDueDate] = useState(toDateInput(bug.due_date))
  const [milestoneId, setMilestoneId] = useState(bug.milestone_id || '')
  const [tab, setTab] = useState('description')
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [files, setFiles] = useState(bug.attachments || bug.meta?.attachments || [])
  const [stepsToReproduce, setStepsToReproduce] = useState(bug.steps_to_reproduce || '')
  const [expectedBehavior, setExpectedBehavior] = useState(bug.expected_behavior || '')
  const [actualBehavior, setActualBehavior] = useState(bug.actual_behavior || '')
  const [members, setMembers] = useState([])
  const [milestones, setMilestones] = useState([])
  const fileInputRef = useRef(null)

  useEffect(() => {
    let alive = true
    getWorkspaceMembers(workspaceId)
      .then((rows) => { if (alive) setMembers(rows) })
      .catch(() => {})
    return () => { alive = false }
  }, [workspaceId])

  useEffect(() => {
    if (!bug.project_id) return
    let alive = true
    getMilestones(bug.project_id)
      .then((rows) => { if (alive) setMilestones(rows) })
      .catch(() => {})
    return () => { alive = false }
  }, [bug.project_id])

  useEffect(() => {
    let alive = true
    fetch(`/api/bugs/${bug.id}/comments`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then((r) => r.json())
      .then((rows) => { if (alive) setComments(Array.isArray(rows) ? rows : []) })
      .catch(() => {})
    return () => { alive = false }
  }, [bug.id])

  async function patch(data) {
    try {
      const updated = await updateBug(bug.id, data)
      onUpdated?.({ ...bug, ...updated })
      return updated
    } catch {
      return null
    }
  }

  function onTitleBlur() {
    if (title.trim() && title.trim() !== bug.title) patch({ title: title.trim() })
    else setTitle(bug.title)
  }

  function onDescriptionBlur() {
    if ((description.trim() || null) !== (bug.description || null)) {
      patch({ description: description.trim() || null })
    }
  }

  function onStepsBlur() {
    if ((stepsToReproduce.trim() || null) !== (bug.steps_to_reproduce || null)) {
      patch({ steps_to_reproduce: stepsToReproduce.trim() || null })
    }
  }

  function onExpectedBlur() {
    if ((expectedBehavior.trim() || null) !== (bug.expected_behavior || null)) {
      patch({ expected_behavior: expectedBehavior.trim() || null })
    }
  }

  function onActualBlur() {
    if ((actualBehavior.trim() || null) !== (bug.actual_behavior || null)) {
      patch({ actual_behavior: actualBehavior.trim() || null })
    }
  }

  async function addComment(e) {
    e.preventDefault()
    if (!newComment.trim()) return
    try {
      const res = await fetch(`/api/bugs/${bug.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ content: newComment.trim() }),
      })
      const created = await res.json()
      setComments((cur) => [...cur, created])
      setNewComment('')
    } catch { /* keep text for retry */ }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    })
  }

  async function onFilesPicked(e) {
    const picked = Array.from(e.target.files || [])
    e.target.value = ''
    if (picked.length === 0) return
    const additions = await Promise.all(picked.map(async (f) => {
      const entry = {
        name: f.name,
        size: f.size,
        type: f.type || null,
        added_at: new Date().toISOString(),
        added_by: currentUser().name,
      }
      if ((f.type || '').startsWith('image/') && f.size <= 2 * 1024 * 1024) {
        entry.dataUrl = await readFileAsDataUrl(f)
      }
      return entry
    }))
    const next = [...files, ...additions]
    setFiles(next)
    patch({ meta: { attachments: next } }).then((updated) => {
      if (!updated) setFiles(files)
    })
  }

  async function removeFile(index) {
    const next = files.filter((_, i) => i !== index)
    setFiles(next)
    const updated = await patch({ meta: { attachments: next } })
    if (!updated) setFiles(files)
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.65)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#151515', border: '1px solid #292929', borderRadius: '6px',
        width: '100%', maxWidth: '760px', maxHeight: '88vh',
        display: 'grid', gridTemplateColumns: '1fr 240px',
        boxShadow: '0 20px 25px rgba(0,0,0,0.4)', overflow: 'hidden',
      }}>
        {/* LEFT */}
        <div style={{ padding: '22px', overflowY: 'auto' }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={onTitleBlur}
            style={{
              width: '100%', background: 'transparent', border: '1px solid transparent',
              borderRadius: '4px', color: '#f1f1f1', fontSize: '16px', fontWeight: '700',
              padding: '4px 6px', margin: '-4px -6px 4px', outline: 'none',
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#2a2a2a'; e.target.style.background = '#101010' }}
            onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'transparent'; onTitleBlur() }}
          />

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px', paddingLeft: '2px' }}>
            {bug.bug_id && (
              <span style={{
                fontFamily: 'monospace', fontSize: '10px', fontWeight: 700,
                color: '#ff6b6b', background: 'rgba(255,64,64,0.08)',
                border: '1px solid rgba(255,64,64,0.3)', borderRadius: '3px',
                padding: '2px 6px',
              }}>{bug.bug_id}</span>
            )}
            <span className="badge paused" style={{ fontSize: '9px' }}>
              {(stageOptions.find((s) => s.value === stage) || {}).label || stage}
            </span>
            <span className="badge" style={{ ...priorityStyle(priority), background: 'transparent', fontSize: '9px' }}>
              {priority}
            </span>
            {projectName && (
              <span style={{ color: '#666', fontSize: '10px' }}>in {projectName}</span>
            )}
          </div>

          {/* Section tabs */}
          <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #292929', marginBottom: '14px' }}>
            {[
              { key: 'description', label: 'Description' },
              { key: 'steps', label: 'Steps' },
              { key: 'expected', label: 'Expected' },
              { key: 'actual', label: 'Actual' },
              { key: 'comments', label: `Comments${comments.length ? ` (${comments.length})` : ''}` },
              { key: 'files', label: `Files${files.length ? ` (${files.length})` : ''}` },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                style={{
                  padding: '7px 10px', fontSize: '11px', fontWeight: 600,
                  background: 'transparent',
                  color: tab === t.key ? '#fff' : '#777',
                  border: 0, borderTop: '2px solid transparent',
                  borderBottom: tab === t.key ? '2px solid #695df0' : '2px solid transparent',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'description' && (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={onDescriptionBlur}
              placeholder="Add a more detailed description…"
              style={{ ...inputStyle, minHeight: '140px', resize: 'vertical', marginBottom: '18px' }}
            />
          )}

          {tab === 'steps' && (
            <textarea
              value={stepsToReproduce}
              onChange={(e) => setStepsToReproduce(e.target.value)}
              onBlur={onStepsBlur}
              placeholder="1. Go to…&#10;2. Click on…&#10;3. See error"
              style={{ ...inputStyle, minHeight: '140px', resize: 'vertical', marginBottom: '18px' }}
            />
          )}

          {tab === 'expected' && (
            <textarea
              value={expectedBehavior}
              onChange={(e) => setExpectedBehavior(e.target.value)}
              onBlur={onExpectedBlur}
              placeholder="What should have happened?"
              style={{
                ...inputStyle, minHeight: '140px', resize: 'vertical', marginBottom: '18px',
                borderColor: 'rgba(32,217,107,0.35)',
                background: 'rgba(32,217,107,0.04)',
              }}
            />
          )}

          {tab === 'actual' && (
            <textarea
              value={actualBehavior}
              onChange={(e) => setActualBehavior(e.target.value)}
              onBlur={onActualBlur}
              placeholder="What actually happened?"
              style={{
                ...inputStyle, minHeight: '140px', resize: 'vertical', marginBottom: '18px',
                borderColor: 'rgba(255,64,64,0.35)',
                background: 'rgba(255,64,64,0.04)',
              }}
            />
          )}

          {tab === 'comments' && (
            <>
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
                </div>
              )}

              <form onSubmit={addComment} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="avatar" title={currentUser().name}>{currentUser().name.slice(0, 2).toUpperCase()}</span>
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment…"
                  className="search"
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn primary" disabled={!newComment.trim()} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Send size={11} /> Send
                </button>
              </form>
            </>
          )}

          {tab === 'files' && (
            <>
              {files.length === 0 ? (
                <div style={{ color: '#555', fontSize: '11px', marginBottom: '8px' }}>No files attached yet</div>
              ) : (
                <div style={{ marginBottom: '10px' }}>
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="check-row"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '4px' }}
                    >
                      {f.dataUrl ? (
                        <img
                          src={f.dataUrl}
                          alt={f.name}
                          style={{
                            width: '34px', height: '34px', objectFit: 'cover',
                            borderRadius: '3px', border: '1px solid #2a2a2a', flexShrink: 0,
                          }}
                        />
                      ) : (
                        <span style={{ display: 'inline-flex', color: '#888' }}>{fileIcon(f.name)}</span>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.name}
                        </div>
                        <div style={{ fontSize: '9px', color: '#555' }}>
                          {[f.size != null ? formatSize(f.size) : null, f.added_by].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="row-delete"
                        onClick={() => removeFile(i)}
                        aria-label="Remove file"
                        style={{
                          background: 'transparent', border: 0, color: '#555', cursor: 'pointer',
                          padding: '2px 4px', opacity: 0, display: 'inline-flex',
                        }}
                      ><X size={11} /></button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn"
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <Paperclip size={12} /> Attach files
              </button>
              <input ref={fileInputRef} type="file" multiple hidden onChange={onFilesPicked} />
            </>
          )}
        </div>

        {/* RIGHT */}
        <div style={{
          borderLeft: '1px solid #292929', background: '#111',
          padding: '18px 16px', overflowY: 'auto',
        }}>
          <button
            onClick={onClose}
            style={{
              float: 'right', background: 'transparent', border: 0, color: '#666',
              cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0,
            }}
            aria-label="Close"
          ><X size={14} /></button>

          <div style={{ marginBottom: '13px' }}>
            <label style={labelStyle}>Stage</label>
            <select
              value={stage}
              onChange={(e) => { setStage(e.target.value); patch({ kanban_column: e.target.value }) }}
              style={inputStyle}
            >
              {stageOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '13px' }}>
            <label style={labelStyle}>Priority</label>
            <select
              value={priority}
              onChange={(e) => { setPriority(e.target.value); patch({ priority: e.target.value }) }}
              style={inputStyle}
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '13px' }}>
            <label style={labelStyle}>Assignee</label>
            <select
              value={assignee}
              onChange={(e) => { setAssignee(e.target.value); patch({ assigned_to: e.target.value || null }) }}
              style={inputStyle}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name || m.username}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '13px' }}>
            <label style={labelStyle}>Start date</label>
            <input
              type="date" value={startDate}
              onChange={(e) => { setStartDate(e.target.value); patch({ start_date: e.target.value || null }) }}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '13px' }}>
            <label style={labelStyle}>Due date</label>
            <input
              type="date" value={dueDate}
              onChange={(e) => { setDueDate(e.target.value); patch({ due_date: e.target.value || null }) }}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '13px' }}>
            <label style={labelStyle}>Project</label>
            <div style={{ fontSize: '12px', color: '#ddd', padding: '6px 8px', background: '#101010', border: '1px solid #2a2a2a', borderRadius: '4px' }}>
              {projectName || '—'}
            </div>
          </div>

          <div style={{ marginBottom: '4px' }}>
            <label style={labelStyle}>Milestone</label>
            <select
              value={milestoneId}
              onChange={(e) => { setMilestoneId(e.target.value); patch({ milestone_id: e.target.value || null }) }}
              style={inputStyle}
            >
              <option value="">None</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
