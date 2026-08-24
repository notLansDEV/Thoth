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
import { ArrowLeft, Settings, UserPlus, Users, Eye, Trash2, Pencil, Check, X } from 'lucide-react'
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
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState(null)

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

  async function handleCreate(nameValue) {
    const workspace = await createWorkspace(nameValue)
    enter(workspace)
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

  // Full-screen workspace detail view (opened via the preview button)
  if (preview) {
    return (
      <div>
        {/* Workspace navbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          borderBottom: '1px solid #292929', paddingBottom: '12px', marginBottom: '16px',
        }}>
          <button className="btn" onClick={() => { setPreview(null); setPanel(null); setPanelError(null) }} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <ArrowLeft size={12} /> Back
          </button>
          <span className="dot purple" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f1f1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {preview.name}
              {current?.id === preview.id && <span className="badge paused" style={{ fontSize: '9px', marginLeft: '7px' }}>current</span>}
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>/{preview.slug} · {members.length} member{members.length === 1 ? '' : 's'}</div>
          </div>
          <button
            className={`btn${panel === 'settings' ? ' primary' : ''}`}
            onClick={() => setPanel(panel === 'settings' ? null : 'settings')}
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          ><Settings size={12} /> Settings</button>
          <button
            className={`btn${panel === 'invite' ? ' primary' : ''}`}
            onClick={() => setPanel(panel === 'invite' ? null : 'invite')}
            style={{ cursor: 'pointer' }}
          ><UserPlus size={12} /> Invite members</button>
        </div>

        <div>
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
                          <button className="icon-btn" title="Save role" onClick={handleRoleSave}><Check size={12} /></button>
                          <button className="icon-btn" title="Cancel" onClick={() => setEditingRole(null)}><X size={12} /></button>
                        </span>
                      ) : (
                        <span style={{ display: 'flex', gap: '4px' }}>
                          <button
                            className="icon-btn"
                            title="Edit role"
                            onClick={() => setEditingRole({ userId: m.id, role: m.role || 'member' })}
                          ><Pencil size={12} /></button>
                          <button
                            className="icon-btn"
                            title="Remove member"
                            style={{ color: '#ff6b6b' }}
                            onClick={() => setConfirmDeleteMember(m)}
                          ><Trash2 size={12} /></button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
        <button
          onClick={() => setShowCreate(true)}
          className="btn primary"
          style={{ cursor: 'pointer' }}
        >
          + Create Workspace
        </button>
      </div>

      {error && (
        <div style={{
          marginBottom: '14px', padding: '9px 12px', border: '1px solid rgba(255,64,64,0.35)',
          borderRadius: '4px', background: 'rgba(255,64,64,0.07)', color: '#ff8a8a', fontSize: '11px',
        }} role="alert">{error}</div>
      )}

      {workspaces === null ? (
        <div className="card"><div className="description" style={{ margin: 0 }}>Loading workspaces…</div></div>
      ) : workspaces.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#777' }}>
          <div style={{ fontSize: '14px', marginBottom: '12px' }}>No workspaces yet</div>
          <div style={{ fontSize: '12px', color: '#555' }}>Create your first workspace to get started</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', marginBottom: '18px' }}>
          {workspaces.map((ws) => (
            <div key={ws.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#eee', display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                <span className="dot purple" style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.name}</span>
                {current?.id === ws.id && <span className="badge paused" style={{ fontSize: '9px', flexShrink: 0 }}>current</span>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                <span className="badge paused" title="Members"><Users size={11} /> {ws.members_count ?? 1}</span>
                {ws.role && <span className="badge">{ws.role}</span>}
                <span style={{ fontSize: '10px', color: '#555' }}>
                  Created {new Date(ws.created_at).toLocaleDateString()}
                </span>
                <span style={{ flex: 1 }} />
                <button className="icon-btn" title="Preview workspace" onClick={() => openPreview(ws)}><Eye size={12} /></button>
                <button
                  className="icon-btn"
                  title="Delete workspace"
                  style={{ color: '#ff6b6b' }}
                  onClick={() => setConfirmDeleteWs(ws)}
                ><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateWorkspaceModal
          onCreate={handleCreate}
          onClose={() => setShowCreate(false)}
        />
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

function CreateWorkspaceModal({ onCreate, onClose }) {
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter a workspace name.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await onCreate(name.trim())
    } catch (err) {
      setError(err.message || 'Could not create workspace')
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#151515', border: '1px solid #292929', borderRadius: '6px',
        padding: '24px', width: '100%', maxWidth: '440px', maxHeight: '90vh',
        overflowY: 'auto', boxShadow: '0 20px 25px rgba(0,0,0,0.3)',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700' }}>New Workspace</h2>
          <p style={{ margin: 0, color: '#777', fontSize: '12px' }}>
            A workspace holds your projects, tasks and bugs
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div style={{
              marginBottom: '14px', padding: '8px 11px',
              border: '1px solid rgba(255,64,64,0.35)', borderRadius: '4px',
              background: 'rgba(255,64,64,0.07)', color: '#ff8a8a', fontSize: '11px',
            }} role="alert">{error}</div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block', marginBottom: '6px',
              fontSize: '12px', fontWeight: '600', color: '#ddd',
            }}>Workspace Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Game Dev"
              style={{
                width: '100%', padding: '8px 9px', border: '1px solid #2a2a2a',
                background: '#101010', color: '#ddd', borderRadius: '4px',
                fontSize: '12px', boxSizing: 'border-box', outline: 'none',
              }}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose} style={{ cursor: 'pointer' }}>Cancel</button>
            <button type="submit" className="btn primary" disabled={loading} style={{ cursor: 'pointer' }}>
              {loading ? 'Creating…' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
