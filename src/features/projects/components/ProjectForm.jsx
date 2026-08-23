import { useState } from 'react'

export default function ProjectForm({ onSubmit, onCancel }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit(name, description)
      setName('')
      setDescription('')
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#151515',
        border: '1px solid #292929',
        borderRadius: '6px',
        padding: '24px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 25px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700' }}>New Project</h2>
          <p style={{ margin: '0', color: '#777', fontSize: '12px' }}>Create a new project to get started</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#ddd'
            }}>
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Awesome Project"
              style={{
                width: '100%',
                padding: '8px 9px',
                border: '1px solid #2a2a2a',
                background: '#101010',
                color: '#ddd',
                borderRadius: '4px',
                fontSize: '12px',
                boxSizing: 'border-box',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#6e61ff'}
              onBlur={(e) => e.target.style.borderColor = '#2a2a2a'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#ddd'
            }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your project..."
              style={{
                width: '100%',
                padding: '8px 9px',
                border: '1px solid #2a2a2a',
                background: '#101010',
                color: '#ddd',
                borderRadius: '4px',
                fontSize: '12px',
                boxSizing: 'border-box',
                outline: 'none',
                minHeight: '80px',
                resize: 'vertical'
              }}
              onFocus={(e) => e.target.style.borderColor = '#6e61ff'}
              onBlur={(e) => e.target.style.borderColor = '#2a2a2a'}
            />
          </div>

          <div style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                height: '27px',
                padding: '0 11px',
                border: '1px solid #2a2a2a',
                background: '#111',
                color: '#ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                height: '27px',
                padding: '0 11px',
                border: '0',
                background: '#695df0',
                color: '#fff',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600'
              }}
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
