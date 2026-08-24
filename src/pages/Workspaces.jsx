import { useEffect, useState } from 'react'
import {
  getWorkspaces,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  setCurrentWorkspace,
  getCurrentWorkspace,
  getMembers,
  addMember,
  updateMemberRole,
  removeMember,
} from '../features/workspaces/workspaces.service.js'
import ConfirmModal from '../components/ConfirmModal.jsx'

function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const ROLES = ['owner', 'admin', 'member']

const labelStyle = {
  display: 'block',
  marginBottom: '5px',
  fontSize: '10px',
  fontWeight: '700',
  color: '#777',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

export default function Workspaces() {
  const [workspaces, setWorkspaces] = useState(null)
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const [preview, setPreview] = useState(null)
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [panel, setPanel] = useState(null) // null | 'settings' | 'invite'
  const [wsName, setWsName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [panelError, setPanelError] = useState(null)
  const [savingPanel, setSavingPanel] = useState(false)
  const [editingRole, setEditingRole] = useState(null) // {userId, role}
  const [confirmDeleteWs, setConfirmDeleteWs] = useState(null)
  const [confirmDeleteMember, setConfirmDeleteMember] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const current = getCurrentWorkspace()

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

  async function openPreview(ws) {
    setPreview(ws)
    setWsName(ws.name)
    setPanel(null)
    setPanelError(null)
    setEditingRole(null)
    setMembersLoading(true)
    try {
      const rows = await getMembers(ws.id)
      setMembers(Array.isArray(rows) ? rows : [])
    } catch (err) {
      setPanelError(err.message || 'Could not load members')
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }

  async function refreshMembers(wsId) {
    const rows = await getMembers(wsId).catch(() => [])
    setMembers(Array.isArray(rows) ? rows : [])
    setWorkspaces((cur) => cur && cur.map((w) => (
      w.id === wsId ? { ...w, members_count: rows.length } : w
    )))
  }

  async function handleSaveName() {
    if (!preview || !wsName.trim()) return
    setSavingPanel(true)
    setPanelError(null)
    try {
      const updated = await updateWorkspace(preview.id, { name: wsName.trim() })
      setPreview((cur) => ({ ...cur, ...updated }))
      setWorkspaces((cur) => cur && cur.map((w) => (w.id === preview.id ? { ...w, ...updated } : w)))
      if (current?.id === preview.id) setCurrentWorkspace({ ...current, ...updated })
      setPanel(null)
    } catch (err) {
      setPanelError(err.message || 'Could not save workspace name')
    } finally {
      setSavingPanel(false)
    }
  }

  async function handleInvite(e) {
    e.preventDefault()
    if (!preview || !inviteEmail.trim()) return
    setSavingPanel(true)
    setPanelError(null)
    try {
      await addMember(preview.id, inviteEmail.trim())
      setInviteEmail('')
      setPanel(null)
      await refreshMembers(preview.id)
    } catch (err) {
      setPanelError(err.message || 'Could not add member')
    } finally {
      setSavingPanel(false)
    }
  }

  async function handleRoleSave() {
    if (!editingRole || !preview) return
    setSavingPanel(true)
    setPanelError(null)
    try {
      await updateMemberRole(preview.id, editingRole.userId, editingRole.role)
      setEditingRole(null)
      await refreshMembers(preview.id)
    } catch (err) {
      setPanelError(err.message || 'Could not update role')
    } finally {
      setSavingPanel(false)
    }
  }

  async function handleDeleteWs() {
    if (!confirmDeleteWs) return
    setDeleting(true)
    try {
      await deleteWorkspace(confirmDeleteWs.id)
      if (current?.id === confirmDeleteWs.id) setCurrentWorkspace(null)
      setConfirmDeleteWs(null)
      setPreview(null)
      const rows = await getWorkspaces()
      setWorkspaces(rows)
    } catch (err) {
      setError(err.message || 'Could not delete workspace')
      setConfirmDeleteWs(null)
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteMember() {
    if (!confirmDeleteMember || !preview) return
    setDeleting(true)
    try {
      await removeMember(preview.id, confirmDeleteMember.id)
      setConfirmDeleteMember(null)
      await refreshMembers(preview.id)
    } catch (err) {
      setPanelError(err.message || 'Could not remove member')
      setConfirmDeleteMember(null)
    } finally {
      setDeleting(false)
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
          marginBottom: '14px', padding: '9px 12px', border: '1px solid rgba(255,64,64,0.35)',
          borderRadius: '4px', background: 'rgba(255,64,64,0.07)', color: '#ff8a8a', fontSize: '11px',
        }} role="alert">{error}</div>
      )}

      {workspaces === null ? (
        <div className="card"><div className="description" style={{ margin: 0 }}>Loading workspaces…</div></div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
            {workspaces.map((ws) => (
              <div key={ws.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#eee', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span className="dot purple" />
                    {ws.name}
                    {current?.id === ws.id && <span className="badge paused" style={{ fontSize: '9px' }}>current</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>
                    Created {new Date(ws.created_at).toLocaleDateString()}
                  </div>
                </div>

                <span className="badge paused" title="Members">👥 {ws.members_count ?? 1}</span>
                {ws.role && <span className="badge">{ws.role}</span>}

                <div style={{ display: 'flex', gap: '5px' }}>
                  <button className="icon-btn" title="Preview workspace" onClick={() => openPreview(ws)}>👁</button>
                  <button
                    className="icon-btn"
                    title="Delete workspace"
                    style={{ color: '#ff6b6b' }}
                    onClick={() => setConfirmDeleteWs(ws)}
                  >🗑</button>
                </div>
              </div>
            ))}
          </div>

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

      {/* Workspace preview */}
      {preview && (
        <div onClick={() => setPreview(null)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1100,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: '#151515', border: '1px solid #292929', borderRadius: '6px',
            width: '100%', maxWidth: '720px', maxHeight: '86vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px rgba(0,0,0,0.4)', overflow: 'hidden',
          }}>
            {/* Workspace navbar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
              borderBottom: '1px solid #292929', background: '#111',
            }}>
              <span className="dot purple" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f1f1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {preview.name}
                </div>
                <div style={{ fontSize: '10px', color: '#666' }}>/{preview.slug} · {members.length} member{members.length === 1 ? '' : 's'}</div>
              </div>
              <button
                className={`btn${panel === 'settings' ? ' primary' : ''}`}
                onClick={() => setPanel(panel === 'settings' ? null : 'settings')}
                style={{ cursor: 'pointer' }}
              >⚙ Settings</button>
              <button
                className={`btn${panel === 'invite' ? ' primary' : ''}`}
                onClick={() => setPanel(panel === 'invite' ? null : 'invite')}
                style={{ cursor: 'pointer' }}
              >+ Invite members</button>
              <button className="icon-btn" title="Close" onClick={() => setPreview(null)}>✕</button>
            </div>

            <div style={{ padding: '14px 16px', overflowY: 'auto' }}>
              {panelError && (
                <div style={{
                  marginBottom: '12px', padding: '7px 10px', borderRadius: '4px',
                  border: '1px solid rgba(255,64,64,0.35)', background: 'rgba(255,64,64,0.07)',
                  color: '#ff8a8a', fontSize: '11px',
                }}>{panelError}</div>
              )}

              {panel === 'settings' && (
                <div className="card" style={{ marginBottom: '12px' }}>
                  <label style={labelStyle}>Workspace name</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={wsName}
                      onChange={(e) => setWsName(e.target.value)}
                      className="search"
                      style={{ flex: 1 }}
                      autoFocus
                    />
                    <button className="btn primary" onClick={handleSaveName} disabled={savingPanel} style={{ cursor: 'pointer' }}>
                      {savingPanel ? 'Saving…' : 'Save'}
                    </button>
                    <button className="btn" onClick={() => { setPanel(null); setWsName(preview.name) }} style={{ cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {panel === 'invite' && (
                <form className="card" style={{ marginBottom: '12px' }} onSubmit={handleInvite}>
                  <label style={labelStyle}>Invite by email</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="teammate@company.com"
                      className="search"
                      style={{ flex: 1 }}
                      autoFocus
                    />
                    <button type="submit" className="btn primary" disabled={savingPanel} style={{ cursor: 'pointer' }}>
                      {savingPanel ? 'Adding…' : 'Add member'}
                    </button>
                    <button type="button" className="btn" onClick={() => setPanel(null)} style={{ cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                  <div style={{ fontSize: '10px', color: '#555', marginTop: '6px' }}>
                    The user must already have a Thoth account.
                  </div>
                </form>
              )}

              {/* Members table */}
              <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Joined</th>
                      <th style={{ width: '70px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {membersLoading ? (
                      <tr><td colSpan={5} style={{ color: '#555' }}>Loading members…</td></tr>
                    ) : members.length === 0 ? (
                      <tr><td colSpan={5} style={{ color: '#555' }}>No members found.</td></tr>
                    ) : members.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <span className="avatar">{(m.full_name || m.username || '?').slice(0, 2).toUpperCase()}</span>
                            <span style={{ color: '#ddd', fontWeight: 600 }}>{m.full_name || m.username}</span>
                          </span>
                        </td>
                        <td>{m.email}</td>
                        <td>
                          {editingRole?.userId === m.id ? (
                            <select
                              value={editingRole.role}
                              onChange={(e) => setEditingRole({ userId: m.id, role: e.target.value })}
                              style={{ background: '#101010', border: '1px solid #2a2a2a', color: '#ddd', borderRadius: '4px', fontSize: '11px', padding: '3px 6px' }}
                            >
                              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                          ) : (
                            <span className="badge paused">{m.role}</span>
                          )}
                        </td>
                        <td>{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '—'}</td>
                        <td>
                          {editingRole?.userId === m.id ? (
                            <span style={{ display: 'flex', gap: '4px' }}>
                              <button className="icon-btn" title="Save role" onClick={handleRoleSave}>✓</button>
                              <button className="icon-btn" title="Cancel" onClick={() => setEditingRole(null)}>✕</button>
                            </span>
                          ) : (
                            <span style={{ display: 'flex', gap: '4px' }}>
                              <button
                                className="icon-btn"
                                title="Edit role"
                                onClick={() => setEditingRole({ userId: m.id, role: m.role || 'member' })}
                              >✎</button>
                              <button
                                className="icon-btn"
                                title="Remove member"
                                style={{ color: '#ff6b6b' }}
                                onClick={() => setConfirmDeleteMember(m)}
                              >🗑</button>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteWs && (
        <ConfirmModal
          title={`Delete workspace "${confirmDeleteWs.name}"?`}
          message="This permanently deletes the workspace."
          note="* All projects, tasks, bugs and stages inside will be deleted too. This cannot be undone."
          confirmLabel="Delete workspace"
          busy={deleting}
          onConfirm={handleDeleteWs}
          onCancel={() => setConfirmDeleteWs(null)}
        />
      )}

      {confirmDeleteMember && (
        <ConfirmModal
          title={`Remove ${confirmDeleteMember.full_name || confirmDeleteMember.username}?`}
          message="They will lose access to this workspace."
          note="* Their account is not deleted — they can be invited again later."
          confirmLabel="Remove"
          busy={deleting}
          onConfirm={handleDeleteMember}
          onCancel={() => setConfirmDeleteMember(null)}
        />
      )}
    </div>
  )
}
