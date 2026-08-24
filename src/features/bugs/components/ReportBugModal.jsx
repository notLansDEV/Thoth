import { useRef, useState } from 'react'
import { createBug } from '../bugs.service.js'
import { TASK_PRIORITIES } from '../../tasks/tasks.service.js'
import { Paperclip, X } from 'lucide-react'

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

const MAX_FILE_BYTES = 2 * 1024 * 1024

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

export default function ReportBugModal({ projects, stages, defaultStageName, onCreated, onClose }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState('')
  const [expected, setExpected] = useState('')
  const [actual, setActual] = useState('')
  const [priority, setPriority] = useState('medium')
  const [attachments, setAttachments] = useState([])
  const stageOptions = (stages && stages.length > 0)
    ? stages.filter((s) => s.name !== 'Archived').map((s) => s.name)
    : ['New']
  const [stage, setStage] = useState(defaultStageName || stageOptions[0] || 'New')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  async function onFilesPicked(e) {
    const picked = Array.from(e.target.files || [])
    e.target.value = ''
    for (const file of picked) {
      if (file.size > MAX_FILE_BYTES) continue
      const entry = { name: file.name, size: file.size, type: file.type }
      if ((file.type || '').startsWith('image/') && file.size <= MAX_FILE_BYTES) {
        entry.dataUrl = await readFileAsDataUrl(file)
      }
      setAttachments((cur) => [...cur, entry])
    }
  }

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
        steps_to_reproduce: steps.trim() || null,
        expected_behavior: expected.trim() || null,
        actual_behavior: actual.trim() || null,
        ...(attachments.length > 0 ? { meta: { attachments } } : {}),
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
        padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh',
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
              placeholder="What happened?"
              style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Steps to reproduce</label>
            <textarea
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder={'1. Go to…\n2. Click on…\n3. See error'}
              style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Expected behavior</label>
            <textarea
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              placeholder="What should have happened?"
              style={{
                ...inputStyle, minHeight: '54px', resize: 'vertical',
                borderColor: 'rgba(32,217,107,0.4)',
                background: 'rgba(32,217,107,0.04)',
              }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Actual behavior</label>
            <textarea
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              placeholder="What actually happened?"
              style={{
                ...inputStyle, minHeight: '54px', resize: 'vertical',
                borderColor: 'rgba(255,64,64,0.4)',
                background: 'rgba(255,64,64,0.05)',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
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

          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Attachments</label>
            <input ref={fileInputRef} type="file" multiple hidden onChange={onFilesPicked} />
            <button
              type="button"
              className="btn"
              onClick={() => fileInputRef.current?.click()}
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Paperclip size={12} /> Attach files
            </button>
            {attachments.length > 0 && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {attachments.map((f, i) => (
                  <span key={`${f.name}-${i}`} style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    fontSize: '10.5px', color: '#999', background: '#101010',
                    border: '1px solid #232323', borderRadius: '3px', padding: '4px 7px',
                  }}>
                    <Paperclip size={11} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <button
                      type="button" className="icon-btn" title="Remove"
                      onClick={() => setAttachments((cur) => cur.filter((_, x) => x !== i))}
                      style={{ display: 'inline-flex', alignItems: 'center' }}
                    ><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ fontSize: '9.5px', color: '#555', marginTop: '5px' }}>Files up to 2 MB each.</div>
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
