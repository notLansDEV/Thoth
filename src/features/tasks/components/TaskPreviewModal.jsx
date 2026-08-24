import { useEffect, useRef, useState } from 'react'
import {
  Check, X, Paperclip, FileImage, FileText, FileArchive, FileType2, FileSpreadsheet,
} from 'lucide-react'
import {
  TASK_STAGES,
  TASK_PRIORITIES,
  priorityStyle,
  updateTask,
  getWorkspaceMembers,
  getMilestones,
} from '../tasks.service.js'

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

function currentUser() {
  try {
    const u = JSON.parse(localStorage.getItem('thoth_user') || 'null')
    if (!u) return { id: null, name: 'Unknown' }
    return { id: u.id || null, name: u.full_name || u.username || 'Unknown' }
  } catch {
    return { id: null, name: 'Unknown' }
  }
}

function formatSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(name = '') {
  const ext = name.split('.').pop().toLowerCase()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return <FileImage size={13} />
  if (ext === 'pdf') return <FileText size={13} />
  if (['txt', 'md', 'log'].includes(ext)) return <FileText size={13} />
  if (['zip', 'rar', '7z'].includes(ext)) return <FileArchive size={13} />
  if (['doc', 'docx'].includes(ext)) return <FileType2 size={13} />
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet size={13} />
  return <Paperclip size={13} />
}

