import { useEffect, useState } from 'react'
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

export default function TaskPreviewModal({ task, workspaceId, onUpdated, onClose }) {
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
  const [newComment, setNewComment] = useState('')
  const [newCheckItem, setNewCheckItem] = useState('')
  const [newFile, setNewFile] = useState('')

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
    const next = [...comments, {
      text: newComment.trim(),
      at: new Date().toISOString(),
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

  async function addCheckItem(e) {
    e.preventDefault()
    if (!newCheckItem.trim()) return
    const next = [...checklist, { text: newCheckItem.trim(), done: false }]
    setChecklist(next)
    setNewCheckItem('')
    const updated = await patch({ meta: { checklist: next } })
    if (!updated) setChecklist(checklist)
  }

  async function addFile(e) {
    e.preventDefault()
    if (!newFile.trim()) return
    const next = [...files, { name: newFile.trim(), added_at: new Date().toISOString() }]
    setFiles(next)
    setNewFile('')
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
            <span className="badge paused" style={{ fontSize: '9px' }}>
              {(TASK_STAGES.find((s) => s.value === stage) || {}).label}
            </span>
            <span className="badge" style={{ ...priorityStyle(priority), background: 'transparent', fontSize: '9px' }}>
              {priority}
            </span>
            {task.project_name && (
              <span style={{ color: '#666', fontSize: '10px' }}>in {task.project_name}</span>
            )}
          </div>

          <label style={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={onDescriptionBlur}
            placeholder="Add a more detailed description…"
            style={{ ...inputStyle, minHeight: '70px', resize: 'vertical', marginBottom: '18px' }}
          />

          {/* Checklist */}
          <label style={labelStyle}>
            Checklist {checklist.length > 0 ? `(${doneCount}/${checklist.length})` : ''}
          </label>
          <div style={{ marginBottom: '6px' }}>
            {checklist.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '3px 0' }}>
                <input
                  type="checkbox" checked={!!item.done} onChange={() => toggleCheck(i)}
                  style={{ accentColor: '#695df0', cursor: 'pointer' }}
                />
                <span style={{
                  fontSize: '11px', color: item.done ? '#555' : '#ccc',
                  textDecoration: item.done ? 'line-through' : 'none',
                }}>{item.text}</span>
              </div>
            ))}
          </div>
          <form onSubmit={addCheckItem} style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
            <input
              type="text" value={newCheckItem}
              onChange={(e) => setNewCheckItem(e.target.value)}
              placeholder="+ Add an item"
              style={{ ...inputStyle, padding: '5px 8px' }}
            />
          </form>

          {/* Comments */}
          <label style={labelStyle}>Comments</label>
          <div style={{ marginBottom: '8px' }}>
            {comments.length === 0 && (
              <div style={{ color: '#555', fontSize: '11px' }}>No comments yet</div>
            )}
            {comments.map((c, i) => (
              <div key={i} style={{
                background: '#101010', border: '1px solid #242424', borderRadius: '4px',
                padding: '7px 9px', marginBottom: '6px',
              }}>
                <div style={{ fontSize: '11px', color: '#ddd' }}>{c.text}</div>
                <div style={{ fontSize: '9px', color: '#555', marginTop: '3px' }}>
                  {new Date(c.at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={addComment} style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
            <input
              type="text" value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment…"
              style={{ ...inputStyle, padding: '5px 8px' }}
            />
            <button type="submit" className="btn primary" style={{ cursor: 'pointer', flexShrink: 0 }}>Send</button>
          </form>

          {/* Files */}
          <label style={labelStyle}>Files</label>
          <div style={{ marginBottom: '6px' }}>
            {files.length === 0 && (
              <div style={{ color: '#555', fontSize: '11px' }}>No files attached</div>
            )}
            {files.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '7px', padding: '4px 0',
                fontSize: '11px', color: '#bbb',
              }}>
                <span style={{ color: '#695df0' }}>📎</span> {f.name}
              </div>
            ))}
          </div>
          <form onSubmit={addFile} style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text" value={newFile}
              onChange={(e) => setNewFile(e.target.value)}
              placeholder="+ Attach a file or link"
              style={{ ...inputStyle, padding: '5px 8px' }}
            />
          </form>
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
          >✕</button>

          <div style={{ marginBottom: '13px' }}>
            <label style={labelStyle}>Stage</label>
            <select
              value={stage}
              onChange={(e) => { setStage(e.target.value); patch({ status: e.target.value }) }}
              style={inputStyle}
            >
              {TASK_STAGES.map((s) => (
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
