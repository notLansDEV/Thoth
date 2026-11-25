const MODULE_KEYS = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  tasks: 'Task',
  bugs: 'Bugs',
  calendar: 'Calendar',
  reports: 'Report',
  markdown: 'Markdown',
  workspaces: 'Workspace',
  settings: 'Settings',
}

function normalizeRole(role) {
  return String(role || 'member').toLowerCase()
}

function modulePermsFromRoleData(roleData, moduleName) {
  const m = roleData?.[moduleName]
  if (!m || !m.show || typeof m !== 'object') return { read: false, write: false, delete: false }
  const features = m.features && typeof m.features === 'object' ? Object.values(m.features) : []
  let read = false, write = false, del = false
  for (const p of features) {
    if (!p || typeof p !== 'object') continue
    if (p.view) read = true
    if (p.edit) write = true
    if (p.delete) del = true
  }
  return { read, write, delete: del }
}

export function getWorkspaceModulePerms(workspace, role, pageKey) {
  const moduleName = MODULE_KEYS[pageKey]
  if (!moduleName) return { read: true, write: true, delete: true }
  const r = normalizeRole(role)
  const rp = workspace?.settings?.rolePermissions
  if (!rp || typeof rp !== 'object') {
    // No granular config: owners full, admins/members conservative defaults
    if (r === 'owner') return { read: true, write: true, delete: true }
    if (r === 'admin') return { read: true, write: true, delete: true }
    return { read: true, write: false, delete: false }
  }
  let roleData = rp[r]
  if (!roleData) {
    const key = Object.keys(rp).find(k => String(k).toLowerCase() === r)
    roleData = key ? rp[key] : null
  }
  if (!roleData) {
    if (r === 'owner') return { read: true, write: true, delete: true }
    return { read: false, write: false, delete: false }
  }
  return modulePermsFromRoleData(roleData, moduleName)
}

export function getEffectiveModulePerms(workspace, requester, pageKey, projectRole = null) {
  const role = normalizeRole(requester?.role)
  if (role === 'owner') return { read: true, write: true, delete: true }
  const effectiveRole = projectRole ? normalizeRole(projectRole) : role
  return getWorkspaceModulePerms(workspace, effectiveRole, pageKey)
}

export function requireWorkspaceModulePerm(req, res, { workspace, requester, pageKey, action = 'read', projectRole = null }) {
  if (!workspace || !requester) return false
  const role = normalizeRole(requester.role)
  if (role === 'owner') return true
  const perms = getEffectiveModulePerms(workspace, requester, pageKey, projectRole)
  const key = action === 'write' ? 'write' : action === 'delete' ? 'delete' : 'read'
  if (perms[key]) return true
  res.status(403).json({ error: `Insufficient permissions for ${action} on ${pageKey}` })
  return false
}
