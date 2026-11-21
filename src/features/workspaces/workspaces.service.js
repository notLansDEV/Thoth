const API_URL = '/api'
const STORAGE_KEY = 'thoth_workspace'

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`)
  }
  return data
}

export async function getWorkspaces() {
  return apiRequest('/workspaces')
}

export async function createWorkspace(name) {
  return apiRequest('/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function updateWorkspace(id, data) {
  return apiRequest(`/workspaces/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteWorkspace(id) {
  return apiRequest(`/workspaces/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function getMembers(workspaceId) {
  return apiRequest(`/workspaces/${encodeURIComponent(workspaceId)}/members`)
}

export async function addMember(workspaceId, email, role) {
  return apiRequest(`/workspaces/${encodeURIComponent(workspaceId)}/members`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  })
}

export async function updateMemberRole(workspaceId, userId, role) {
  return apiRequest(`/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
}

export async function removeMember(workspaceId, userId) {
  return apiRequest(`/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })
}

export function setCurrentWorkspace(workspace) {
  if (workspace) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function getCurrentWorkspace() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const MY_PROJECT_MEMBERSHIPS_KEY = 'thoth_my_project_memberships'
const SELECTED_PROJECT_KEY = 'thoth_selected_project'

export function getSelectedProjectId(workspaceId = null) {
  try {
    const raw = localStorage.getItem(SELECTED_PROJECT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const wsId = workspaceId || getCurrentWorkspace()?.id
    if (!wsId) return parsed?.projectId || null
    if (String(parsed?.workspaceId) !== String(wsId)) return null
    return parsed?.projectId || null
  } catch {
    return null
  }
}

export function setSelectedProjectId(projectId, workspaceId = null) {
  try {
    const wsId = workspaceId || getCurrentWorkspace()?.id
    if (!wsId || !projectId) {
      localStorage.removeItem(SELECTED_PROJECT_KEY)
      return
    }
    localStorage.setItem(SELECTED_PROJECT_KEY, JSON.stringify({ workspaceId: wsId, projectId }))
  } catch {}
}

export function clearSelectedProjectId() {
  try { localStorage.removeItem(SELECTED_PROJECT_KEY) } catch {}
}

export async function getMyProjectMemberships(workspaceId) {
  if (!workspaceId) return []
  return apiRequest(`/workspaces/${encodeURIComponent(workspaceId)}/my-project-memberships`)
}

export function setMyProjectMembershipsCache(workspaceId, rows) {
  try {
    if (!workspaceId) {
      localStorage.removeItem(MY_PROJECT_MEMBERSHIPS_KEY)
      return
    }
    localStorage.setItem(MY_PROJECT_MEMBERSHIPS_KEY, JSON.stringify({
      workspaceId,
      rows: Array.isArray(rows) ? rows : [],
      updatedAt: Date.now(),
    }))
  } catch {}
}

export function getMyProjectMembershipsCache(workspaceId = null) {
  try {
    const raw = localStorage.getItem(MY_PROJECT_MEMBERSHIPS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const wsId = workspaceId || getCurrentWorkspace()?.id
    if (!wsId || String(parsed?.workspaceId) !== String(wsId)) return []
    return Array.isArray(parsed?.rows) ? parsed.rows : []
  } catch {
    return []
  }
}

export async function refreshMyProjectMemberships(workspaceId = null) {
  const wsId = workspaceId || getCurrentWorkspace()?.id
  if (!wsId) {
    setMyProjectMembershipsCache(null, [])
    return []
  }
  try {
    const rows = await getMyProjectMemberships(wsId)
    setMyProjectMembershipsCache(wsId, rows)
    return Array.isArray(rows) ? rows : []
  } catch {
    return getMyProjectMembershipsCache(wsId)
  }
}

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

const MODULE_NAMES = ['Dashboard', 'Projects', 'Task', 'Bugs', 'Calendar', 'Report', 'Markdown', 'Workspace', 'Settings']
const ROLES = ['owner', 'admin', 'member']

const PERM_MATRIX = [
  { key: 'Dashboard', shortName: 'Dashboard', module: '1. Dashboard Module', features: [
    { id: 'dash_cards', sub: 'Overview', name: 'Summary Cards (Users, Tasks, Bugs)', desc: 'Read-only KPIs: Total Users, Active Users, Tasks Completed, Open Bugs', cap: { v: 1, e: 0, d: 0 } },
    { id: 'dash_projects', sub: 'Widgets', name: 'Projects Widget (View all projects)', desc: 'Read-only list of all workspace projects on dashboard', cap: { v: 1, e: 0, d: 0 } },
    { id: 'dash_proj_create', sub: 'Widgets', name: 'Projects Widget — Quick Create', desc: 'Create a new project directly from the dashboard widget', cap: { v: 0, e: 1, d: 0 } },
    { id: 'dash_queue', sub: 'Widgets', name: 'Active Work Queue (TODO tasks)', desc: 'Read-only queue showing prioritized TODO tasks', cap: { v: 1, e: 0, d: 0 } },
    { id: 'dash_activity', sub: 'Widgets', name: 'Recent Activity Feed (All user logs)', desc: 'Read-only timeline of tasks created, bugs reported, and updates', cap: { v: 1, e: 0, d: 0 } },
    { id: 'dash_bugs', sub: 'Widgets', name: 'Recent Bugs Widget (New bugs)', desc: 'Read-only list of newly flagged bugs', cap: { v: 1, e: 0, d: 0 } },
  ]},
  { key: 'Projects', shortName: 'Projects', module: '2. Projects Module', features: [
    { id: 'proj_dir', sub: 'Directory', name: 'All Projects Directory', desc: 'View, edit, and delete workspace projects (Members view assigned/all)', cap: { v: 1, e: 1, d: 1 } },
    { id: 'proj_overview', sub: 'Project Detail', name: 'Project Overview', desc: 'View and edit project summaries and core metadata', cap: { v: 1, e: 1, d: 0 } },
    { id: 'proj_team', sub: 'Project Detail', name: 'Team Members', desc: 'Manage project access (Admins cannot remove Workspace Owner)', cap: { v: 1, e: 1, d: 1 } },
    { id: 'proj_milestones', sub: 'Project Detail', name: 'Milestones', desc: 'View, add, edit, and delete project milestones', cap: { v: 1, e: 1, d: 1 } },
    { id: 'proj_tasks', sub: 'Project Detail', name: 'Tasks List', desc: 'View and manage all created tasks inside a project', cap: { v: 1, e: 1, d: 1 } },
    { id: 'proj_bugs', sub: 'Project Detail', name: 'Bugs List', desc: 'View and manage all reported bugs inside a project', cap: { v: 1, e: 1, d: 1 } },
    { id: 'proj_attach', sub: 'Project Detail', name: 'Attachments & Thumbnails', desc: 'Upload files and preview attachment thumbnails', cap: { v: 1, e: 1, d: 1 } },
    { id: 'proj_activity', sub: 'Project Detail', name: 'Activity Feed', desc: "Shows all users' task and bug creation logs", cap: { v: 1, e: 0, d: 0 } },
    { id: 'proj_notes', sub: 'Project Detail', name: 'Notes', desc: 'Project notes (Members restricted to deleting own notes)', cap: { v: 1, e: 1, d: 1 } },
  ]},
  { key: 'Task', shortName: 'Task', module: '3. Task Module', features: [
    { id: 'task_cards', sub: 'All Tasks', name: 'Summary Cards (TODO, Total, Stages)', desc: 'Read-only counters for task progress', cap: { v: 1, e: 0, d: 0 } },
    { id: 'task_kanban', sub: 'All Tasks', name: 'Kanban Board & Cards', desc: 'Create, view, edit, and delete tasks (Members delete self-created)', cap: { v: 1, e: 1, d: 1 } },
    { id: 'task_drag', sub: 'All Tasks', name: 'Drag & Drop Mechanics', desc: 'Move task cards across workflow stages', cap: { v: 0, e: 1, d: 0 } },
    { id: 'task_stage_cards', sub: 'Task Stages', name: 'Summary Cards', desc: 'Stage count and status metrics', cap: { v: 1, e: 0, d: 0 } },
    { id: 'task_stages', sub: 'Task Stages', name: 'Stage Management (Add/Edit/Delete)', desc: 'Manage workflow columns (Todo, In Progress, Review)', cap: { v: 1, e: 1, d: 1 } },
  ]},
  { key: 'Bugs', shortName: 'Bugs', module: '4. Bugs Module', features: [
    { id: 'bug_cards', sub: 'All Bugs', name: 'Summary Cards (New, Total, Stages)', desc: 'Read-only counters for reported bugs', cap: { v: 1, e: 0, d: 0 } },
    { id: 'bug_kanban', sub: 'All Bugs', name: 'Kanban Board & Cards', desc: 'Report, view, edit, and delete bugs (Members delete self-reported)', cap: { v: 1, e: 1, d: 1 } },
    { id: 'bug_drag', sub: 'All Bugs', name: 'Drag & Drop Triage', desc: 'Move bug cards across triage columns', cap: { v: 0, e: 1, d: 0 } },
    { id: 'bug_stage_cards', sub: 'Bug Stages', name: 'Summary Cards', desc: 'Bug stage metrics', cap: { v: 1, e: 0, d: 0 } },
    { id: 'bug_stages', sub: 'Bug Stages', name: 'Stage Management (Add/Edit/Delete)', desc: 'Manage bug triage columns (New, In Progress, etc.)', cap: { v: 1, e: 1, d: 1 } },
  ]},
  { key: 'Calendar', shortName: 'Calendar', module: '5. Calendar Module', features: [
    { id: 'cal_view', sub: 'Schedule', name: 'Task & Bug Schedule View', desc: 'Calendar view displaying all scheduled tasks and bugs', cap: { v: 1, e: 1, d: 1 } },
  ]},
  { key: 'Report', shortName: 'Report', module: '6. Report Module', features: [
    { id: 'rep_kpi', sub: 'Overview', name: 'Summary KPI Cards (Active, Hold, Priority)', desc: 'Read-only cards: Total Projects, Active, Completed, On Hold, High Priority', cap: { v: 1, e: 0, d: 0 } },
    { id: 'rep_list', sub: 'Directory', name: 'All Projects List', desc: 'View status list across all workspace projects', cap: { v: 1, e: 0, d: 0 } },
    { id: 'rep_drilldown', sub: 'Drilldown', name: 'Specific Project Report', desc: 'Overview, Milestones, Task Priority/Status, Users, and Task List', cap: { v: 1, e: 0, d: 0 } },
  ]},
  { key: 'Markdown', shortName: 'Markdown', module: '7. Markdown Module', features: [
    { id: 'md_journal', sub: 'Journal', name: 'Journal (MD notes + Calendar Date Picker)', desc: 'Daily date-linked markdown logs with calendar picker', cap: { v: 1, e: 1, d: 1 } },
    { id: 'md_pages', sub: 'Directory', name: 'All Pages (All created notes directory)', desc: 'Browse and manage markdown notes (Members delete own pages)', cap: { v: 1, e: 1, d: 1 } },
  ]},
  { key: 'Workspace', shortName: 'Workspace', module: '8. Workspace Switcher & Management', features: [
    { id: 'ws_global', sub: 'Global', name: 'Workspaces (Show all, View, Create, Delete)', desc: 'View joined workspaces & create new; only Owner deletes current workspace', cap: { v: 1, e: 1, d: 1 } },
  ]},
  { key: 'Settings', shortName: 'Settings', module: '9. Settings Module', features: [
    { id: 'set_account', sub: 'Configuration', name: 'Account (Sign-in details)', desc: 'Your personal sign-in credentials for Thoth', cap: { v: 1, e: 1, d: 0 } },
    { id: 'set_general', sub: 'Configuration', name: 'General (Workspace info)', desc: 'Basic workspace name & details (Hidden for Admin & Member)', cap: { v: 1, e: 1, d: 0 } },
    { id: 'set_appearance', sub: 'Configuration', name: 'Appearance (Theme/device look)', desc: 'Choose how Thoth looks across your devices', cap: { v: 1, e: 1, d: 0 } },
    { id: 'set_teams', sub: 'Workspace', name: 'Teams & Members', desc: 'Manage workspace access (Admin cannot delete Owner; hidden for Member)', cap: { v: 1, e: 1, d: 1 } },
    { id: 'set_roles', sub: 'Workspace', name: 'Roles & Permissions', desc: 'Configure module permissions (Admin edits Member only; hidden for Member)', cap: { v: 1, e: 1, d: 0 } },
    { id: 'set_notif', sub: 'Workspace', name: 'Notifications', desc: 'Choose which workspace events trigger a notification', cap: { v: 1, e: 1, d: 0 } },
    { id: 'set_storage', sub: 'System', name: 'Data & Storage (Local Postgres)', desc: 'Local-first PostgreSQL storage settings (Hidden for Admin & Member)', cap: { v: 1, e: 1, d: 1 } },
    { id: 'set_about', sub: 'System', name: 'About Thoth', desc: 'Read-only local-first PostgreSQL app information', cap: { v: 1, e: 0, d: 0 } },
  ]},
]

function clone(obj) { return JSON.parse(JSON.stringify(obj)) }

function capsToPerm(cap, value = true) {
  return {
    view: !!(value && cap?.v),
    edit: !!(value && cap?.e),
    delete: !!(value && cap?.d),
  }
}

function makeAll(value) {
  const out = {}
  for (const mod of PERM_MATRIX) {
    const features = {}
    for (const f of mod.features) features[f.id] = capsToPerm(f.cap, value)
    out[mod.key] = { show: !!value, features }
  }
  return out
}

function normalizeShowAndLogic(roleObj) {
  for (const mod of PERM_MATRIX) {
    const m = roleObj[mod.key] || (roleObj[mod.key] = { show: false, features: {} })
    if (!m.features || typeof m.features !== "object") m.features = {}
    let any = false
    for (const f of mod.features) {
      const p = m.features[f.id] || { view: false, edit: false, delete: false }
      if (!f.cap?.v) p.view = false
      if (!f.cap?.e) p.edit = false
      if (!f.cap?.d) p.delete = false
      if ((p.edit || p.delete) && f.cap?.v) p.view = true
      if (!p.view && f.cap?.v) { p.edit = false; p.delete = false }
      m.features[f.id] = p
      if (p.view || p.edit || p.delete) any = true
    }
    m.show = !!m.show && any
    if (!m.show) for (const f of mod.features) m.features[f.id] = { view: false, edit: false, delete: false }
  }
  return roleObj
}

const DEFAULT_TEMPLATES = {
  admin: {
    dash_cards: { v: true }, dash_projects: { v: true }, dash_proj_create: { e: true }, dash_queue: { v: true }, dash_activity: { v: true }, dash_bugs: { v: true },
    proj_dir: { v: true, e: true, d: true }, proj_overview: { v: true, e: true }, proj_team: { v: true, e: true, d: true }, proj_milestones: { v: true, e: true, d: true }, proj_tasks: { v: true, e: true, d: true }, proj_bugs: { v: true, e: true, d: true }, proj_attach: { v: true, e: true, d: true }, proj_activity: { v: true }, proj_notes: { v: true, e: true, d: true },
    task_cards: { v: true }, task_kanban: { v: true, e: true, d: true }, task_drag: { e: true }, task_stage_cards: { v: true }, task_stages: { v: true, e: true, d: true },
    bug_cards: { v: true }, bug_kanban: { v: true, e: true, d: true }, bug_drag: { e: true }, bug_stage_cards: { v: true }, bug_stages: { v: true, e: true, d: true },
    cal_view: { v: true, e: true, d: true },
    rep_kpi: { v: true }, rep_list: { v: true }, rep_drilldown: { v: true },
    md_journal: { v: true, e: true, d: true }, md_pages: { v: true, e: true, d: true },
    ws_global: { v: true, e: true, d: false },
    set_account: { v: true, e: true }, set_general: { v: false, e: false }, set_appearance: { v: true, e: true }, set_teams: { v: true, e: true, d: true }, set_roles: { v: true, e: true }, set_notif: { v: true, e: true }, set_storage: { v: false, e: false, d: false }, set_about: { v: true },
  },
  member: {
    dash_cards: { v: true }, dash_projects: { v: true }, dash_proj_create: { e: false }, dash_queue: { v: true }, dash_activity: { v: true }, dash_bugs: { v: true },
    proj_dir: { v: true, e: false, d: false }, proj_overview: { v: true, e: false }, proj_team: { v: true, e: false, d: false }, proj_milestones: { v: true, e: false, d: false }, proj_tasks: { v: true, e: true, d: false }, proj_bugs: { v: true, e: true, d: false }, proj_attach: { v: true, e: true, d: false }, proj_activity: { v: true }, proj_notes: { v: true, e: true, d: true },
    task_cards: { v: true }, task_kanban: { v: true, e: true, d: true }, task_drag: { e: true }, task_stage_cards: { v: false }, task_stages: { v: false, e: false, d: false },
    bug_cards: { v: true }, bug_kanban: { v: true, e: true, d: true }, bug_drag: { e: true }, bug_stage_cards: { v: false }, bug_stages: { v: false, e: false, d: false },
    cal_view: { v: true, e: true, d: false },
    rep_kpi: { v: true }, rep_list: { v: true }, rep_drilldown: { v: true },
    md_journal: { v: true, e: true, d: true }, md_pages: { v: true, e: true, d: true },
    ws_global: { v: true, e: true, d: false },
    set_account: { v: true, e: true }, set_general: { v: false, e: false }, set_appearance: { v: true, e: true }, set_teams: { v: false, e: false, d: false }, set_roles: { v: false, e: false }, set_notif: { v: true, e: true }, set_storage: { v: false, e: false, d: false }, set_about: { v: true },
  },
}

function templateToRole(role) {
  if (role === 'owner') return normalizeShowAndLogic(makeAll(true))
  const out = makeAll(false)
  const tpl = DEFAULT_TEMPLATES[role] || {}
  for (const mod of PERM_MATRIX) {
    for (const f of mod.features) {
      const t = tpl[f.id] || {}
      out[mod.key].features[f.id] = {
        view: !!(f.cap?.v && t.v),
        edit: !!(f.cap?.e && t.e),
        delete: !!(f.cap?.d && t.d),
      }
    }
  }
  // infer show
  for (const mod of PERM_MATRIX) {
    let any = false
    for (const f of mod.features) { const p = out[mod.key].features[f.id]; if (p.view||p.edit||p.delete) any = true }
    out[mod.key].show = any
  }
  return normalizeShowAndLogic(out)
}

function defaultGranularRolePerms() {
  return { owner: templateToRole('owner'), admin: templateToRole('admin'), member: templateToRole('member') }
}

function isGranularFormat(raw) {
  if (!raw || typeof raw !== 'object') return false
  const role = raw.owner || raw.admin || raw.member
  if (!role || typeof role !== 'object') return false
  const mod = role.Dashboard || role.Projects || role.Task || role.Settings || role.Workspace
  return !!(mod && typeof mod === 'object' && mod.features && typeof mod.features === 'object')
}

function migrateOldFeatureId(modKey, oldId) {
  const map = {
    Dashboard: { dash_cards:'dash_cards', dash_projects:'dash_projects', dash_projects_view:'dash_projects', dash_projects_create:'dash_proj_create', dash_queue:'dash_queue', dash_queue_todos:'dash_queue', dash_activity:'dash_activity', dash_bugs:'dash_bugs' },
    Projects: { proj_directory:'proj_dir', proj_overview:'proj_overview', proj_team:'proj_team', proj_team_members:'proj_team', proj_milestones:'proj_milestones', proj_tasks:'proj_tasks', proj_tasks_view:'proj_tasks', proj_bugs:'proj_bugs', proj_bugs_view:'proj_bugs', proj_attachments:'proj_attach', proj_activity:'proj_activity', proj_notes:'proj_notes' },
    Task: { task_all_cards:'task_cards', task_summary_cards:'task_cards', task_kanban:'task_kanban', task_board:'task_kanban', task_manage:'task_kanban', task_delete:'task_kanban', task_dnd:'task_drag', task_stages_cards:'task_stage_cards', task_stages_summary:'task_stage_cards', task_stages_view:'task_stages', task_stages_manage:'task_stages' },
    Bugs: { bug_all_cards:'bug_cards', bug_summary_cards:'bug_cards', bug_kanban:'bug_kanban', bug_board:'bug_kanban', bug_manage:'bug_kanban', bug_delete:'bug_kanban', bug_dnd:'bug_drag', bug_stages_cards:'bug_stage_cards', bug_stages_summary:'bug_stage_cards', bug_stages_view:'bug_stages', bug_stages_manage:'bug_stages' },
    Calendar: { cal_view:'cal_view', cal_manage:'cal_view', cal_view_tasks_bugs:'cal_view' },
    Report: { rep_cards:'rep_kpi', rep_kpi_cards:'rep_kpi', rep_all_projects:'rep_list', rep_table:'rep_list', rep_project_view:'rep_drilldown', rep_project_drilldown:'rep_drilldown' },
    Markdown: { md_journal:'md_journal', md_journal_calendar:'md_journal', md_notes:'md_journal', md_picker:'md_journal', md_all_pages:'md_pages', md_pages_directory:'md_pages' },
    Workspace: { ws_global:'ws_global', ws_show_all:'ws_global', ws_create:'ws_global', ws_view:'ws_global', ws_delete:'ws_global', ws_view_create:'ws_global', ws_delete_current:'ws_global' },
    Settings: { set_account:'set_account', set_general:'set_general', set_appearance:'set_appearance', set_team:'set_teams', set_roles:'set_roles', set_notifications:'set_notif', set_storage:'set_storage', set_about:'set_about' },
  }
  return map[modKey]?.[oldId] || oldId
}

function legacyToGranular(raw) {
  const base = defaultGranularRolePerms()
  if (!raw || typeof raw !== 'object') return base
  const out = clone(base)
  for (const role of ROLES) {
    for (const mod of PERM_MATRIX) {
      const src = raw?.[role]?.[mod.key]
      if (!src || typeof src !== 'object' || !('read' in src || 'write' in src || 'delete' in src)) continue
      const read=!!src.read, write=!!src.write, del=!!src.delete
      for (const f of mod.features) out[role][mod.key].features[f.id] = { view: read && !!f.cap?.v, edit: write && !!f.cap?.e, delete: del && !!f.cap?.d }
      // workspace delete owner-only nuance
      if (mod.key === 'Workspace' && role !== 'owner') out[role][mod.key].features.ws_global.delete = false
    }
    normalizeShowAndLogic(out[role])
  }
  out.owner = templateToRole('owner')
  return out
}

export function normalizeGranularRolePerms(raw) {
  const base = defaultGranularRolePerms()
  if (!raw || typeof raw !== 'object') return base
  if (!isGranularFormat(raw)) return legacyToGranular(raw)
  const out = clone(base)

  const normalizeRoleObject = (srcRole, destRoleObj) => {
    for (const mod of PERM_MATRIX) {
      const srcMod = srcRole?.[mod.key]
      if (!srcMod || typeof srcMod !== 'object') continue
      const srcFeatures = srcMod.features && typeof srcMod.features === 'object' ? srcMod.features : {}
      // If feature data is provided for this module, treat stored values as authoritative (clamped to caps)
      const hasFeatureData = Object.keys(srcFeatures).length > 0
      for (const f of mod.features) {
        let src = srcFeatures[f.id]
        if (!src) {
          // try migrated old ids mapping to this feature
          for (const [oldId, candidate] of Object.entries(srcFeatures)) {
            if (migrateOldFeatureId(mod.key, oldId) === f.id && candidate && typeof candidate === 'object') { src = candidate; break }
          }
        }
        if (src && typeof src === 'object') {
          const p = {
            view: !!(src.view && f.cap?.v),
            edit: !!(src.edit && f.cap?.e),
            delete: !!(src.delete && f.cap?.d),
          }
          if ((p.edit || p.delete) && f.cap?.v) p.view = true
          if (!p.view && f.cap?.v) { p.edit = false; p.delete = false }
          destRoleObj[mod.key].features[f.id] = p
        } else if (hasFeatureData) {
          destRoleObj[mod.key].features[f.id] = { view: false, edit: false, delete: false }
        }
      }
      if (typeof srcMod.show === 'boolean') destRoleObj[mod.key].show = srcMod.show
      normalizeShowAndLogic(destRoleObj)
    }
    return destRoleObj
  }

  for (const role of ROLES) {
    normalizeRoleObject(raw?.[role], out[role])
  }

  // Preserve custom roles (non-owner/admin/member) with optional metadata
  for (const [roleKey, srcRole] of Object.entries(raw)) {
    if (ROLES.includes(roleKey) || roleKey.startsWith('_')) continue
    if (!srcRole || typeof srcRole !== 'object') continue
    const custom = templateToRole('member')
    if (srcRole._meta && typeof srcRole._meta === 'object') custom._meta = { ...srcRole._meta }
    normalizeRoleObject(srcRole, custom)
    out[roleKey] = custom
  }

  // Owner immutable
  out.owner = templateToRole('owner')
  // Clamp admin/member/custom roles to owner baseline (owner is full)
  for (const role of Object.keys(out)) {
    if (role === 'owner' || role.startsWith('_')) continue
    if (!out[role] || typeof out[role] !== 'object') continue
    for (const mod of PERM_MATRIX) {
      const rMod = out[role][mod.key], oMod = out.owner[mod.key]
      if (!rMod || !oMod) continue
      for (const f of mod.features) {
        const p = rMod.features[f.id], o = oMod.features[f.id]
        if (!p || !o) continue
        p.view = !!p.view && !!o.view
        p.edit = !!p.edit && !!o.edit
        p.delete = !!p.delete && !!o.delete
        if ((p.edit || p.delete) && f.cap?.v && o.view) p.view = true
        if (!p.view && f.cap?.v) { p.edit = false; p.delete = false }
      }
      normalizeShowAndLogic(out[role])
    }
  }
  return out
}

function deriveModulePerms(granular, role) {
  const key = String(role || 'member').toLowerCase()
  let roleData = granular[key] || granular[Object.keys(granular || {}).find(k => String(k).toLowerCase() === key)]
  if (!roleData) {
    if (key === 'admin') roleData = granular.admin || {}
    else if (key === 'member') roleData = granular.member || {}
    else {
      // Unknown/custom role not configured in saved permissions: deny module access by default
      const out = {}
      for (const mod of PERM_MATRIX) out[mod.key] = { read: false, write: false, delete: false }
      return out
    }
  }
  const out = {}
  for (const mod of PERM_MATRIX) {
    const m = roleData[mod.key]
    if (!m || !m.show) { out[mod.key] = { read: false, write: false, delete: false }; continue }
    let read = false, write = false, del = false
    for (const f of mod.features) {
      const p = m.features?.[f.id] || {}
      if (p.view) read = true
      if (p.edit) write = true
      if (p.delete) del = true
    }
    out[mod.key] = { read, write, delete: del }
  }
  return out
}

function mergeModulePermsUnion(permsList) {
  const out = {}
  for (const mod of PERM_MATRIX) out[mod.key] = { read: false, write: false, delete: false }
  for (const perms of (permsList || [])) {
    for (const mod of PERM_MATRIX) {
      const p = perms?.[mod.key] || {}
      out[mod.key].read = out[mod.key].read || !!p.read
      out[mod.key].write = out[mod.key].write || !!p.write
      out[mod.key].delete = out[mod.key].delete || !!p.delete
    }
  }
  return out
}

function getEffectiveModulePerms(workspace = getCurrentWorkspace()) {
  const granular = normalizeGranularRolePerms(workspace?.settings?.rolePermissions)
  const role = String(workspace?.role || 'member').toLowerCase()
  if (role === 'owner') return deriveModulePerms(granular, 'owner')

  const memberships = getMyProjectMembershipsCache(workspace?.id)
  const selectedProjectId = getSelectedProjectId(workspace?.id)

  // Scope permissions to the selected project when available; otherwise default to first assigned project
  if (Array.isArray(memberships) && memberships.length > 0) {
    let selected = selectedProjectId
      ? memberships.find(m => String(m.project_id) === String(selectedProjectId))
      : null
    if (!selected) selected = memberships[0]
    if (selected) {
      const projectRole = String(selected.project_role || selected.role || 'member').toLowerCase()
      return deriveModulePerms(granular, projectRole)
    }
  }

  // Fallback to workspace role if no per-project memberships are cached/assigned
  return deriveModulePerms(granular, role)
}

function getModulePermsForRole(role, workspace = getCurrentWorkspace()) {
  const granular = normalizeGranularRolePerms(workspace?.settings?.rolePermissions)
  return deriveModulePerms(granular, role)
}

export function getModulePermission(pageKey, perm = 'read', workspace = getCurrentWorkspace()) {
  const moduleName = MODULE_KEYS[pageKey]
  if (!moduleName) return true
  const modulePerms = getEffectiveModulePerms(workspace)
  const key = perm === 'write' ? 'write' : perm === 'delete' ? 'delete' : 'read'
  return !!modulePerms?.[moduleName]?.[key]
}

export function getModulePermissionForProject(projectId, pageKey, perm = 'read', workspace = getCurrentWorkspace()) {
  const moduleName = MODULE_KEYS[pageKey]
  if (!moduleName) return true
  const wsRole = String(workspace?.role || 'member').toLowerCase()
  if (wsRole === 'owner') {
    const modulePerms = getModulePermsForRole('owner', workspace)
    const key = perm === 'write' ? 'write' : perm === 'delete' ? 'delete' : 'read'
    return !!modulePerms?.[moduleName]?.[key]
  }
  if (!projectId) return false
  const projectRole = getProjectRole(projectId, workspace)
  if (!projectRole) return false
  const modulePerms = getModulePermsForRole(projectRole, workspace)
  const key = perm === 'write' ? 'write' : perm === 'delete' ? 'delete' : 'read'
  return !!modulePerms?.[moduleName]?.[key]
}

export function canAccessModule(pageKey, workspace = getCurrentWorkspace()) {
  return getModulePermission(pageKey, 'read', workspace)
}

export function canWriteModule(pageKey, workspace = getCurrentWorkspace()) {
  return getModulePermission(pageKey, 'write', workspace)
}

export function canDeleteModule(pageKey, workspace = getCurrentWorkspace()) {
  return getModulePermission(pageKey, 'delete', workspace)
}

export function canAccessProject(projectId, workspace = getCurrentWorkspace()) {
  if (!projectId) return false
  const role = String(workspace?.role || 'member').toLowerCase()
  if (role === 'owner') return true
  const memberships = getMyProjectMembershipsCache(workspace?.id)
  return memberships.some(m => String(m.project_id) === String(projectId))
}

export function getProjectRole(projectId, workspace = getCurrentWorkspace()) {
  const role = String(workspace?.role || 'member').toLowerCase()
  if (role === 'owner') return 'owner'
  const memberships = getMyProjectMembershipsCache(workspace?.id)
  const row = memberships.find(m => String(m.project_id) === String(projectId))
  return row ? String(row.project_role || row.role || 'member').toLowerCase() : null
}

export function canAccessProjectModule(projectId, pageKey, workspace = getCurrentWorkspace()) {
  return getModulePermissionForProject(projectId, pageKey, 'read', workspace)
}

export function canWriteProjectModule(projectId, pageKey, workspace = getCurrentWorkspace()) {
  return getModulePermissionForProject(projectId, pageKey, 'write', workspace)
}

export function canDeleteProjectModule(projectId, pageKey, workspace = getCurrentWorkspace()) {
  return getModulePermissionForProject(projectId, pageKey, 'delete', workspace)
}
