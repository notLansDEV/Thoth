import { useState } from 'react'
import { createBug } from '../bugs.service.js'
import { TASK_PRIORITIES } from '../../tasks/tasks.service.js'

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

export default function ReportBugModal({ projects, stages, defaultStageName, onCreated, onClose }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const stageOptions = (stages && stages.length > 0)
    ? stages.filter((s) => s.name !== 'Archived').map((s) => s.name)
    : ['New']
  const [stage, setStage] = useState(defaultStageName || stageOptions[0] || 'New')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!projectId) return setError('Please select a project.')
    if (!title.trim()) return setError('Please enter a bug title.')

    setLoading(true)
    try {
      const bug = await createBug({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        kanban_column: stage,
      })
      onCreated(bug)
    } catch (err) {
      setError(err.message || 'Could not report bug')
      setLoading(false)
    }
  }

  const priorityColor = (TASK_PRIORITIES.find((p) => p.value === priority) || {}).color

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#151515', border: '1px solid #292929', borderRadius: '6px',
        padding: '24px', width: '100%', maxWidth: '440px', maxHeight: '90vh',
        overflowY: 'auto', boxShadow: '0 20px 25px rgba(0,0,0,0.3)',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700' }}>Report a Bug</h2>
          <p style={{ margin: 0, color: '#777', fontSize: '12px' }}>Describe the issue so it can be tracked and fixed</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div style={{
              marginBottom: '14px', padding: '8px 11px',
              border: '1px solid rgba(255,64,64,0.35)', borderRadius: '4px',
              background: 'rgba(255,64,64,0.07)', color: '#ff8a8a', fontSize: '11px',
            }} role="alert">{error}</div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={inputStyle}>
              {projects.length === 0 && <option value="">No projects available</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Title</label>
            <input
              type="text" value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary of the bug"
              style={inputStyle} autoFocus
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? Steps to reproduce, expected vs actual behavior…"
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{ ...inputStyle, borderColor: `${priorityColor || '#2a2a2a'}66` }}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Stage</label>
              <select value={stage} onChange={(e) => setStage(e.target.value)} style={inputStyle}>
                {stageOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose} style={{ cursor: 'pointer' }}>Cancel</button>
            <button type="submit" className="btn primary" disabled={loading} style={{ cursor: 'pointer' }}>
              {loading ? 'Reporting…' : 'Report Bug'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