export default function TaskPreviewModal({ task, workspaceId, stages, onUpdated, onClose }) {
  const stageOptions = (stages && stages.length > 0)
    ? stages.map((s) => ({ value: s.name, label: s.name }))
    : TASK_STAGES
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [stage, setStage] = useState(task.status || 'todo')
  const [priority, setPriority] = useState(task.priority || 'medium')
  const [assignee, setAssignee] = useState(task.assigned_to || '')
  const [startDate, setStartDate] = useState(toDateInput(task.start_date))
  const [dueDate, setDueDate] = useState(toDateInput(task.due_date))
  const [progress, setProgress] = useState(task.progress || 0)
  const [milestoneId, setMilestoneId] = useState(task.milestone_id || '')

  const [members, setMembers] = useState([])
  const [milestones, setMilestones] = useState([])

  const [comments, setComments] = useState(task.meta?.comments || [])
  const [checklist, setChecklist] = useState(task.meta?.checklist || [])
  const [files, setFiles] = useState(task.meta?.files || [])
  const [tab, setTab] = useState('description')
  const [newComment, setNewComment] = useState('')
  const [newCheckItem, setNewCheckItem] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    let alive = true
    getWorkspaceMembers(workspaceId)
      .then((rows) => { if (alive) setMembers(rows) })
      .catch(() => {})
    getMilestones(task.project_id)
      .then((rows) => { if (alive) setMilestones(rows) })
      .catch(() => {})
    return () => { alive = false }
  }, [workspaceId, task.project_id])

  async function patch(data) {
    try {
      const updated = await updateTask(task.id, data)
      onUpdated({ ...task, ...updated })
      return updated
    } catch {
      return null
    }
  }

  function onTitleBlur() {
    if (title.trim() && title.trim() !== task.title) patch({ title: title.trim() })
    else setTitle(task.title)
  }

  function onDescriptionBlur() {
    if ((description.trim() || null) !== (task.description || null)) {
      patch({ description: description.trim() || null })
    }
  }

  async function addComment(e) {
    e.preventDefault()
    if (!newComment.trim()) return
    const user = currentUser()
    const next = [...comments, {
      text: newComment.trim(),
      at: new Date().toISOString(),
      author_id: user.id,
      author_name: user.name,
    }]
    setComments(next)
    setNewComment('')
    const updated = await patch({ meta: { comments: next } })
    if (!updated) setComments(comments)
  }

  async function toggleCheck(index) {
    const next = checklist.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    )
    setChecklist(next)
    const updated = await patch({ meta: { checklist: next } })
    if (!updated) setChecklist(checklist)
  }

  async function removeCheckItem(index) {
    const next = checklist.filter((_, i) => i !== index)
    setChecklist(next)
    const updated = await patch({ meta: { checklist: next } })
    if (!updated) setChecklist(checklist)
  }

  async function addCheckItem(e) {
    e.preventDefault()
    if (!newCheckItem.trim()) return
    const next = [...checklist, { text: newCheckItem.trim(), done: false }]
    setChecklist(next)
    setNewCheckItem('')
    const updated = await patch({ meta: { checklist: next } })
    if (!updated) setChecklist(checklist)
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
    // Images up to 2MB are inlined as data URLs so the Files tab can show thumbnails
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
    patch({ meta: { files: next } }).then((updated) => {
      if (!updated) setFiles(files)
    })
  }

  async function removeFile(index) {
    const next = files.filter((_, i) => i !== index)
    setFiles(next)
    const updated = await patch({ meta: { files: next } })
    if (!updated) setFiles(files)
  }

  const doneCount = checklist.filter((c) => c.done).length

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
            {task.task_code && (
              <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6e61ff' }}>
                {task.task_code}
              </span>
            )}
            <span className="badge paused" style={{ fontSize: '9px' }}>
              {(stageOptions.find((s) => s.value === stage) || {}).label || stage}
            </span>
            <span className="badge" style={{ ...priorityStyle(priority), background: 'transparent', fontSize: '9px' }}>
              {priority}
            </span>
            {task.project_name && (
              <span style={{ color: '#666', fontSize: '10px' }}>in {task.project_name}</span>
            )}
          </div>

          {/* Section tabs in a row */}
          <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #292929', marginBottom: '14px' }}>
            {[
              { key: 'description', label: 'Description' },
              { key: 'comments', label: `Comments${comments.length ? ` (${comments.length})` : ''}` },
              { key: 'checklist', label: `Checklist${checklist.length ? ` (${doneCount}/${checklist.length})` : ''}` },
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

          {/* Checklist */}
          {tab === 'checklist' && (
            <>
              <div style={{
                background: '#101010', border: '1px solid #242424', borderRadius: '4px',
                padding: '10px 12px', marginBottom: '10px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Checklist
                  </span>
                  <span style={{ fontSize: '10px', color: doneCount === checklist.length && checklist.length > 0 ? '#20d96b' : '#777' }}>
                    {doneCount}/{checklist.length} done
                  </span>
                </div>
                <div className="progress" style={{ height: '4px' }}>
                  <span style={{
                    width: `${checklist.length ? Math.round((doneCount / checklist.length) * 100) : 0}%`,
                    background: doneCount === checklist.length && checklist.length > 0 ? '#20d96b' : undefined,
                  }} />
                </div>
              </div>

              {checklist.length === 0 ? (
                <div style={{ color: '#555', fontSize: '11px', marginBottom: '8px' }}>No checklist items yet</div>
              ) : (
                <div style={{ marginBottom: '10px' }}>
                  {checklist.map((item, i) => (
                    <div
                      key={i}
                      className="check-row"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '4px' }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleCheck(i)}
                        aria-label={item.done ? 'Mark as not done' : 'Mark as done'}
                        style={{
                          width: '15px', height: '15px', flexShrink: 0, borderRadius: '3px',
                          border: item.done ? '0' : '1px solid #3a3a3a',
                          background: item.done ? '#695df0' : 'transparent',
                          color: '#fff', fontSize: '9px', lineHeight: 1, cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {item.done && <Check size={9} strokeWidth={3} />}
                      </button>
                      <span style={{
                        flex: 1, fontSize: '11.5px',
                        color: item.done ? '#555' : '#ccc',
                        textDecoration: item.done ? 'line-through' : 'none',
                      }}>{item.text}</span>
                      <button
                        type="button"
                        className="row-delete"
                        onClick={() => removeCheckItem(i)}
                        aria-label="Delete item"
                        style={{
                          background: 'transparent', border: 0, color: '#555', cursor: 'pointer',
                          padding: '2px 4px', opacity: 0, display: 'inline-flex',
                        }}
                      ><X size={11} /></button>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={addCheckItem} style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
                <input
                  type="text" value={newCheckItem}
                  onChange={(e) => setNewCheckItem(e.target.value)}
                  placeholder="+ Add an item"
                  style={{ ...inputStyle, padding: '5px 8px' }}
                />
                {newCheckItem.trim() && (
                  <button type="submit" className="btn primary" style={{ cursor: 'pointer', flexShrink: 0 }}>Add</button>
                )}
              </form>
            </>
          )}

          {/* Comments */}
          {tab === 'comments' && (
            <>
              <div style={{ marginBottom: '8px' }}>
                {comments.length === 0 && (
                  <div style={{ color: '#555', fontSize: '11px' }}>No comments yet</div>
                )}
                {comments.map((c, i) => {
                  const name = c.author_name || 'Unknown'
                  return (
                    <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '9px' }}>
                      <span className="avatar" style={{ width: '24px', height: '24px', fontSize: '9px', flexShrink: 0 }}>
                        {name.slice(0, 2).toUpperCase()}
                      </span>
                      <div style={{
                        flex: 1, background: '#101010', border: '1px solid #242424',
                        borderRadius: '4px', padding: '7px 9px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#ddd' }}>{name}</span>
                          <span style={{ fontSize: '9px', color: '#555' }}>
                            {new Date(c.at).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#ccc', lineHeight: 1.5 }}>{c.text}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <form onSubmit={addComment} style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
                <input
                  type="text" value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={`Comment as ${currentUser().name}…`}
                  style={{ ...inputStyle, padding: '5px 8px' }}
                />
                <button type="submit" className="btn primary" style={{ cursor: 'pointer', flexShrink: 0 }}>Send</button>
              </form>
            </>
          )}

          {/* Files */}
          {tab === 'files' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.gif,.webp,.svg,.pdf,.txt,.md,.log,.doc,.docx,.xls,.xlsx,.csv,.zip"
                style={{ display: 'none' }}
                onChange={onFilesPicked}
              />
              {files.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '1px dashed #2a2a2a', borderRadius: '4px', padding: '22px',
                    textAlign: 'center', color: '#666', fontSize: '11px', cursor: 'pointer',
                    marginBottom: '8px',
                  }}
                >
                  <Paperclip size={12} style={{ verticalAlign: '-2px', marginRight: '4px' }} />Click to attach files<br />
                  <span style={{ fontSize: '9px', color: '#444' }}>PNG, JPG, PDF, TXT, DOC, XLS, ZIP…</span>
                </div>
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
              onChange={(e) => { setStage(e.target.value); patch({ status: e.target.value }) }}
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
            <label style={labelStyle}>Progress — {progress}%</label>
            <input
              type="range" min="0" max="100" step="5" value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              onMouseUp={(e) => patch({ progress: Number(e.target.value) })}
              onTouchEnd={(e) => patch({ progress: Number(e.target.value) })}
              style={{ width: '100%', accentColor: '#695df0' }}
            />
          </div>

          <div style={{ marginBottom: '13px' }}>
            <label style={labelStyle}>Project</label>
            <div style={{ fontSize: '12px', color: '#ddd', padding: '6px 8px', background: '#101010', border: '1px solid #2a2a2a', borderRadius: '4px' }}>
              {task.project_name || '—'}
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
