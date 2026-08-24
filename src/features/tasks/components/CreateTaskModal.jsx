import { useEffect, useState } from 'react'
import {
  TASK_PRIORITIES,
  createTask,
  getWorkspaceMembers,
  getMilestones,
} from '../tasks.service.js'

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

const labelStyle = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '12px',
  fontWeight: '600',
  color: '#ddd',
}

export default function CreateTaskModal({ projects, workspaceId, stages, defaultProjectId, onCreated, onClose }) {
  const stageOptions = (stages && stages.length > 0)
    ? stages.map((s) => ({ value: s.name, label: s.name }))
    : []
  const [projectId, setProjectId] = useState(defaultProjectId || '')
  const [stage, setStage] = useState(stageOptions[0]?.value || 'To Do')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [assignee, setAssignee] = useState('')
  const [milestoneId, setMilestoneId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [members, setMembers] = useState([])
  const [milestones, setMilestones] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    getWorkspaceMembers(workspaceId)
      .then((rows) => { if (alive) setMembers(rows) })
      .catch(() => {})
    return () => { alive = false }
  }, [workspaceId])

  useEffect(() => {
    if (!projectId) return
    let alive = true
    getMilestones(projectId)
      .then((rows) => { if (alive) setMilestones(Array.isArray(rows) ? rows : []) })
      .catch(() => { if (alive) setMilestones([]) })
    return () => { alive = false }
  }, [projectId])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!projectId) return setError('Please select a project.')
    if (!title.trim()) return setError('Please enter a task title.')

    setLoading(true)
    try {
      const task = await createTask({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        status: stage,
        priority,
        assigned_to: assignee || null,
        milestone_id: milestoneId || null,
        start_date: startDate || null,
        due_date: dueDate || null,
      })
      onCreated(task)
    } catch (err) {
      setError(err.message || 'Could not create task')
      setLoading(false)
    }
  }

  const priorityColor = (TASK_PRIORITIES.find((p) => p.value === priority) || {}).color

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#151515', border: '1px solid #292929', borderRadius: '6px',
        padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '90vh',
        overflowY: 'auto', boxShadow: '0 20px 25px rgba(0,0,0,0.3)',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700' }}>Create Task</h2>
          <p style={{ margin: 0, color: '#777', fontSize: '12px' }}>Add a new task to a project</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div style={{
              marginBottom: '14px', padding: '8px 11px',
              border: '1px solid rgba(255,64,64,0.35)', borderRadius: '4px',
              background: 'rgba(255,64,64,0.07)', color: '#ff8a8a', fontSize: '11px',
            }} role="alert">{error}</div>
          )}

          {/* Row: Project + Milestone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Project</label>
              <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setMilestoneId('') }} style={inputStyle}>
                <option value="">Select a project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Milestone</label>
              <select value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)} style={inputStyle}>
                <option value="">No milestone</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Title</label>
            <input
              type="text" value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              style={inputStyle} autoFocus
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details…"
              style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
            />
          </div>

          {/* Assign to */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Assign to</label>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} style={inputStyle}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || m.username}{m.role ? ` (${m.role})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Row: Stage + Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Stage</label>
              <select value={stage} onChange={(e) => setStage(e.target.value)} style={inputStyle}>
                {stageOptions.length === 0 && <option value="To Do">To Do</option>}
                {stageOptions.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{ ...inputStyle, borderColor: `${priorityColor}66` }}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Start Date + Due Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose} style={{ cursor: 'pointer' }}>Cancel</button>
            <button type="submit" className="btn primary" disabled={loading} style={{ cursor: 'pointer' }}>
              {loading ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
