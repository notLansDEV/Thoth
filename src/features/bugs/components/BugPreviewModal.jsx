import { useEffect, useRef, useState } from 'react'
import {
  X, Paperclip, Send, FileImage, FileText, FileArchive, FileType2, FileSpreadsheet, Reply,
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
import { getProjectMembers } from '../../projects/projects.service.js'
import CopyCode from '../../../components/CopyCode.jsx'

const inputStyle = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid var(--border)',
  background: 'var(--panel3)',
  color: 'var(--text-soft)',
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
  color: 'var(--muted)',
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
  const [replyTarget, setReplyTarget] = useState(null)
  const [expandedReplies, setExpandedReplies] = useState({})
  const [files, setFiles] = useState(bug.attachments || bug.meta?.attachments || [])
  const [stepsToReproduce, setStepsToReproduce] = useState(bug.steps_to_reproduce || '')
  const [expectedBehavior, setExpectedBehavior] = useState(bug.expected_behavior || '')
  const [actualBehavior, setActualBehavior] = useState(bug.actual_behavior || '')
  const [members, setMembers] = useState([])
  const [projectMemberIds, setProjectMemberIds] = useState([])
  const [milestones, setMilestones] = useState([])
  const fileInputRef = useRef(null)

  useEffect(() => {
    let alive = true
    getWorkspaceMembers(workspaceId)
      .then((rows) => { if (alive) setMembers(rows) })
      .catch(() => {})
    getProjectMembers(bug.project_id)
      .then((rows) => { if (alive) setProjectMemberIds(Array.isArray(rows) ? rows.map((r) => r.id) : []) })
      .catch(() => { if (alive) setProjectMemberIds([]) })
    return () => { alive = false }
  }, [workspaceId, bug.project_id])

  useEffect(() => {
    if (!bug.project_id) return
    let alive = true
    getMilestones(bug.project_id)
      .then((rows) => { if (alive) setMilestones(rows) })
      .catch(() => {})
    return () => { alive = false }
  }, [bug.project_id])

  const assignableMembers = projectMemberIds.length
    ? members.filter((m) => projectMemberIds.includes(m.id))
    : members

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
    const content = replyTarget
      ? `@${replyTarget.name}: ${newComment.trim()}`
      : newComment.trim()
    const parentId = replyTarget?.id || null
    try {
      const res = await fetch(`/api/bugs/${bug.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ content, parent_comment_id: parentId }),
      })
      const created = await res.json()
      setComments((cur) => [...cur, parentId ? { ...created, _replyToId: parentId, parent_comment_id: parentId } : created])
      // auto-expand thread so the new reply is visible
      if (parentId) {
        setExpandedReplies((prev) => ({ ...prev, [parentId]: true }))
      }
      setNewComment('')
      setReplyTarget(null)
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
        background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: '6px',
        width: '100%', maxWidth: '760px', maxHeight: '88vh',
        display: 'flex', minHeight: 0,
        boxShadow: '0 20px 25px rgba(0,0,0,0.4)', overflow: 'hidden',
      }}>
        {/* LEFT */}
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, padding: '22px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={onTitleBlur}
            style={{
              width: '100%', background: 'transparent', border: '1px solid transparent',
              borderRadius: '4px', color: 'var(--text-strong)', fontSize: '16px', fontWeight: '700',
              padding: '4px 6px', margin: '-4px -6px 4px', outline: 'none',
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--panel3)' }}
            onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'transparent'; onTitleBlur() }}
          />

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px', paddingLeft: '2px' }}>
            {bug.bug_id && (
              <CopyCode
                page="bugs"
                id={bug.id}
                code={bug.bug_id}
                style={{
                  color: '#ff6b6b',
                  background: 'rgba(255,64,64,0.08)',
                  borderColor: 'rgba(255,64,64,0.3)',
                }}
              />
            )}
            <span className="badge paused" style={{ fontSize: '9px' }}>
              {(stageOptions.find((s) => s.value === stage) || {}).label || stage}
            </span>
            <span className="badge" style={{ ...priorityStyle(priority), background: 'transparent', fontSize: '9px' }}>
              {priority}
            </span>
            {projectName && (
              <span style={{ color: 'var(--muted2)', fontSize: '10px' }}>in {projectName}</span>
            )}
          </div>

          {/* Section tabs */}
          <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
            {[
              { key: 'description', label: 'Description' },
              { key: 'comments', label: `Comments${comments.length ? ` (${comments.length})` : ''}` },
              { key: 'files', label: `Files${files.length ? ` (${files.length})` : ''}` },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                style={{
                  padding: '8px 12px', fontSize: '11.5px', fontWeight: 700,
                  background: tab === t.key ? 'var(--hover)' : 'transparent',
                  color: tab === t.key ? 'var(--text-strong)' : 'var(--muted)',
                  border: '1px solid transparent', borderColor: tab === t.key ? 'var(--border)' : 'transparent',
                  borderBottom: tab === t.key ? '2px solid #695df0' : '2px solid transparent',
                  marginBottom: '-1px', cursor: 'pointer', fontFamily: 'inherit',
                  borderRadius: '4px 4px 0 0',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'description' && (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={labelStyle}>Description</label>
                <span style={{ fontSize: '9px', color: 'var(--muted2)' }}>Add context about the issue</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={onDescriptionBlur}
                placeholder="Add a more detailed description…"
                style={{ ...inputStyle, minHeight: '90px', resize: 'vertical', marginBottom: '18px' }}
              />

              <label style={{ ...labelStyle, color: '#e88', marginBottom: '6px' }}>Steps to Reproduce</label>
              <textarea
                value={stepsToReproduce}
                onChange={(e) => setStepsToReproduce(e.target.value)}
                onBlur={onStepsBlur}
                placeholder="1. Go to…&#10;2. Click on…&#10;3. See error"
                style={{ ...inputStyle, minHeight: '90px', resize: 'vertical', marginBottom: '18px', borderColor: 'var(--hover-border)' }}
              />

              <label style={{ ...labelStyle, color: '#4cdf8a', marginBottom: '6px' }}>Expected Behavior</label>
              <textarea
                value={expectedBehavior}
                onChange={(e) => setExpectedBehavior(e.target.value)}
                onBlur={onExpectedBlur}
                placeholder="What should have happened?"
                style={{
                  ...inputStyle, minHeight: '70px', resize: 'vertical', marginBottom: '18px',
                  borderColor: 'rgba(32,217,107,0.35)',
                  background: 'rgba(32,217,107,0.04)',
                }}
              />

              <label style={{ ...labelStyle, color: '#ff7c7c', marginBottom: '6px' }}>Actual Behavior</label>
              <textarea
                value={actualBehavior}
                onChange={(e) => setActualBehavior(e.target.value)}
                onBlur={onActualBlur}
                placeholder="What actually happened?"
                style={{
                  ...inputStyle, minHeight: '70px', resize: 'vertical', marginBottom: '4px',
                  borderColor: 'rgba(255,64,64,0.35)',
                  background: 'rgba(255,64,64,0.04)',
                }}
              />
            </div>
          )}

          {tab === 'comments' && (
            <>
              {comments.length > 0 && (
                <div style={{ marginBottom: '11px' }}>
                  {(() => {
                    // Build hierarchy: prefer persisted/explicit parent id, else infer from "@Name:" prefix.
                    const nodes = comments.map((c) => ({ ...c, children: [], _parent: null }))
                    const byId = new Map(nodes.map((n) => [n.id, n]))
                    const roots = []
                    for (let i = 0; i < nodes.length; i++) {
                      const n = nodes[i]
                      const content = n.content || ''
                      const m = content.match(/^@([^:]+):\s*/)
                      const explicitParentId = n.parent_comment_id || n._replyToId
                      let parent = null
                      if (explicitParentId && byId.has(explicitParentId)) {
                        parent = byId.get(explicitParentId)
                      } else if (m) {
                        const targetName = m[1].trim()
                        for (let j = i - 1; j >= 0; j--) {
                          const a = nodes[j].author_full_name || nodes[j].author_name || 'Unknown'
                          if (a === targetName) { parent = nodes[j]; break }
                        }
                      }
                      if (parent) {
                        n._parent = parent
                        n._displayContent = m ? content.slice(m[0].length) : content
                        n._replyTo = m ? m[1].trim() : (parent.author_full_name || parent.author_name || 'Unknown')
                        parent.children.push(n)
                      } else {
                        n._displayContent = content
                        roots.push(n)
                      }
                    }

                    function CommentNode({ node, depth }) {
                      const author = node.author_full_name || node.author_name || 'Unknown'
                      const text = node._displayContent != null ? node._displayContent : node.content
                      const replies = Array.isArray(node.children) ? node.children : []
                      const isReplying = replyTarget?.id === node.id
                      const isExpanded = !!expandedReplies[node.id]
                      return (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: depth === 0 ? '9px' : '6px' }}>
                          <span className="avatar" title={author} style={{ width: depth === 0 ? '24px' : '20px', height: depth === 0 ? '24px' : '20px', fontSize: depth === 0 ? '9px' : '8px', flexShrink: 0 }}>
                            {author.slice(0, 2).toUpperCase()}
                          </span>
                          <div style={{
                            flex: 1, background: depth === 0 ? 'var(--panel3)' : 'transparent',
                            border: depth === 0 ? '1px solid var(--border-soft)' : 'none',
                            borderRadius: '4px', padding: depth === 0 ? '7px 9px' : '0',
                            minWidth: 0,
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '3px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: depth === 0 ? '10.5px' : '10px', fontWeight: 700, color: 'var(--text-soft)' }}>{author}</span>
                              <span style={{ fontSize: depth === 0 ? '9px' : '8.5px', color: 'var(--muted2)' }}>
                                {node.created_at ? new Date(node.created_at).toLocaleString() : ''}
                              </span>
                            </div>
                            {node._replyTo && (
                              <div style={{ fontSize: '8.5px', color: 'var(--muted2)', marginBottom: '2px' }}>replying to {node._replyTo}</div>
                            )}
                            <div style={{ fontSize: depth === 0 ? '11px' : '10.5px', color: 'var(--text-soft)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{text}</div>
                            <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <button
                                type="button"
                                onClick={() => { setReplyTarget({ id: node.id, name: author }); setNewComment('') }}
                                style={{
                                  background: 'transparent', border: 0, padding: 0,
                                  color: isReplying ? '#6e61ff' : 'var(--muted)', cursor: 'pointer',
                                  fontSize: '9.5px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px',
                                }}
                              >
                                <Reply size={depth === 0 ? 10 : 9} /> Reply
                              </button>
                              {replies.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedReplies((prev) => ({ ...prev, [node.id]: !prev[node.id] }))}
                                  style={{ background: 'transparent', border: 0, padding: 0, color: 'var(--muted)', cursor: 'pointer', fontSize: '9.5px', fontWeight: 600 }}
                                >
                                  {isExpanded ? '▾ Hide replies' : `▸ ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
                                </button>
                              )}
                            </div>

                            {replies.length > 0 && isExpanded && (
                              <div style={{ marginTop: '7px', marginLeft: '12px', paddingLeft: '12px', borderLeft: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {replies.map((child) => <CommentNode key={child.id} node={child} depth={depth + 1} />)}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    }

                    return roots.map((n) => <CommentNode key={n.id} node={n} depth={0} />)
                  })()}
                </div>
              )}

              <form onSubmit={addComment} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {replyTarget && (
                  <div style={{ width: '100%', fontSize: '10px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '-2px' }}>
                    Replying to <strong style={{ color: 'var(--text-soft)' }}>{replyTarget.name}</strong>
                    <button type="button" onClick={() => setReplyTarget(null)} style={{ background: 'transparent', border: 0, color: 'var(--muted2)', cursor: 'pointer', padding: 0, display: 'inline-flex' }} aria-label="Cancel reply"><X size={11} /></button>
                  </div>
                )}
                <span className="avatar" title={currentUser().name}>{currentUser().name.slice(0, 2).toUpperCase()}</span>
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={replyTarget ? `Reply to ${replyTarget.name}…` : 'Write a comment…'}
                  className="search"
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn primary" disabled={!newComment.trim()} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Send size={11} /> {replyTarget ? 'Reply' : 'Send'}
                </button>
              </form>
            </>
          )}

          {tab === 'files' && (
            <>
              {files.length === 0 ? (
                <div style={{ color: 'var(--muted2)', fontSize: '11px', marginBottom: '8px' }}>No files attached yet</div>
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
                            borderRadius: '3px', border: '1px solid var(--border)', flexShrink: 0,
                          }}
                        />
                      ) : (
                        <span style={{ display: 'inline-flex', color: 'var(--muted)' }}>{fileIcon(f.name)}</span>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.name}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--muted2)' }}>
                          {[f.size != null ? formatSize(f.size) : null, f.added_by].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="row-delete"
                        onClick={() => removeFile(i)}
                        aria-label="Remove file"
                        style={{
                          background: 'transparent', border: 0, color: 'var(--muted2)', cursor: 'pointer',
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
          width: '240px', flexShrink: 0,
          borderLeft: '1px solid var(--border)', background: 'var(--panel2)',
          padding: '18px 16px', overflowY: 'auto', minHeight: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              float: 'right', background: 'transparent', border: 0, color: 'var(--muted2)',
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
              {assignableMembers.map((m) => (
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
            <div style={{ fontSize: '12px', color: 'var(--text-soft)', padding: '6px 8px', background: 'var(--panel3)', border: '1px solid var(--border)', borderRadius: '4px' }}>
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
