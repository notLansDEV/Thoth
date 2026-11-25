import { useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { createMilestone, updateMilestone } from '../../milestones/milestones.service.js'
import CopyCode from '../../../components/CopyCode.jsx'

const labelStyle = {
  display: 'block',
  marginBottom: '5px',
  fontSize: '10px',
  fontWeight: '700',
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const inputStyle = {
  width: '100%',
  padding: '8px 9px',
  border: '1px solid var(--border)',
  background: 'var(--panel3)',
  color: 'var(--text-soft)',
  borderRadius: '6px',
  fontSize: '12px',
  boxSizing: 'border-box',
  outline: 'none',
}

function toDateInput(value) {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: 'var(--panel3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
    </div>
  )
}

export default function CreateMilestoneModal({ projectId, milestone = null, onSaved, onClose, readOnly = false, stats = null }) {
  const [name, setName] = useState(milestone?.name || '')
  const [description, setDescription] = useState(milestone?.description || '')
  const [startDate, setStartDate] = useState(toDateInput(milestone?.start_date))
  const [dueDate, setDueDate] = useState(toDateInput(milestone?.due_date))
  const [status, setStatus] = useState(milestone?.status || 'planned')
  const [checkItems, setCheckItems] = useState(milestone?.meta?.checklist || [])
  const [newItem, setNewItem] = useState('')
  const [editIndex, setEditIndex] = useState(null)
  const [editText, setEditText] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const checkDoneCount = checkItems.filter((c) => c.done).length
  const totalTasks = stats?.totalTasks ?? 0
  const completedTasks = stats?.completedTasks ?? 0
  const openBugs = stats?.openBugs ?? 0
  const closedBugs = stats?.closedBugs ?? 0


  async function addCheckItem(e) {
    if (e) e.preventDefault()
    if (readOnly || !newItem.trim()) return
    const next = [...checkItems, { text: newItem.trim(), done: false }]
    setCheckItems(next)
    setNewItem('')
    if (milestone?.id) {
      const done = next.filter((c) => c.done).length
      const progress = next.length ? Math.round((done / next.length) * 100) : 0
      const nextStatus = next.length > 0 && done === next.length ? 'completed' : (status === 'completed' ? 'in_progress' : status)
      try {
        const updated = await updateMilestone(milestone.id, { meta: { checklist: next }, progress, status: nextStatus })
        if (updated?.status) setStatus(updated.status)
      } catch { /* ignore autosave error */ }
    }
  }

  function startEdit(i) {
    if (readOnly) return
    setEditIndex(i)
    setEditText(checkItems[i].text)
  }

  function cancelEdit() {
    setEditIndex(null)
    setEditText('')
  }

  async function saveEdit() {
    const text = editText.trim()
    if (readOnly || !text || editIndex == null) { cancelEdit(); return }
    const next = checkItems.map((it, i) => (i === editIndex ? { ...it, text } : it))
    setCheckItems(next)
    cancelEdit()
    if (milestone?.id) {
      const done = next.filter((c) => c.done).length
      const progress = next.length ? Math.round((done / next.length) * 100) : 0
      const nextStatus = next.length > 0 && done === next.length ? 'completed' : (status === 'completed' ? 'in_progress' : status)
      try {
        const updated = await updateMilestone(milestone.id, { meta: { checklist: next }, progress, status: nextStatus })
        if (updated?.status) setStatus(updated.status)
      } catch { /* ignore autosave error */ }
    }
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (readOnly) return
    if (!name.trim()) { setError('Title is required'); return }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        start_date: startDate || null,
        due_date: dueDate || null,
        progress: status === 'completed' ? 100 : (Number(milestone?.progress) || 0),
        meta: { checklist: checkItems },
      }
      const saved = milestone
        ? await updateMilestone(milestone.id, { ...payload, status })
        : await createMilestone({ project_id: projectId, ...payload, status })
      onSaved(saved)
    } catch (err) {
      setError(err.message || 'Could not save milestone')
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 10, width: '100%', maxWidth: 820, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.45)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {milestone?.id ? (
              <CopyCode
                page="projects"
                id={projectId}
                code="Milestone"
                style={{ background: 'rgba(110,97,255,0.08)', color: '#6e61ff', borderColor: 'rgba(110,97,255,0.3)' }}
              />
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'monospace', fontSize: 10, fontWeight: 700, background: 'rgba(110,97,255,0.08)', color: '#6e61ff', border: '1px solid rgba(110,97,255,0.3)', borderRadius: 3, padding: '2px 6px', lineHeight: 1.4 }}>Milestone</span>
            )}
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {readOnly ? (name || 'View Milestone') : milestone ? 'Edit Milestone' : 'New Milestone'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close"><X size={14} /></button>
        </div>

        <form onSubmit={submit} style={{ padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255,64,64,0.35)', background: 'rgba(255,64,64,0.07)', color: '#ff8a8a', fontSize: 11 }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 }}>
            <StatCard label="Total Task" value={totalTasks} color="#60a5fa" />
            <StatCard label="Completed Task" value={completedTasks} color="#20d96b" />
            <StatCard label="Open Bugs" value={openBugs} color="#ff7918" />
            <StatCard label="Closed Bugs" value={closedBugs} color="var(--text-soft)" />
          </div>

          <div>
            <label style={labelStyle}>Title</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Milestone title" style={inputStyle} disabled={readOnly} autoFocus={!readOnly} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} disabled={readOnly} />
            </div>
            <div>
              <label style={labelStyle}>Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} disabled={readOnly} />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle} disabled={readOnly}>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Write milestone description..."
              style={{ ...inputStyle, minHeight: 110, resize: 'vertical', lineHeight: 1.5 }}
              disabled={readOnly}
            />
          </div>

          <div>
            <div style={{ background: 'var(--panel3)', border: '1px solid var(--border-soft)', borderRadius: 4, padding: '10px 12px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Checklist</span>
                <span style={{ fontSize: 10, color: checkDoneCount === checkItems.length && checkItems.length > 0 ? '#20d96b' : 'var(--muted)' }}>{checkDoneCount}/{checkItems.length} done</span>
              </div>
              <div className="progress" style={{ height: 4 }}>
                <span style={{ width: `${checkItems.length ? Math.round((checkDoneCount / checkItems.length) * 100) : 0}%`, background: checkDoneCount === checkItems.length && checkItems.length > 0 ? '#20d96b' : undefined }} />
              </div>
            </div>

            {checkItems.length === 0 ? (
              <div style={{ color: 'var(--muted2)', fontSize: 11, marginBottom: 8 }}>No checklist items yet</div>
            ) : (
              <div style={{ marginBottom: 10 }}>
                {checkItems.map((item, i) => (
                  <div key={`${item.text}-${i}`} className="check-row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4 }}>
                    <button
                      type="button"
                      onClick={async () => {
                        const next = checkItems.map((it, x) => (x === i ? { ...it, done: !it.done } : it))
                        setCheckItems(next)
                        if (milestone?.id) {
                          const done = next.filter((c) => c.done).length
                          const progress = next.length ? Math.round((done / next.length) * 100) : 0
                          const nextStatus = next.length > 0 && done === next.length ? 'completed' : (status === 'completed' ? 'in_progress' : status)
                          try {
                            const updated = await updateMilestone(milestone.id, { meta: { checklist: next }, progress, status: nextStatus })
                            if (updated?.status) setStatus(updated.status)
                          } catch { /* ignore autosave error */ }
                        }
                      }}
                      aria-label={item.done ? 'Mark as not done' : 'Mark as done'}
                      style={{ width: 15, height: 15, flexShrink: 0, borderRadius: 3, border: item.done ? 0 : '1px solid var(--hover-border)', background: item.done ? '#695df0' : 'transparent', color: '#fff', fontSize: 9, lineHeight: 1, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {item.done && <Check size={9} strokeWidth={3} />}
                    </button>
                    {editIndex === i && !readOnly ? (
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit() } if (e.key === 'Escape') cancelEdit() }}
                        style={{ flex: 1, background: 'var(--hover)', border: '1px solid var(--hover-border)', borderRadius: 3, color: 'var(--text-soft)', fontSize: '11.5px', fontFamily: 'inherit', padding: '2px 6px', outline: 'none' }}
                      />
                    ) : (
                      <span style={{ flex: 1, fontSize: '11.5px', color: item.done ? 'var(--muted2)' : 'var(--text-soft)', textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
                    )}
                    {!readOnly && editIndex !== i && (
                      <button type="button" className="row-delete" onClick={() => startEdit(i)} aria-label="Edit item" style={{ background: 'transparent', border: 0, color: 'var(--muted2)', cursor: 'pointer', padding: '2px 4px', opacity: 0, display: 'inline-flex' }}><Pencil size={11} /></button>
                    )}
                    {!readOnly && (
                      <button type="button" className="row-delete" onClick={async () => { if (editIndex === i) cancelEdit(); const next = checkItems.filter((_, x) => x !== i); setCheckItems(next); if (milestone?.id) { const done = next.filter((c) => c.done).length; const progress = next.length ? Math.round((done / next.length) * 100) : 0; const nextStatus = next.length > 0 && done === next.length ? 'completed' : (status === 'completed' ? 'in_progress' : status); try { const updated = await updateMilestone(milestone.id, { meta: { checklist: next }, progress, status: nextStatus }); if (updated?.status) setStatus(updated.status) } catch { /* ignore autosave error */ } } }} aria-label="Delete item" style={{ background: 'transparent', border: 0, color: 'var(--muted2)', cursor: 'pointer', padding: '2px 4px', opacity: 0, display: 'inline-flex' }}><X size={11} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!readOnly && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
                <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCheckItem(e) } }} placeholder="+ Add an item" maxLength={32} style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--border)', background: 'var(--panel3)', color: 'var(--text-soft)', borderRadius: 4, fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
                {newItem.trim() && <button type="button" className="btn primary" onClick={addCheckItem} style={{ cursor: 'pointer', flexShrink: 0 }}>Add</button>}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} className="btn" style={{ cursor: 'pointer' }}>{readOnly ? 'Close' : 'Cancel'}</button>
            {!readOnly && (
              <button type="submit" disabled={saving} className="btn primary" style={{ cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? (milestone ? 'Saving…' : 'Creating…') : (milestone ? 'Save changes' : 'Create milestone')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
