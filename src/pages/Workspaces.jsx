import { useEffect, useState } from 'react'
import { toast } from 'sonner'
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
  normalizeGranularRolePerms,
  refreshMyProjectMemberships,
} from '../features/workspaces/workspaces.service.js'
import {
  getProjects,
  getWorkspaceProjectMemberships,
  setUserProjectMemberships,
} from '../features/projects/projects.service.js'
import { ArrowLeft, Settings, UserPlus, Users, Eye, Trash2, X, Search } from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal.jsx'

function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const labelStyle = {
  display: 'block',
  marginBottom: '5px',
  fontSize: '10px',
  fontWeight: '700',
  color: 'var(--muted)',
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
  const [panel, setPanel] = useState(null) // null | 'settings'
  const [wsName, setWsName] = useState('')
  const [panelError, setPanelError] = useState(null)
  const [savingPanel, setSavingPanel] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [availableUsers, setAvailableUsers] = useState([])
  const [availableUsersLoading, setAvailableUsersLoading] = useState(false)
  const [addMemberSearch, setAddMemberSearch] = useState('')
  const [addingMemberId, setAddingMemberId] = useState(null)
  const [editingRole, setEditingRole] = useState(null) // {userId, role}
  const [confirmDeleteWs, setConfirmDeleteWs] = useState(null)
  const [confirmDeleteMember, setConfirmDeleteMember] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const current = getCurrentWorkspace()

  // Project access provisioning (owner-managed)
  const [projects, setProjects] = useState([])
  const [userProjectMap, setUserProjectMap] = useState({})
  const [projAccessLoading, setProjAccessLoading] = useState(false)
  const [savingUserAccess, setSavingUserAccess] = useState(null)
  const [accessSearch, setAccessSearch] = useState('')
  const [accessProjectFilter, setAccessProjectFilter] = useState('all')
  const [accessRoleFilter, setAccessRoleFilter] = useState('all')
  const [accessVisibilityFilter, setAccessVisibilityFilter] = useState('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMemberId, setDrawerMemberId] = useState(null)
  const [drawerSearch, setDrawerSearch] = useState('')
  const [draftAssignments, setDraftAssignments] = useState([])
  const [draftWorkspaceRole, setDraftWorkspaceRole] = useState('member')

  useEffect(() => {
    let alive = true
    getWorkspaces()
      .then((rows) => { if (alive) setWorkspaces(rows) })
      .catch((err) => { if (alive) { setError(err.message); setWorkspaces([]) } })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!preview?.id) return undefined
    let alive = true
    const refreshPreviewAccess = async () => {
      try {
        const [memberRows, projRows, accessRows] = await Promise.all([
          getMembers(preview.id).catch(() => []),
          getProjects(preview.id).catch(() => []),
          preview.role === 'owner' ? getWorkspaceProjectMemberships(preview.id).catch(() => []) : Promise.resolve([]),
        ])
        if (!alive) return
        setMembers(Array.isArray(memberRows) ? memberRows : [])
        setProjects(Array.isArray(projRows) ? projRows : [])
        if (preview.role === 'owner') {
          const map = {}
          for (const r of (Array.isArray(accessRows) ? accessRows : [])) {
            const uid = String(r.user_id)
            if (!map[uid]) map[uid] = []
            map[uid].push({ project_id: r.project_id, role: normalizePermissionRole(r.project_role || r.role || 'member') })
          }
          setUserProjectMap(map)
        } else {
          setUserProjectMap({})
        }
      } catch {
        /* ignore background refresh errors */
      }
    }
    const onDataChanged = (e) => {
      const wsId = e?.detail?.workspaceId
      if (wsId && String(wsId) !== String(preview.id)) return
      refreshPreviewAccess()
    }
    const onFocus = () => refreshPreviewAccess()
    window.addEventListener('thoth:data-changed', onDataChanged)
    window.addEventListener('focus', onFocus)
    return () => {
      alive = false
      window.removeEventListener('thoth:data-changed', onDataChanged)
      window.removeEventListener('focus', onFocus)
    }
  }, [preview?.id, preview?.role])

  function enter(workspace) {
    setCurrentWorkspace(workspace)
    refreshMyProjectMemberships(workspace?.id).catch(() => {})
    navigate(`/${workspace.slug}/dashboard`)
  }

  async function handleCreate(nameValue) {
    const workspace = await createWorkspace(String(nameValue || '').trim().slice(0, 16))
    enter(workspace)
  }

  async function handleCreateDemo() {
    setError(null)
    try {
      const workspace = await createWorkspace('Demo Workspace')
      enter(workspace)
    } catch (err) {
      setError(err.message || 'Could not create demo workspace')
    }
  }

  async function openPreview(ws) {
    setWsName(ws.name)
    setPanel(null)
    setPanelError(null)
    setEditingRole(null)
    setDrawerOpen(false)
    setDrawerMemberId(null)
    setAccessSearch('')
    setAccessProjectFilter('all')
    setAccessRoleFilter('all')
    setAccessVisibilityFilter('all')
    setMembersLoading(true)
    try {
      // Refresh workspace data so settings (custom roles/permissions) are current
      let freshWs = ws
      try {
        const all = await getWorkspaces()
        if (Array.isArray(all)) {
          setWorkspaces(all)
          freshWs = all.find(w => String(w.id) === String(ws.id)) || ws
        }
      } catch { /* ignore workspace refresh errors */ }
      setPreview(freshWs)
      const rows = await getMembers(freshWs.id)
      const arr = Array.isArray(rows) ? rows : []
      setMembers(arr)
      await loadProjectAccessData(freshWs.id, freshWs.role === 'owner')
    } catch (err) {
      setPreview(ws)
      setPanelError(err.message || 'Could not load members')
      setMembers([])
      setProjects([])
      setUserProjectMap({})
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
    const nextName = wsName.trim().slice(0, 16)
    if (!preview || !nextName) return
    setSavingPanel(true)
    setPanelError(null)
    try {
      const updated = await updateWorkspace(preview.id, { name: nextName })
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

  async function loadAvailableUsers(search = '') {
    if (!preview?.id) return
    setAvailableUsersLoading(true)
    try {
      const token = localStorage.getItem('token')
      const q = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''
      const res = await fetch(`/api/workspaces/${encodeURIComponent(preview.id)}/available-users${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => [])
      setAvailableUsers(Array.isArray(data) ? data : [])
    } catch {
      setAvailableUsers([])
    } finally {
      setAvailableUsersLoading(false)
    }
  }

  useEffect(() => {
    if (!showAddMemberModal || !preview?.id) return
    const t = setTimeout(() => { loadAvailableUsers(addMemberSearch) }, 200)
    return () => clearTimeout(t)
  }, [showAddMemberModal, addMemberSearch, preview?.id])

  async function handleAddMemberFromModal(user) {
    if (!preview?.id || !user?.email) return
    setAddingMemberId(user.id)
    setPanelError(null)
    try {
      await addMember(preview.id, user.email)
      await refreshMembers(preview.id)
      await loadAvailableUsers(addMemberSearch)
    } catch (err) {
      setPanelError(err.message || 'Could not add member')
    } finally {
      setAddingMemberId(null)
    }
  }

  async function _handleRoleSave() {
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
      if (current?.id === confirmDeleteWs.id) {
        setCurrentWorkspace(null)
        refreshMyProjectMemberships(null).catch(() => {})
      }
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

  function clone(obj) { return JSON.parse(JSON.stringify(obj)) }

  async function loadProjectAccessData(wsId, isOwnerWs) {
    setProjAccessLoading(true)
    try {
      const projRows = await getProjects(wsId)
      setProjects(Array.isArray(projRows) ? projRows : [])
      if (isOwnerWs) {
        try {
          const rows = await getWorkspaceProjectMemberships(wsId)
          const map = {}
          for (const r of (Array.isArray(rows) ? rows : [])) {
            const uid = String(r.user_id)
            if (!map[uid]) map[uid] = []
            map[uid].push({ project_id: r.project_id, role: normalizePermissionRole(r.project_role || r.role || 'member') })
          }
          setUserProjectMap(map)
        } catch {
          setUserProjectMap({})
        }
      } else {
        setUserProjectMap({})
      }
    } catch {
      setProjects([])
      setUserProjectMap({})
    } finally {
      setProjAccessLoading(false)
    }
  }

  function getUserAssignments(userId) {
    const rows = userProjectMap[String(userId)] || []
    return rows.map((a) => ({ ...a, project_id: a.project_id || a.id, role: a.role || a.project_role || 'member' }))
  }

  function getAvailablePermissionRoles() {
    const perms = normalizeGranularRolePerms(preview?.settings?.rolePermissions)
    const roles = Object.keys(perms || {}).filter(k => !k.startsWith('_') && k !== 'owner')
    const order = ['admin', 'member']
    roles.sort((a, b) => {
      const ai = order.indexOf(a), bi = order.indexOf(b)
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      return a.localeCompare(b)
    })
    return roles.length ? roles : ['member']
  }

  function formatRoleLabel(role) {
    const r = String(role || 'member')
    return r.charAt(0).toUpperCase() + r.slice(1)
  }

  function normalizePermissionRole(role, availableRoles = getAvailablePermissionRoles()) {
    const r = String(role || '').toLowerCase()
    if (availableRoles.includes(r)) return r
    if (r === 'manager' && availableRoles.includes('admin')) return 'admin'
    if (availableRoles.includes('member')) return 'member'
    return availableRoles[0] || 'member'
  }

  function defaultPermissionRoleForMember(member) {
    return normalizePermissionRole(member?.role || 'member')
  }

  function getVisibilityScope(member, assignmentCount, totalProjects = null) {
    const total = totalProjects != null ? totalProjects : (projects || []).filter(p => !preview?.id || !p?.workspace_id || String(p.workspace_id) === String(preview.id)).length
    if (member.role === 'owner') return { label: 'All Visible', type: 'all', sub: 'Universal Workspace Scope' }
    if (assignmentCount === 0) return { label: 'Pending Setup', type: 'pending', sub: `0 of ${total} projects` }
    if (total > 0 && assignmentCount === total) return { label: 'All Visible', type: 'all', sub: `${assignmentCount} of ${total} projects visible` }
    return { label: 'Custom Restricted', type: 'custom', sub: `${assignmentCount} of ${total} projects visible` }
  }

  function _memberProjectPermissionRole(member) {
    return defaultPermissionRoleForMember(member)
  }

  function openAccessDrawer(memberId) {
    if (!preview || preview.role !== 'owner') return
    const member = members.find(m => String(m.id) === String(memberId))
    if (!member || member.role === 'owner') return
    const availableRoles = getAvailablePermissionRoles()
    setDrawerMemberId(String(memberId))
    setDraftWorkspaceRole(normalizePermissionRole(member.role, availableRoles))
    setDraftAssignments(clone(getUserAssignments(memberId)).map(a => ({ ...a, role: normalizePermissionRole(a.role, availableRoles) })))
    setDrawerSearch('')
    setDrawerOpen(true)
  }

  function closeAccessDrawer() {
    if (savingUserAccess) return
    setDrawerOpen(false)
    setDrawerMemberId(null)
    setDraftAssignments([])
    setDrawerSearch('')
    setDraftWorkspaceRole('member')
  }

  function toggleDraftProject(projectId, checked) {
    setDraftAssignments(cur => {
      if (checked) {
        if (cur.some(a => String(a.project_id) === String(projectId))) return cur
        const member = members.find(m => String(m.id) === String(drawerMemberId))
        return [...cur, { project_id: projectId, role: defaultPermissionRoleForMember(member) }]
      }
      return cur.filter(a => String(a.project_id) !== String(projectId))
    })
  }

  function setDraftProjectRole(projectId, role) {
    const nextRole = normalizePermissionRole(role)
    setDraftAssignments(cur => cur.map(a => String(a.project_id) === String(projectId) ? { ...a, role: nextRole } : a))
  }

  function bulkDraftSelect(all) {
    const wsProjects = (projects || []).filter(p => !preview?.id || !p?.workspace_id || String(p.workspace_id) === String(preview.id))
    const member = members.find(m => String(m.id) === String(drawerMemberId))
    const role = defaultPermissionRoleForMember(member)
    if (all) {
      setDraftAssignments(wsProjects.map(p => {
        const ex = draftAssignments.find(a => String(a.project_id) === String(p.id))
        return { project_id: p.id, role: ex ? normalizePermissionRole(ex.role) : role }
      }))
    } else {
      setDraftAssignments([])
    }
  }

  async function saveDrawerChanges() {
    if (!preview || preview.role !== 'owner' || !drawerMemberId) return
    const uid = String(drawerMemberId)
    const member = members.find(m => String(m.id) === uid)
    setSavingUserAccess(uid)
    try {
      const next = clone(draftAssignments)
      const nextWorkspaceRole = normalizePermissionRole(draftWorkspaceRole)
      if (member && member.role !== 'owner' && member.role !== nextWorkspaceRole) {
        await updateMemberRole(preview.id, uid, nextWorkspaceRole)
        setMembers(cur => (cur || []).map(m => String(m.id) === uid ? { ...m, role: nextWorkspaceRole } : m))
      }
      const saved = await setUserProjectMemberships(preview.id, uid, next)
      setUserProjectMap(cur => ({ ...cur, [uid]: Array.isArray(saved) ? saved : next }))
      setPanelError(null)
      window.dispatchEvent(new CustomEvent('thoth:data-changed', { detail: { type: 'project-access', workspaceId: preview.id, userId: uid } }))
      toast.success('Access updated')
      setDrawerOpen(false)
      setDrawerMemberId(null)
      setDraftAssignments([])
      setDrawerSearch('')
      setDraftWorkspaceRole('member')
    } catch (err) {
      const msg = err?.message || 'Could not update project access'
      setPanelError(msg)
      toast.error(msg)
    } finally {
      setSavingUserAccess(null)
    }
  }


  // Full-screen workspace detail view (opened via the preview button)
  if (preview) {
    return (
      <div>
        {/* Workspace navbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px',
        }}>
          <button className="btn" onClick={() => { setPreview(null); setPanel(null); setPanelError(null) }} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <ArrowLeft size={12} /> Back
          </button>
          <span className="dot purple" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {preview.name}
              {current?.id === preview.id && <span className="badge paused" style={{ fontSize: '9px', marginLeft: '7px' }}>current</span>}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--muted2)' }}>/{preview.slug} · {members.length} member{members.length === 1 ? '' : 's'}</div>
          </div>
          <button
            className={`btn${panel === 'settings' ? ' primary' : ''}`}
            onClick={() => setPanel(panel === 'settings' ? null : 'settings')}
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          ><Settings size={12} /> Settings</button>
          <button
            className="btn"
            onClick={() => { setAddMemberSearch(''); setShowAddMemberModal(true) }}
            style={{ cursor: 'pointer', height: '30px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    value={wsName}
                    maxLength={16}
                    onChange={(e) => setWsName(e.target.value.slice(0, 16))}
                    className="search"
                    style={{ width: '100%' }}
                    autoFocus
                  />
                  <div style={{ marginTop: 4, fontSize: 11, color: 'var(--muted2)', textAlign: 'right' }}>{wsName.length}/16</div>
                </div>
                <button className="btn primary" onClick={handleSaveName} disabled={savingPanel} style={{ cursor: 'pointer', alignSelf: 'flex-start' }}>
                  {savingPanel ? 'Saving…' : 'Save'}
                </button>
                <button className="btn" onClick={() => { setPanel(null); setWsName(preview.name) }} style={{ cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}


          {/* Members & Project Access Provisioning */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {(() => {
              const q = (accessSearch || '').trim().toLowerCase()
              const workspaceProjects = (projects || []).filter(p => !preview?.id || !p?.workspace_id || String(p.workspace_id) === String(preview.id))
              const memberRows = (members || []).filter((m) => {
                if (m.role === 'owner') return false
                const assignments = getUserAssignments(m.id)
                const projNames = assignments.map(a => (workspaceProjects.find(p => String(p.id) === String(a.project_id))?.name || '').toLowerCase()).join(' ')
                const matchesSearch = !q || (m.full_name || '').toLowerCase().includes(q) || (m.username || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q) || projNames.includes(q)
                const matchesProject = accessProjectFilter === 'all' || m.role === 'owner' || assignments.some(a => String(a.project_id) === String(accessProjectFilter))
                const wsRoleLabel = m.role === 'owner' ? 'Workspace Owner' : m.role === 'admin' ? 'Admin' : 'Member'
                const matchesRole = accessRoleFilter === 'all' || wsRoleLabel === accessRoleFilter
                const scope = getVisibilityScope(m, m.role === 'owner' ? workspaceProjects.length : assignments.length, workspaceProjects.length)
                const matchesVis = accessVisibilityFilter === 'all' || scope.label === accessVisibilityFilter
                return matchesSearch && matchesProject && matchesRole && matchesVis
              })

              const drawerMember = members.find(m => String(m.id) === String(drawerMemberId))
              const filteredDrawerProjects = workspaceProjects.filter(p => {
                const dq = (drawerSearch || '').trim().toLowerCase()
                if (!dq) return true
                return (p.name || '').toLowerCase().includes(dq) || (p.description || '').toLowerCase().includes(dq)
              })

              const initials = (m) => (m.full_name || m.username || m.email || '?').split(/[\s._-]+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase() || '?'
              const wsRoleBadge = (role) => {
                if (role === 'owner') return { label: 'Workspace Owner', bg: 'rgba(32,217,107,0.12)', color: '#20d96b', border: 'rgba(32,217,107,0.3)' }
                if (role === 'admin') return { label: 'Admin', bg: 'rgba(110,97,255,0.14)', color: '#a89cff', border: 'rgba(110,97,255,0.35)' }
                return { label: 'Member', bg: 'var(--panel2)', color: 'var(--text-soft)', border: 'var(--border)' }
              }
              const scopeStyle = (type) => {
                if (type === 'all') return { color: '#20d96b', dot: '#20d96b' }
                if (type === 'strict') return { color: '#ff8a8a', dot: '#ff6b6b' }
                if (type === 'pending') return { color: 'var(--muted)', dot: 'var(--muted2)' }
                return { color: '#a89cff', dot: '#6e61ff' }
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <style>{`
                    .wpt-th{background:var(--panel3);padding:10px 14px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2);border-bottom:1px solid var(--border);white-space:nowrap;text-align:left}
                    .wpt-td{padding:12px 14px;vertical-align:middle;font-size:12.5px;border-bottom:1px solid var(--border-soft);color:var(--text-soft)}
                    .wpt-row:hover{background:var(--panel2)}
                    .wpt-input{padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--panel3);color:var(--text-soft);outline:none}
                    .wpt-input:focus{border-color:var(--hover-border)}
                    .wpt-select{padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--panel3);color:var(--text-soft);outline:none}
                    .wpt-chip{display:inline-flex;align-items:center;gap:6px;background:var(--panel2);border:1px solid var(--border);padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;color:var(--text-soft)}
                    .wpt-role-tag{font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;background:var(--panel3);color:var(--text-soft);border:1px solid var(--border)}
                    .wpt-role-tag.lead{background:rgba(110,97,255,.22);color:#c3bcff;border-color:rgba(110,97,255,.35)}
                    .wpt-role-tag.editor{background:rgba(110,97,255,.12);color:#a89cff;border-color:rgba(110,97,255,.25)}
                    .wpt-manage{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:6px;font-size:11.5px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:var(--panel2);color:var(--text-soft)}
                    .wpt-manage:hover{background:var(--hover);border-color:var(--hover-border);color:var(--text-strong)}
                    .wpt-drawer-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(1px);z-index:120}
                    .wpt-drawer{position:fixed;top:0;right:0;width:100%;max-width:460px;height:100vh;background:var(--panel);border-left:1px solid var(--border);box-shadow:-12px 0 30px rgba(0,0,0,.35);z-index:130;display:flex;flex-direction:column}
                    .wpt-cb{appearance:none;-webkit-appearance:none;width:16px;height:16px;border:1.5px solid var(--border);border-radius:4px;outline:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;background:var(--panel2);flex-shrink:0}
                    .wpt-cb:checked{background:#6e61ff;border-color:#6e61ff}
                    .wpt-cb:checked::after{content:"";width:4px;height:8px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg);margin-bottom:1px}
                  `}</style>

                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap:'wrap', alignItems:'center', gap:8 }}>
                    <div style={{ position: 'relative', width: 240 }}>
                      <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted2)', pointerEvents: 'none' }} />
                      <input className="wpt-input" type="text" placeholder="Filter by name, email or project..." value={accessSearch} onChange={(e)=>setAccessSearch(e.target.value)} style={{ width: '100%', paddingLeft: 30 }} />
                    </div>
                    <select className="wpt-select" value={accessProjectFilter} onChange={(e)=>setAccessProjectFilter(e.target.value)}>
                      <option value="all">All Projects</option>
                      {workspaceProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select className="wpt-select" value={accessRoleFilter} onChange={(e)=>setAccessRoleFilter(e.target.value)}>
                      <option value="all">All Roles</option>
                      <option value="Admin">Admin</option>
                      <option value="Member">Member</option>
                    </select>
                    <select className="wpt-select" value={accessVisibilityFilter} onChange={(e)=>setAccessVisibilityFilter(e.target.value)}>
                      <option value="all">Any Status</option>
                      <option value="All Visible">All Visible</option>
                      <option value="Custom Restricted">Custom Restricted</option>
                      <option value="Strict Boundary">Strict Boundary</option>
                      <option value="Pending Setup">Pending Setup</option>
                    </select>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>Showing {memberRows.length} of {(members || []).length} members</span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr>
                          <th className="wpt-th">Workspace Member</th>
                          <th className="wpt-th">Visible Projects & Scoped Roles</th>
                          <th className="wpt-th">Visibility Scope</th>
                          <th className="wpt-th" style={{ textAlign:'right' }}>Access Controls</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(membersLoading || projAccessLoading) ? (
                          <tr><td className="wpt-td" colSpan={4} style={{ color:'var(--muted2)', padding: 20 }}>Loading members…</td></tr>
                        ) : memberRows.length === 0 ? (
                          <tr><td className="wpt-td" colSpan={4} style={{ color:'var(--muted2)', padding: 24, textAlign:'center' }}>No workspace members match the selected filters.</td></tr>
                        ) : memberRows.map((m) => {
                          const uid = String(m.id)
                          const assignments = getUserAssignments(uid)
                          const isOwnerMember = m.role === 'owner'
                          const badge = wsRoleBadge(m.role)
                          const scope = getVisibilityScope(m, isOwnerMember ? projects.length : assignments.length)
                          const sc = scopeStyle(scope.type)
                          const canManageAccess = preview.role === 'owner' && !isOwnerMember
                          const visibleAssignments = isOwnerMember ? [] : assignments.slice(0,3)
                          const extra = !isOwnerMember ? Math.max(0, assignments.length - 3) : 0
                          const _editingWsRole = editingRole?.userId === m.id
                          return (
                            <tr key={uid} className="wpt-row">
                              <td className="wpt-td" style={{ minWidth: 260 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                  <span className="avatar" style={{ width:34, height:34, fontSize:11 }}>{initials(m)}</span>
                                  <div style={{ minWidth:0, display:'flex', flexDirection:'column', gap:2 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                                      <span style={{ fontWeight:700, fontSize:13, color:'var(--text-strong)' }}>{m.full_name || m.username || m.email}</span>
                                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:5, background:badge.bg, color:badge.color, border:`1px solid ${badge.border}` }}>{badge.label}</span>
                                    </div>
                                    <span style={{ fontSize:11, color:'var(--muted)' }}>{m.email}</span>
                                    <div style={{ fontSize:10, color:'var(--muted2)', marginTop:2 }}>Joined {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '—'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="wpt-td" style={{ minWidth: 340 }}>
                                {isOwnerMember ? (
                                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                                    <span style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(32,217,107,.1)', color:'#20d96b', border:'1px solid rgba(32,217,107,.25)', padding:'4px 9px', borderRadius:6, fontSize:11, fontWeight:700 }}>∞ Universal Project Access ({workspaceProjects.length}/{workspaceProjects.length})</span>
                                    <span style={{ fontSize:11, color:'var(--muted)' }}>Inherited via Owner Role</span>
                                  </div>
                                ) : assignments.length === 0 ? (
                                  <div style={{ display:'flex', alignItems:'center', gap:8, color:'var(--muted)' }}>
                                    <span style={{ fontStyle:'italic', fontSize:12 }}>No projects assigned yet</span>
                                    {canManageAccess && <button type="button" className="wpt-chip" style={{ cursor:'pointer', color:'#a89cff' }} onClick={() => openAccessDrawer(uid)}>+ Assign Projects</button>}
                                  </div>
                                ) : (
                                  <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:6 }}>
                                    {visibleAssignments.map((a) => {
                                      const proj = workspaceProjects.find(p => String(p.id) === String(a.project_id)) || projects.find(p => String(p.id) === String(a.project_id))
                                      if (!proj) return null
                                      const roleVal = normalizePermissionRole(a.role)
                                      const tagCls = roleVal === 'admin' ? 'lead' : ''
                                      return (
                                        <span key={String(a.project_id)} className="wpt-chip">
                                          {proj.name}
                                          <span className={`wpt-role-tag ${tagCls}`}>{formatRoleLabel(roleVal)}</span>
                                        </span>
                                      )
                                    })}
                                    {extra > 0 && <button type="button" className="wpt-chip" style={{ cursor: canManageAccess ? 'pointer':'default', color:'#a89cff', background:'rgba(110,97,255,.1)', borderColor:'rgba(110,97,255,.25)' }} onClick={() => canManageAccess && openAccessDrawer(uid)}>+{extra} more</button>}
                                    {canManageAccess && <button type="button" className="wpt-chip" style={{ cursor:'pointer', width:24, height:24, padding:0, justifyContent:'center' }} title="Manage project access" onClick={() => openAccessDrawer(uid)}>+</button>}
                                  </div>
                                )}
                              </td>
                              <td className="wpt-td" style={{ minWidth: 170 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, color:sc.color, marginBottom:2 }}>
                                  <span style={{ width:7, height:7, borderRadius:'50%', background:sc.dot, display:'inline-block' }} />
                                  <span>{scope.label}</span>
                                </div>
                                <div style={{ fontSize:11, color:'var(--muted)' }}>{scope.sub}</div>
                              </td>
                              <td className="wpt-td" style={{ textAlign:'right', whiteSpace:'nowrap' }}>
                                <div style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                                  {canManageAccess ? (
                                    <button type="button" className="wpt-manage" onClick={() => openAccessDrawer(uid)}>⇄ Manage Access</button>
                                  ) : isOwnerMember ? (
                                    <span style={{ fontSize:11.5, fontStyle:'italic', color:'var(--muted)' }}>Owner Immutable</span>
                                  ) : null}
                                  <button className="icon-btn" title="Remove member" style={{ color: '#ff6b6b' }} onClick={() => setConfirmDeleteMember(m)}><Trash2 size={12} /></button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--panel2)', fontSize: 11, color: 'var(--muted)' }}>
                    {preview.role === 'owner' ? 'Manage each member’s project visibility and project-specific role via “Manage Access”.' : 'Project access and per-project roles are managed by the workspace owner.'}
                  </div>

                  {drawerOpen && drawerMember && (
                    <>
                      <div className="wpt-drawer-backdrop" onClick={closeAccessDrawer} />
                      <aside className="wpt-drawer" aria-hidden="false">
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid var(--border)', background:'var(--panel3)' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, fontWeight:800, letterSpacing:'.05em', textTransform:'uppercase', color:'#a89cff' }}>
                            <span style={{ width:24, height:24, borderRadius:6, background:'#6e61ff', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>🛡</span>
                            <span>Access Inspector & Provisioning</span>
                          </div>
                          <button type="button" className="icon-btn" onClick={closeAccessDrawer} title="Close panel"><X size={14} /></button>
                        </div>

                        <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:14 }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, background:'var(--panel2)', border:'1px solid var(--border)', borderRadius:8, padding:12 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <span className="avatar" style={{ width:40, height:40, fontSize:13 }}>{initials(drawerMember)}</span>
                              <div>
                                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-strong)' }}>{drawerMember.full_name || drawerMember.username || drawerMember.email}</div>
                                <div style={{ fontSize:11, color:'var(--muted)' }}>{drawerMember.email} · {formatRoleLabel(drawerMember.role)}</div>
                              </div>
                            </div>
                            <span style={{ fontSize:10.5, fontWeight:700, padding:'4px 8px', borderRadius:6, background:'rgba(110,97,255,.14)', color:'#a89cff', border:'1px solid rgba(110,97,255,.3)' }}>Manage Access</span>
                          </div>

                          <div style={{ background:'var(--panel2)', border:'1px solid var(--border)', borderRadius:8, padding:12, display:'flex', flexDirection:'column', gap:8 }}>
                            <div>
                              <div style={{ fontSize:13, fontWeight:700, color:'var(--text-strong)', marginBottom:3 }}>Workspace Role (Modules & Permissions)</div>
                              <div style={{ fontSize:11.5, color:'var(--muted)' }}>Controls which modules this user can see/use in the workspace based on Roles & Permissions settings.</div>
                            </div>
                            <select
                              className="wpt-select"
                              value={normalizePermissionRole(draftWorkspaceRole)}
                              onChange={(e) => setDraftWorkspaceRole(normalizePermissionRole(e.target.value))}
                              style={{ maxWidth: 260 }}
                            >
                              {getAvailablePermissionRoles().map(r => <option key={r} value={r}>{formatRoleLabel(r)}</option>)}
                            </select>
                          </div>

                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-strong)', marginBottom:3 }}>Project Visibility & Role Assignment</div>
                            <div style={{ fontSize:11.5, color:'var(--muted)' }}>Select which projects this user can access and assign a role for each project. Available roles come from Roles & Permissions in Settings.</div>
                          </div>

                          <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted2)', pointerEvents: 'none' }} />
                            <input className="wpt-input" type="text" placeholder={`Search from ${workspaceProjects.length} workspace projects...`} value={drawerSearch} onChange={(e)=>setDrawerSearch(e.target.value)} style={{ width: '100%', paddingLeft: 30 }} />
                          </div>

                          <div style={{ background:'rgba(110,97,255,.08)', border:'1px solid rgba(110,97,255,.22)', borderRadius:6, padding:'10px 12px', fontSize:11.5, color:'var(--text-soft)', lineHeight:1.45 }}>
                            <strong>Access rule:</strong> Assign projects explicitly to control visibility/access per user. Select a role from Roles & Permissions for each project assignment.
                          </div>

                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:10.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--muted2)' }}>
                            <span>Available Projects ({workspaceProjects.length})</span>
                            <div style={{ display:'flex', gap:8 }}>
                              <button type="button" style={{ background:'none', border:'none', color:'#a89cff', fontSize:11, fontWeight:600, cursor:'pointer' }} onClick={() => bulkDraftSelect(true)}>select all</button>
                              <button type="button" style={{ background:'none', border:'none', color:'#a89cff', fontSize:11, fontWeight:600, cursor:'pointer' }} onClick={() => bulkDraftSelect(false)}>clear all</button>
                            </div>
                          </div>

                          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                            {filteredDrawerProjects.length === 0 ? (
                              <div style={{ fontSize:12, color:'var(--muted2)', padding:'8px 0' }}>No projects match this search.</div>
                            ) : filteredDrawerProjects.map((proj) => {
                              const assignment = draftAssignments.find(a => String(a.project_id) === String(proj.id))
                              const checked = !!assignment
                              const availableRoles = getAvailablePermissionRoles()
                              const role = normalizePermissionRole(assignment?.role || defaultPermissionRoleForMember(drawerMember), availableRoles)
                              return (
                                <div key={proj.id} style={{ border:`1px solid ${checked ? 'rgba(110,97,255,.35)' : 'var(--border)'}`, borderRadius:8, padding:'10px 12px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, background: checked ? 'rgba(110,97,255,.06)' : 'var(--panel2)' }}>
                                  <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer', minWidth:0, flex:1 }}>
                                    <input type="checkbox" className="wpt-cb" checked={checked} onChange={(e)=>toggleDraftProject(proj.id, e.target.checked)} style={{ marginTop:2 }} />
                                    <div style={{ minWidth:0 }}>
                                      <div style={{ fontSize:13, fontWeight:700, color:'var(--text-strong)', marginBottom:2 }}>{proj.name}</div>
                                      <div style={{ fontSize:11, color:'var(--muted)' }}>{proj.status || 'active'}{proj.priority ? ` · ${proj.priority} priority` : ''}</div>
                                      <div style={{ fontSize:10.5, color: checked ? '#20d96b' : 'var(--muted2)', marginTop:4 }}>{checked ? `✓ Access granted as ${formatRoleLabel(role)} (permissions from Roles & Permissions)` : 'No access currently granted'}</div>
                                    </div>
                                  </label>
                                  <select className="wpt-select" value={role} disabled={!checked} onChange={(e)=>setDraftProjectRole(proj.id, e.target.value)} style={{ minWidth: 130, opacity: checked ? 1 : 0.6 }} title={checked ? 'Select a role from Roles & Permissions' : 'Enable access to assign role'}>
                                    {availableRoles.map(r => <option key={r} value={r}>{formatRoleLabel(r)}</option>)}
                                  </select>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', background:'var(--panel3)', display:'flex', justifyContent:'flex-end', gap:8 }}>
                          <button type="button" className="btn" onClick={closeAccessDrawer} disabled={!!savingUserAccess}>Cancel</button>
                          <button type="button" className="btn primary" onClick={saveDrawerChanges} disabled={!!savingUserAccess}>{savingUserAccess ? 'Saving…' : 'Apply & Save Access'}</button>
                        </div>
                      </aside>
                    </>
                  )}
                </div>
              )
            })()}
          </div>
        </div>

        {showAddMemberModal && (
          <div
            onClick={() => setShowAddMemberModal(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 560, maxHeight: 'min(80vh,720px)', overflow: 'hidden', background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 20px 40px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 14px', borderBottom: '1px solid var(--border)', gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-strong)' }}>Add Member</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>Select a user to add to this workspace.</p>
                </div>
                <button type="button" className="icon-btn" onClick={() => setShowAddMemberModal(false)} title="Close"><X size={14} /></button>
              </div>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted2)', pointerEvents: 'none' }} />
                  <input
                    className="search"
                    type="text"
                    value={addMemberSearch}
                    onChange={(e) => setAddMemberSearch(e.target.value)}
                    placeholder="Search users by name or email..."
                    style={{ width: '100%', paddingLeft: 32 }}
                    autoFocus
                  />
                </div>
              </div>
              <div style={{ padding: '8px 12px', overflowY: 'auto', flex: 1 }}>
                {availableUsersLoading ? (
                  <div style={{ padding: 16, fontSize: 12, color: 'var(--muted)' }}>Loading users…</div>
                ) : availableUsers.length === 0 ? (
                  <div style={{ padding: 16, fontSize: 12, color: 'var(--muted)' }}>No available users found.</div>
                ) : availableUsers.map((u) => {
                  const busy = String(addingMemberId) === String(u.id)
                  const name = u.full_name || u.username || 'User'
                  return (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}{u.username ? ` • @${u.username}` : ''}</div>
                      </div>
                      <button type="button" className="btn primary" disabled={busy} onClick={() => handleAddMemberFromModal(u)} style={{ flexShrink: 0, padding: '6px 10px', fontSize: 11 }}>
                        {busy ? 'Adding…' : 'Add'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
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
        {(Array.isArray(workspaces) && workspaces.length > 0) && (
          <button
            onClick={() => setShowCreate(true)}
            className="btn primary"
            style={{ cursor: 'pointer' }}
          >
            + Create Workspace
          </button>
        )}
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
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '8px' }}>No workspace yet</div>
          <div style={{ fontSize: '12px', color: 'var(--muted2)', marginBottom: '20px' }}>Create your first workspace to get started. You can also add a demo workspace.</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn primary" onClick={() => setShowCreate(true)} style={{ cursor: 'pointer' }}>Create Workspace</button>
            <button className="btn" onClick={handleCreateDemo} style={{ cursor: 'pointer' }}>Add Demo</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', marginBottom: '18px' }}>
          {workspaces.map((ws) => (
            <div key={ws.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-strong)', display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                <span className="dot purple" style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.name}</span>
                {current?.id === ws.id && <span className="badge paused" style={{ fontSize: '9px', flexShrink: 0 }}>current</span>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                <span className="badge paused" title="Members"><Users size={11} /> {ws.members_count ?? 1}</span>
                {ws.role && <span className="badge">{ws.role}</span>}
                <span style={{ fontSize: '10px', color: 'var(--muted2)' }}>
                  Created {new Date(ws.created_at).toLocaleDateString()}
                </span>
                <span style={{ flex: 1 }} />
                {ws.role === 'owner' && (
                  <>
                    <button className="icon-btn" title="Preview workspace" onClick={() => openPreview(ws)}><Eye size={12} /></button>
                    <button
                      className="icon-btn"
                      title="Delete workspace"
                      style={{ color: '#ff6b6b' }}
                      onClick={() => setConfirmDeleteWs(ws)}
                    ><Trash2 size={12} /></button>
                  </>
                )}
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
      await onCreate(name.trim().slice(0, 16))
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
        background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: '6px',
        padding: '24px', width: '100%', maxWidth: '440px', maxHeight: '90vh',
        overflowY: 'auto', boxShadow: '0 20px 25px rgba(0,0,0,0.3)',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700' }}>New Workspace</h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '12px' }}>
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
              fontSize: '12px', fontWeight: '600', color: 'var(--text-soft)',
            }}>Workspace Name</label>
            <input
              type="text"
              value={name}
              maxLength={16}
              onChange={(e) => setName(e.target.value.slice(0, 16))}
              placeholder="e.g., Game Dev"
              style={{
                width: '100%', padding: '8px 9px', border: '1px solid var(--border)',
                background: 'var(--panel3)', color: 'var(--text-soft)', borderRadius: '4px',
                fontSize: '12px', boxSizing: 'border-box', outline: 'none',
              }}
              autoFocus
            />
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted2)', textAlign: 'right' }}>{name.length}/16</div>
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
