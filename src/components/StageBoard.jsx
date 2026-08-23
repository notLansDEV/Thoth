import { useState } from 'react'

const PALETTE = [
  '#6e61ff', '#ff7918', '#a14cff', '#20d96b', '#5f74ff',
  '#e8c547', '#ff4040', '#20d8d9', '#d95fd0', '#777777',
]

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

function StageForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '')
  const [color, setColor] = useState(initial?.color || PALETTE[0])
  const [error, setError] = useState(null)

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Stage name is required')
    onSave({ name: name.trim(), color })
  }

  return (
    <div onClick={onCancel} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1200,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#151515', border: '1px solid #292929', borderRadius: '6px',
        padding: '22px', width: '100%', maxWidth: '340px',
        boxShadow: '0 20px 25px rgba(0,0,0,0.3)',
      }}>
        <h2 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700 }}>
          {initial ? 'Edit Stage' : 'Add Stage'}
        </h2>

        {error && (
          <div style={{
            marginBottom: '12px', padding: '7px 10px', borderRadius: '4px',
            border: '1px solid rgba(255,64,64,0.35)', background: 'rgba(255,64,64,0.07)',
            color: '#ff8a8a', fontSize: '11px',
          }}>{error}</div>
        )}

        <form onSubmit={submit}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 700, color: '#999' }}>
            Stage name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. QA Testing"
            style={{ ...inputStyle, marginBottom: '14px' }}
            autoFocus
          />

          <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 700, color: '#999' }}>
            Color
          </label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '18px' }}>
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                style={{
                  width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer',
                  background: c, border: color === c ? '2px solid #fff' : '2px solid transparent',
                  padding: 0,
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onCancel} style={{ cursor: 'pointer' }}>Cancel</button>
            <button type="submit" className="btn primary" style={{ cursor: 'pointer' }}>Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Row of draggable stage cards with add / edit / delete.
 * props:
 *  - stages: [{id,name,color}]
 *  - counts: { [stageName]: number }
 *  - itemLabel: "tasks" | "bugs"
 *  - onAdd({name,color}), onUpdate(id,{name,color})
 *  - onDelete(stage), onReorder(orderIds)
 */
export default function StageBoard({ stages, counts = {}, itemLabel = 'tasks', onAdd, onUpdate, onDelete, onReorder }) {
  const [dragId, setDragId] = useState(null)
  const [form, setForm] = useState(null) // null | {} | stage

  function handleDrop(targetId) {
    if (!dragId || dragId === targetId) return setDragId(null)
    const ids = stages.map((s) => s.id)
    const from = ids.indexOf(dragId)
    const to = ids.indexOf(targetId)
    if (from === -1 || to === -1) return setDragId(null)
    ids.splice(to, 0, ids.splice(from, 1)[0])
    setDragId(null)
    onReorder(ids)
  }

  return (
    <div>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'stretch',
      }}>
        {stages.map((stage) => (
          <div
            key={stage.id}
            draggable={String(stage.name) !== 'Archived'}
            onDragStart={(e) => { setDragId(stage.id); e.dataTransfer.effectAllowed = 'move' }}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(stage.id)}
            style={{
              background: '#121212', border: dragId === stage.id ? '1px solid #695df0' : '1px solid #292929',
              borderRadius: '5px', padding: '11px 12px', minWidth: '190px', flex: '1 1 190px',
              maxWidth: '260px', cursor: String(stage.name) === 'Archived' ? 'default' : 'grab',
              opacity: dragId === stage.id ? 0.5 : 1,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <span className="dot" style={{ background: stage.color || '#6e61ff' }} />
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {stage.name}
                </span>
              </span>
              <span style={{ fontSize: '10px', color: '#555' }}>{counts[stage.name] || 0}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', color: '#555' }}>
                {counts[stage.name] || 0} {itemLabel}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  className="icon-btn"
                  title="Edit stage"
                  onClick={() => setForm(stage)}
                >✎</button>
                {String(stage.name) !== 'Archived' && (
                  <button
                    className="icon-btn"
                    title="Delete stage"
                    onClick={() => onDelete(stage)}
                    style={{ color: '#ff6b6b' }}
                  >🗑</button>
                )}
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={() => setForm({})}
          style={{
            border: '1px dashed #2a2a2a', borderRadius: '5px', background: 'transparent',
            color: '#666', cursor: 'pointer', minWidth: '150px', flex: '1 1 150px',
            maxWidth: '220px', minHeight: '64px', fontSize: '11px',
          }}
        >
          + Add Stage
        </button>
      </div>

      <div style={{ marginTop: '10px', fontSize: '10px', color: '#444' }}>
        Drag a stage card onto another stage to reorder · deleting a stage moves its items to Archived
      </div>

      {form && (
        <StageForm
          initial={form.id ? form : null}
          onSave={(data) => {
            if (form.id) onUpdate(form.id, data)
            else onAdd(data)
            setForm(null)
          }}
          onCancel={() => setForm(null)}
        />
      )}
    </div>
  )
}
