import { useEffect, useState } from 'react'
import {
  getWorkspaces,
  createWorkspace,
  setCurrentWorkspace,
} from '../features/workspaces/workspaces.service.js'

function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function Workspaces() {
  const [workspaces, setWorkspaces] = useState(null)
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true

    getWorkspaces()
      .then((rows) => { if (alive) setWorkspaces(rows) })
      .catch((err) => { if (alive) { setError(err.message); setWorkspaces([]) } })

    return () => { alive = false }
  }, [])

  function enter(workspace) {
    setCurrentWorkspace(workspace)
    navigate(`/${workspace.slug}/dashboard`)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please enter a workspace name.')
      return
    }

    setLoading(true)
    try {
      const workspace = await createWorkspace(name.trim())
      enter(workspace)
    } catch (err) {
      setError(err.message || 'Could not create workspace')
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Workspaces</h1>
          <p className="page-subtitle">
            {workspaces && workspaces.length > 0
              ? 'Choose a workspace or create a new one'
              : 'Create a workspace to get started'}
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom: '14px',
          padding: '9px 12px',
          border: '1px solid rgba(255,64,64,0.35)',
          borderRadius: '4px',
          background: 'rgba(255,64,64,0.07)',
          color: '#ff8a8a',
          fontSize: '11px',
        }} role="alert">{error}</div>
      )}

      {workspaces === null ? (
        <div className="card"><div className="description" style={{ margin: 0 }}>Loading workspaces…</div></div>
      ) : (
        <>
          {workspaces.length > 0 && (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', marginBottom: '18px' }}>
              {workspaces.map((ws) => (
                <div
                  key={ws.id}
                  className="card"
                  role="button"
                  tabIndex={0}
                  onClick={() => enter(ws)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') enter(ws) }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-head">
                    <div className="name">
                      <span className="dot purple" />
                      {ws.name}
                    </div>
                    {ws.role && <span className="badge">{ws.role}</span>}
                  </div>
                  <div className="description">
                    Created {new Date(ws.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card" style={{ maxWidth: '420px' }}>
            <div className="card-head">
              <div className="name">Create workspace</div>
            </div>
            <div className="description">
              A workspace holds your projects, tasks and bugs.
            </div>
            <form onSubmit={handleCreate} noValidate>
              <input
                type="text"
                className="search"
                style={{ width: '100%', height: '32px', marginBottom: '10px' }}
                placeholder="Workspace name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus={workspaces.length === 0}
              />
              <button type="submit" className="btn primary" disabled={loading}>
                {loading ? 'Creating…' : '+ Create workspace'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
