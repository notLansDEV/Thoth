import { useState } from 'react'
import { createMilestone } from '../../milestones/milestones.service.js'

const labelStyle = {
  display: 'block',
  marginBottom: '5px',
  fontSize: '10px',
  fontWeight: '700',
  color: '#777',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const inputStyle = {
  width: '100%',
  padding: '8px 9px',
  border: '1px solid #2a2a2a',
  background: '#101010',
  color: '#ddd',
  borderRadius: '4px',
  fontSize: '12px',
  boxSizing: 'border-box',
  outline: 'none',
}

export default function CreateMilestoneModal({ projectId, onCreated, onClose }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [checkItems, setCheckItems] = useState([])
  const [newItem, setNewItem] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  function addCheckItem(e) {
    e.preventDefault()
    if (!newItem.trim()) return
    setCheckItems((cur) => [...cur, { text: newItem.trim(), done: false }])
    setNewItem('')
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Title is required')
      return
    }
    setSaving(true)
    try {
      const created = await createMilestone({
        project_id: projectId,
        name: name.trim(),
        description: description.trim() || null,
        start_date: startDate || null,
        due_date: dueDate || null,
        meta: { checklist: checkItems },
      })
      onCreated(created)
    } catch (err) {
      setError(err.message || 'Could not create milestone')
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.65)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#151515', border: '1px solid #292929', borderRadius: '6px',
        padding: '22px', width: '100%', maxWidth: '440px', maxHeight: '88vh', overflowY: 'auto',
        boxShadow: '0 20px 25px rgba(0,0,0,0.4)',
      }}>
        <h2 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700 }}>New Milestone</h2>

        {error && (
          <div style={{
            marginBottom: '12px', padding: '7px 10px', borderRadius: '4px',
            border: '1px solid rgba(255,64,64,0.35)', background: 'rgba(255,64,64,0.07)',
            color: '#ff8a8a', fontSize: '11px',
          }}>{error}</div>
        )}

        <form onSubmit={submit}>
          <label style={labelStyle}>Title</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Beta Release" style={{ ...inputStyle, marginBottom: '12px' }} autoFocus />

          <label style={labelStyle}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What does this milestone deliver?" style={{ ...inputStyle, marginBottom: '12px', resize: 'vertical' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <label style={labelStyle}>Checklist</label>
          {checkItems.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              {checkItems.map((item, i) => (
                <div key={i} className="check-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px', borderRadius: '4px', fontSize: '11.5px', color: '#ccc' }}>
                  <span>○</span>
                  <span style={{ flex: 1 }}>{item.text}</span>
                  <button
                    type="button"
                    className="row-delete"
                    onClick={() => setCheckItems((cur) => cur.filter((_, x) => x !== i))}
                    aria-label="Remove item"
                    style={{ background: 'transparent', border: 0, color: '#555', cursor: 'pointer', fontSize: '11px', lineHeight: 1, padding: '2px 4px', opacity: 0 }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '7px', marginBottom: '16px' }}>
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addCheckItem(e) }}
              placeholder="+ Add checklist item"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button type="button" className="btn" onClick={addCheckItem} style={{ cursor: 'pointer' }}>Add</button>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose} style={{ cursor: 'pointer' }}>Cancel</button>
            <button type="submit" className="btn primary" disabled={saving} style={{ cursor: 'pointer' }}>
              {saving ? 'Creating…' : 'Create milestone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
