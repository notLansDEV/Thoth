import { Fragment, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Settings2, Palette, Users, Bell, Database, Info, Monitor, Moon, Sun, Save,
  User, LogOut, Trash2, UserPlus, Check, X, Shield,
  Search, Sparkles, Pencil, Plus, Eye, ArrowRight, Globe,
} from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal.jsx'
import { getSettings, saveSettings } from '../features/settings/settings.service.js'
import {
  getCurrentWorkspace,
  setCurrentWorkspace,
  updateWorkspace,
  getMembers,
  addMember,
  updateMemberRole,
  removeMember,
} from '../features/workspaces/workspaces.service.js'
import {
  changePassword,
  deleteAccount,
  getAccountUser,
  clearSession,
} from '../features/auth/account.service.js'
import {
  getProjects,
  getWorkspaceProjectMemberships,
  setUserProjectMemberships,
} from '../features/projects/projects.service.js'

const FONTS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Source Sans 3', 'JetBrains Mono']
const ROLES = ['owner', 'admin', 'member']

const NAV = [
  {
    group: 'Configuration',
    items: [
      { key: 'account', label: 'Account', Icon: User },
      { key: 'general', label: 'General', Icon: Settings2 },
      { key: 'appearance', label: 'Appearance', Icon: Palette },
    ],
  },
  {
    group: 'Workspace',
    items: [
      { key: 'team', label: 'Teams & Members', Icon: Users },
      { key: 'roles', label: 'Roles & Permissions', Icon: Shield },
      { key: 'notifications', label: 'Notifications', Icon: Bell },
    ],
  },
  {
    group: 'System',
    items: [
      { key: 'storage', label: 'Data & Storage', Icon: Database },
      { key: 'about', label: 'About Thoth', Icon: Info },
    ],
  },
]


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
  return { view: !!(value && cap?.v), edit: !!(value && cap?.e), delete: !!(value && cap?.d) }
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
    if (!m.features || typeof m.features !== 'object') m.features = {}
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
      out[mod.key].features[f.id] = { view: !!(f.cap?.v && t.v), edit: !!(f.cap?.e && t.e), delete: !!(f.cap?.d && t.d) }
    }
    let any = false; for (const f of mod.features) { const p = out[mod.key].features[f.id]; if (p.view || p.edit || p.delete) any = true }
    out[mod.key].show = any
  }
  return normalizeShowAndLogic(out)
}
function defaultGranularRolePerms() { return { owner: templateToRole('owner'), admin: templateToRole('admin'), member: templateToRole('member') } }
function isGranularFormat(raw) {
  if (!raw || typeof raw !== 'object') return false
  const role = raw.owner || raw.admin || raw.member
  if (!role || typeof role !== 'object') return false
  const mod = role.Dashboard || role.Projects || role.Task || role.Settings || role.Workspace
  return !!(mod && typeof mod === 'object' && mod.features && typeof mod.features === 'object')
}
function migrateOldFeatureId(modKey, oldId) {
  const map = {
    Dashboard: { dash_cards: 'dash_cards', dash_projects: 'dash_projects', dash_projects_view: 'dash_projects', dash_projects_create: 'dash_proj_create', dash_queue: 'dash_queue', dash_queue_todos: 'dash_queue', dash_activity: 'dash_activity', dash_bugs: 'dash_bugs' },
    Projects: { proj_directory: 'proj_dir', proj_overview: 'proj_overview', proj_team: 'proj_team', proj_team_members: 'proj_team', proj_milestones: 'proj_milestones', proj_tasks: 'proj_tasks', proj_tasks_view: 'proj_tasks', proj_bugs: 'proj_bugs', proj_bugs_view: 'proj_bugs', proj_attachments: 'proj_attach', proj_activity: 'proj_activity', proj_notes: 'proj_notes' },
    Task: { task_all_cards: 'task_cards', task_summary_cards: 'task_cards', task_kanban: 'task_kanban', task_board: 'task_kanban', task_manage: 'task_kanban', task_delete: 'task_kanban', task_dnd: 'task_drag', task_stages_cards: 'task_stage_cards', task_stages_summary: 'task_stage_cards', task_stages_view: 'task_stages', task_stages_manage: 'task_stages' },
    Bugs: { bug_all_cards: 'bug_cards', bug_summary_cards: 'bug_cards', bug_kanban: 'bug_kanban', bug_board: 'bug_kanban', bug_manage: 'bug_kanban', bug_delete: 'bug_kanban', bug_dnd: 'bug_drag', bug_stages_cards: 'bug_stage_cards', bug_stages_summary: 'bug_stage_cards', bug_stages_view: 'bug_stages', bug_stages_manage: 'bug_stages' },
    Calendar: { cal_view: 'cal_view', cal_manage: 'cal_view', cal_view_tasks_bugs: 'cal_view' },
    Report: { rep_cards: 'rep_kpi', rep_kpi_cards: 'rep_kpi', rep_all_projects: 'rep_list', rep_table: 'rep_list', rep_project_view: 'rep_drilldown', rep_project_drilldown: 'rep_drilldown' },
    Markdown: { md_journal: 'md_journal', md_journal_calendar: 'md_journal', md_notes: 'md_journal', md_picker: 'md_journal', md_all_pages: 'md_pages', md_pages_directory: 'md_pages' },
    Workspace: { ws_global: 'ws_global', ws_show_all: 'ws_global', ws_create: 'ws_global', ws_view: 'ws_global', ws_delete: 'ws_global', ws_view_create: 'ws_global', ws_delete_current: 'ws_global' },
    Settings: { set_account: 'set_account', set_general: 'set_general', set_appearance: 'set_appearance', set_team: 'set_teams', set_roles: 'set_roles', set_notifications: 'set_notif', set_storage: 'set_storage', set_about: 'set_about' },
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
      const read = !!src.read, write = !!src.write, del = !!src.delete
      for (const f of mod.features) out[role][mod.key].features[f.id] = { view: read && !!f.cap?.v, edit: write && !!f.cap?.e, delete: del && !!f.cap?.d }
      if (mod.key === 'Workspace' && role !== 'owner') out[role][mod.key].features.ws_global.delete = false
    }
    normalizeShowAndLogic(out[role])
  }
  out.owner = templateToRole('owner')
  return out
}
function enforceHierarchy(out) {
  for (const role of Object.keys(out || {})) {
    if (role.startsWith('_') || !out[role] || typeof out[role] !== 'object') continue
    if (out[role].Dashboard || out[role].Projects || out[role].Task || out[role].Settings) normalizeShowAndLogic(out[role])
  }
  out.owner = templateToRole('owner')
  for (const role of Object.keys(out || {})) {
    if (role === 'owner' || role.startsWith('_')) continue
    if (!out[role] || typeof out[role] !== 'object') continue
    for (const mod of PERM_MATRIX) {
      const rMod = out[role][mod.key], oMod = out.owner[mod.key]
      if (!rMod || !oMod) continue
      for (const f of mod.features) {
        const p = rMod.features[f.id] || { view: false, edit: false, delete: false }
        const o = oMod.features[f.id] || { view: false, edit: false, delete: false }
        p.view = !!p.view && !!o.view; p.edit = !!p.edit && !!o.edit; p.delete = !!p.delete && !!o.delete
        if ((p.edit || p.delete) && f.cap?.v && o.view) p.view = true
        if (!p.view && f.cap?.v) { p.edit = false; p.delete = false }
        rMod.features[f.id] = p
      }
      normalizeShowAndLogic(out[role])
    }
  }
  return out
}
function normalizeGranularRolePerms(raw) {
  const base = defaultGranularRolePerms()
  if (!raw || typeof raw !== 'object') return base
  if (!isGranularFormat(raw)) return legacyToGranular(raw)
  const out = clone(base)

  const normalizeRoleObject = (srcRole, destRoleObj) => {
    for (const mod of PERM_MATRIX) {
      const srcMod = srcRole?.[mod.key]
      if (!srcMod || typeof srcMod !== 'object') continue
      const srcFeatures = srcMod.features && typeof srcMod.features === 'object' ? srcMod.features : {}
      const hasFeatureData = Object.keys(srcFeatures).length > 0
      for (const f of mod.features) {
        let src = srcFeatures[f.id]
        if (!src) {
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
  for (const [roleKey, srcRole] of Object.entries(raw)) {
    if (ROLES.includes(roleKey) || roleKey.startsWith('_')) continue
    if (!srcRole || typeof srcRole !== 'object') continue
    const custom = templateToRole('member')
    if (srcRole._meta && typeof srcRole._meta === 'object') custom._meta = { ...srcRole._meta }
    normalizeRoleObject(srcRole, custom)
    out[roleKey] = custom
  }
  out.owner = templateToRole('owner')
  return enforceHierarchy(out)
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" role="presentation" aria-hidden="true" />
      <span style={{ position: 'absolute', left: '-9999px' }}>{label}</span>
    </label>
  )
}

function msgStyle(type) {
  return {
    marginBottom: '10px', padding: '7px 10px', borderRadius: '4px', fontSize: '11px',
    border: `1px solid ${type === 'ok' ? 'rgba(32,217,107,0.35)' : 'rgba(255,64,64,0.35)'}`,
    background: type === 'ok' ? 'rgba(32,217,107,0.07)' : 'rgba(255,64,64,0.07)',
    color: type === 'ok' ? '#20d96b' : '#ff8a8a',
  }
}

export default function Settings() {
  const [ws, setWs] = useState(() => getCurrentWorkspace())
  const user = getAccountUser()
  const currentUserRole = (ws?.role || 'member').toLowerCase()
  const isOwner = currentUserRole === 'owner'
  const isAdmin = currentUserRole === 'admin'
  const isMemberUser = !isOwner && !isAdmin

  const allowedTabs = (() => {
    if (isOwner) return ['account', 'general', 'appearance', 'team', 'roles', 'notifications', 'storage', 'about']
    if (isAdmin) return ['account', 'appearance', 'team', 'roles', 'notifications', 'about'] // hides General and Data & Storage
    // member: personal Account/Appearance (if allowed), Notifications only in Workspace, About Thoth only in System
    const tabs = ['account', 'notifications', 'about']
    const rolePermsForTabs = normalizeGranularRolePerms(ws?.settings?.rolePermissions)
    const memberAppearanceAllowed = !!(rolePermsForTabs?.member?.Settings?.features?.set_appearance?.view || rolePermsForTabs?.member?.Settings?.features?.set_appearance?.edit)
    if (memberAppearanceAllowed) tabs.splice(1, 0, 'appearance')
    return tabs
  })()

  const navItems = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => allowedTabs.includes(item.key)),
  })).filter((group) => group.items.length > 0)

  const [tab, setTab] = useState(() => (allowedTabs.includes('account') ? 'account' : (allowedTabs[0] || 'account')))
  const [settings, setSettings] = useState(getSettings())

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!allowedTabs.includes(tab)) setTab(allowedTabs[0] || 'account')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserRole, ws?.id, tab])

  // General
  const [wsName, setWsName] = useState((ws?.name || '').slice(0, 16))
  const [wsSaved, setWsSaved] = useState(false)
  const [wsError, setWsError] = useState(null)
  const [savingWs, setSavingWs] = useState(false)

  // Team & Members
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [_teamBusy, _setTeamBusy] = useState(false)
  const [teamMsg, setTeamMsg] = useState(null)
  const [editingRole, setEditingRole] = useState(null)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [availableUsers, setAvailableUsers] = useState([])
  const [availableUsersLoading, setAvailableUsersLoading] = useState(false)
  const [addMemberSearch, setAddMemberSearch] = useState('')
  const [addingMemberId, setAddingMemberId] = useState(null)

  // Project access provisioning (owner-managed per user: which projects they can access and their role per project)
  const [projects, setProjects] = useState([])
  const [userProjectMap, setUserProjectMap] = useState({}) // { [userId]: [{ project_id, role }] }
  const [projAccessLoading, setProjAccessLoading] = useState(false)
  const [savingUserAccess, setSavingUserAccess] = useState(null) // userId
  const [accessSearch, setAccessSearch] = useState('')
  const [accessProjectFilter, setAccessProjectFilter] = useState('all')
  const [accessRoleFilter, setAccessRoleFilter] = useState('all')
  const [accessVisibilityFilter, setAccessVisibilityFilter] = useState('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMemberId, setDrawerMemberId] = useState(null)
  const [drawerSearch, setDrawerSearch] = useState('')
  const [draftAssignments, setDraftAssignments] = useState([]) // [{ project_id, role }]
  const [draftWorkspaceRole, setDraftWorkspaceRole] = useState('member')

  // Archive (Data & Storage)
  const [archiveRows, setArchiveRows] = useState([])
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [archiveHoverId, setArchiveHoverId] = useState(null)
  const [archiveDetail, setArchiveDetail] = useState(null)
  const [archiveDetailLoading, setArchiveDetailLoading] = useState(false)
  const [archiveDetailData, setArchiveDetailData] = useState({ tasks: [], bugs: [], pages: [], attachments: [] })
  const [expandedArchiveId, setExpandedArchiveId] = useState(null)
  const [expandedArchiveLoading, setExpandedArchiveLoading] = useState(false)
  const [expandedArchiveData, setExpandedArchiveData] = useState({ tasks: [], bugs: [], pages: [], attachments: [] })
  const [confirmRecoverProject, setConfirmRecoverProject] = useState(null)
  const [recoveringArchive, setRecoveringArchive] = useState(false)
  const [archiveViewItem, setArchiveViewItem] = useState(null) // { kind, data }

  async function handleRecoverProject() {
    if (!confirmRecoverProject?.id || !ws?.id) return
    setRecoveringArchive(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/archive/projects/${encodeURIComponent(confirmRecoverProject.id)}/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workspace_id: ws.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to recover project')
      toast.success(`Project "${confirmRecoverProject.name || 'Project'}" recovered`)
      setConfirmRecoverProject(null)
      setArchiveDetail(null)
      setExpandedArchiveId(null)
      setArchiveRows((rows) => rows.filter((r) => String(r.id) !== String(confirmRecoverProject.id)))
    } catch (err) {
      console.error('Recover project failed:', err)
      toast.error(err.message || 'Failed to recover project')
    } finally {
      setRecoveringArchive(false)
    }
  }

  async function toggleArchiveExpand(row) {
    const id = row?.id
    if (!id) return
    if (String(expandedArchiveId) === String(id)) {
      setExpandedArchiveId(null)
      return
    }
    setExpandedArchiveId(id)
    setExpandedArchiveData({ tasks: [], bugs: [], pages: [], attachments: [] })
    if (!ws?.id) return
    setExpandedArchiveLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/archive/projects/${encodeURIComponent(id)}/details?workspace_id=${encodeURIComponent(ws.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load archive details')
      const data = await res.json()
      setExpandedArchiveData({ tasks: Array.isArray(data.tasks) ? data.tasks : [], bugs: Array.isArray(data.bugs) ? data.bugs : [], pages: Array.isArray(data.pages) ? data.pages : [], attachments: Array.isArray(data.attachments) ? data.attachments : [] })
    } catch (err) {
      console.error('Archive expand load failed:', err)
    } finally {
      setExpandedArchiveLoading(false)
    }
  }

  async function openArchiveDetail(row) {
    setArchiveDetail(row)
    setArchiveDetailData({ tasks: [], bugs: [], pages: [], attachments: [] })
    if (!ws?.id || !row?.id) return
    setArchiveDetailLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/archive/projects/${encodeURIComponent(row.id)}/details?workspace_id=${encodeURIComponent(ws.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load archive details')
      const data = await res.json()
      setArchiveDetailData({ tasks: Array.isArray(data.tasks) ? data.tasks : [], bugs: Array.isArray(data.bugs) ? data.bugs : [], pages: Array.isArray(data.pages) ? data.pages : [], attachments: Array.isArray(data.attachments) ? data.attachments : [] })
    } catch (err) {
      console.error('Archive detail load failed:', err)
    } finally {
      setArchiveDetailLoading(false)
    }
  }

  useEffect(() => {
    if (tab !== 'storage' || !ws?.id) return
    let alive = true
    ;(async () => {
      setArchiveLoading(true)
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`/api/archive/projects?workspace_id=${encodeURIComponent(ws.id)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || `Archive request failed (${res.status})`)
        }
        const rows = await res.json()
        if (alive) setArchiveRows(Array.isArray(rows) ? rows : [])
      } catch (err) {
        if (alive) {
          setArchiveRows([])
          console.error('Archive load failed:', err)
        }
      } finally {
        if (alive) setArchiveLoading(false)
      }
    })()
    return () => { alive = false }
  }, [tab, ws?.id])

  // Notifications
  const [notifs, setNotifs] = useState({ assigned: true, comments: true, dueSoon: true, weekly: false })

  // Account
  const [pwdCurrent, setPwdCurrent] = useState('')
  const [pwdNext, setPwdNext] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [pwdBusy, setPwdBusy] = useState(false)
  const [pwdMsg, setPwdMsg] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // Roles & Permissions (scoped to current active workspace and user role within it)
  const [selectedRole, setSelectedRole] = useState(() => (isOwner ? 'admin' : 'member'))
  const [showRolesModal, setShowRolesModal] = useState(false)
  const [rolePerms, setRolePerms] = useState(() => normalizeGranularRolePerms(ws?.settings?.rolePermissions))
  const [savingPerms, setSavingPerms] = useState(false)
  const [_collapsedModules, _setCollapsedModules] = useState({})
  const [showAddRoleModal, setShowAddRoleModal] = useState(false)
  const [newRoleTitle, setNewRoleTitle] = useState('')
  const [newRoleDesc, setNewRoleDesc] = useState('')
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false)
  const [selectedRolePresetKey, setSelectedRolePresetKey] = useState(null)
  const [_rolesEditMode, _setRolesEditMode] = useState(false)
  const [editRoleModal, setEditRoleModal] = useState(null) // { key, title, description }
  const [confirmDeleteRole, setConfirmDeleteRole] = useState(null) // role key

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync role permissions from workspace settings
    setRolePerms(normalizeGranularRolePerms(ws?.settings?.rolePermissions))
  }, [ws?.id, ws?.settings, ws?.role])

  useEffect(() => {
    if (isOwner) {
      const available = Object.keys(rolePerms || {}).filter(k => !k.startsWith('_') && k !== 'owner')
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clamp selected role to available roles
      if (!available.includes(selectedRole)) setSelectedRole(available.includes('admin') ? 'admin' : (available[0] || 'member'))
    } else if (isAdmin) {
      // Admins can only view/manage lower-level permissions (member)
       
      if (selectedRole !== 'member') setSelectedRole('member')
    } else {
       
      if (selectedRole !== 'member') setSelectedRole('member')
    }
  }, [currentUserRole, ws?.id, isAdmin, isOwner, selectedRole, rolePerms])

  const _ownerBaseline = rolePerms?.owner || normalizeGranularRolePerms(ws?.settings?.rolePermissions).owner

  const _ROLE_BANNERS = {
    owner: <><strong>Workspace Owner:</strong> Supreme authority for the current workspace. Configure permissions for owner, admin, and member roles.</>,
    admin: <><strong>Workspace Admin:</strong> Can manage lower-level permissions for members. Owner and Admin permission tiers are locked.</>,
    member: <><strong>Workspace Member:</strong> Role definition for the current workspace. Members have no control over permissions in this settings page.</>,
  }

  function getRoleMeta(roleKey) {
    const meta = rolePerms?.[roleKey]?._meta || {}
    const fallbackTitle = roleKey ? String(roleKey).charAt(0).toUpperCase() + String(roleKey).slice(1) : 'Role'
    return {
      title: meta.title || fallbackTitle,
      description: meta.description || (roleKey === 'admin' ? 'Workspace administrator role permissions.' : roleKey === 'member' ? 'Default workspace member role permissions.' : 'Custom role permissions.'),
    }
  }



  function canViewRoleTab(role) {
    if (isOwner) return role !== 'owner' && !String(role).startsWith('_')
    if (isAdmin) return role === 'member'
    return false
  }

  function _canEditSelectedRoleMatrix() {
    if (selectedRole === 'owner' || String(selectedRole).startsWith('_')) return false
    if (isMemberUser) return false
    if (isOwner) return canViewRoleTab(selectedRole)
    if (isAdmin) return selectedRole === 'member'
    return false
  }



  function save(patch) {
    const next = saveSettings(patch)
    setSettings(next)
  }

  const _isSelf = (id) => user && id === user.id

  async function handleSaveGeneral() {
    const nextName = wsName.trim().slice(0, 16)
    if (!ws || !nextName) return
    setSavingWs(true)
    setWsError(null)
    setWsSaved(false)
    try {
      const updated = await updateWorkspace(ws.id, { name: nextName })
      const nextWs = { ...ws, ...updated }
      setWs(nextWs)
      setCurrentWorkspace(nextWs)
      setWsName((updated.name || nextName).slice(0, 16))
      setWsSaved(true)
      setTimeout(() => setWsSaved(false), 1500)
    } catch (err) {
      setWsError(err.message || 'Could not save workspace name')
    } finally {
      setSavingWs(false)
    }
  }

  function _setPerm(role, mod, perm, value) {
    setRolePerms((cur) => ({
      ...cur,
      [role]: {
        ...cur[role],
        [mod]: { ...cur[role][mod], [perm]: value },
      },
    }))
  }

  async function handleSavePermissions() {
    if (!ws || isMemberUser) return
    setSavingPerms(true)
    try {
      const payload = clone(rolePerms)
      // Owner role always immutable/full
      payload.owner = normalizeShowAndLogic(makeAll(true))
      if (isAdmin) {
        payload.admin = clone(rolePerms.admin || defaultGranularRolePerms().admin) // admins cannot alter admin tier
      }
      const normalized = normalizeGranularRolePerms(payload)
      const updated = await updateWorkspace(ws.id, { settings: { rolePermissions: normalized } })
      const nextWs = { ...ws, ...(updated || {}), settings: { ...(ws.settings || {}), ...(updated?.settings || {}), rolePermissions: normalized } }
      setWs(nextWs)
      setCurrentWorkspace(nextWs)
      setRolePerms(normalized)
      toast.success('Role permissions saved')
    } catch (err) {
      toast.error(err.message || 'Could not save permissions')
    } finally {
      setSavingPerms(false)
    }
  }

  const ROLE_SUGGESTIONS = [
    {
      key: 'project_lead',
      title: 'Project Lead',
      description: 'Scope: Full operational authority across the assigned project.\n\nPermissions: Edit project details, manage milestones, assign team members, upload attachments/notes, full Task/Bug Kanban CRUD & stage management, reports, and markdown access.',
      short: 'Full project operations, milestones, team, stages, reports, and markdown.',
      template: {
        dash_cards: { v: true }, dash_projects: { v: true }, dash_proj_create: { e: true }, dash_queue: { v: true }, dash_activity: { v: true }, dash_bugs: { v: true },
        proj_dir: { v: true, e: true, d: false }, proj_overview: { v: true, e: true }, proj_team: { v: true, e: true, d: true }, proj_milestones: { v: true, e: true, d: true }, proj_tasks: { v: true, e: true, d: true }, proj_bugs: { v: true, e: true, d: true }, proj_attach: { v: true, e: true, d: true }, proj_activity: { v: true }, proj_notes: { v: true, e: true, d: true },
        task_cards: { v: true }, task_kanban: { v: true, e: true, d: true }, task_drag: { e: true }, task_stage_cards: { v: true }, task_stages: { v: true, e: true, d: true },
        bug_cards: { v: true }, bug_kanban: { v: true, e: true, d: true }, bug_drag: { e: true }, bug_stage_cards: { v: true }, bug_stages: { v: true, e: true, d: true },
        cal_view: { v: true, e: true, d: true },
        rep_kpi: { v: true }, rep_list: { v: true }, rep_drilldown: { v: true },
        md_journal: { v: true, e: true, d: true }, md_pages: { v: true, e: true, d: true },
        ws_global: { v: true, e: true, d: false },
        set_account: { v: true, e: true }, set_general: { v: false, e: false }, set_appearance: { v: true, e: true }, set_teams: { v: false, e: false, d: false }, set_roles: { v: false, e: false }, set_notif: { v: true, e: true }, set_storage: { v: false, e: false, d: false }, set_about: { v: true },
      },
    },
    {
      key: 'editor',
      title: 'Editor (Contributor)',
      description: 'Scope: Day-to-day building and execution without structural configuration.\n\nPermissions: View project overview/milestones, create/edit tasks and bugs, drag-and-drop Kanban cards, manage markdown notes, and view reports. Cannot modify workflow stages.',
      short: 'Create/edit tasks & bugs, drag cards, markdown and reports. No stage config.',
      template: {
        dash_cards: { v: true }, dash_projects: { v: true }, dash_proj_create: { e: false }, dash_queue: { v: true }, dash_activity: { v: true }, dash_bugs: { v: true },
        proj_dir: { v: true, e: false, d: false }, proj_overview: { v: true, e: false }, proj_team: { v: true, e: false, d: false }, proj_milestones: { v: true, e: false, d: false }, proj_tasks: { v: true, e: true, d: false }, proj_bugs: { v: true, e: true, d: false }, proj_attach: { v: true, e: true, d: false }, proj_activity: { v: true }, proj_notes: { v: true, e: true, d: false },
        task_cards: { v: true }, task_kanban: { v: true, e: true, d: false }, task_drag: { e: true }, task_stage_cards: { v: true }, task_stages: { v: false, e: false, d: false },
        bug_cards: { v: true }, bug_kanban: { v: true, e: true, d: false }, bug_drag: { e: true }, bug_stage_cards: { v: true }, bug_stages: { v: false, e: false, d: false },
        cal_view: { v: true, e: true, d: false },
        rep_kpi: { v: true }, rep_list: { v: true }, rep_drilldown: { v: true },
        md_journal: { v: true, e: true, d: false }, md_pages: { v: true, e: true, d: false },
        ws_global: { v: true, e: false, d: false },
        set_account: { v: true, e: true }, set_general: { v: false, e: false }, set_appearance: { v: true, e: true }, set_teams: { v: false, e: false, d: false }, set_roles: { v: false, e: false }, set_notif: { v: true, e: true }, set_storage: { v: false, e: false, d: false }, set_about: { v: true },
      },
    },
    {
      key: 'qa_tester',
      title: 'QA / Tester',
      description: 'Scope: Bug verification, tracking, and triage.\n\nPermissions: Full bug Kanban CRUD and stage management, view task boards, upload bug attachments, and view project reports.',
      short: 'Bug triage/stages, task board view, bug attachments, and reports.',
      template: {
        dash_cards: { v: true }, dash_projects: { v: true }, dash_proj_create: { e: false }, dash_queue: { v: true }, dash_activity: { v: true }, dash_bugs: { v: true },
        proj_dir: { v: true, e: false, d: false }, proj_overview: { v: true, e: false }, proj_team: { v: true, e: false, d: false }, proj_milestones: { v: true, e: false, d: false }, proj_tasks: { v: true, e: false, d: false }, proj_bugs: { v: true, e: true, d: true }, proj_attach: { v: true, e: true, d: false }, proj_activity: { v: true }, proj_notes: { v: true, e: false, d: false },
        task_cards: { v: true }, task_kanban: { v: true, e: false, d: false }, task_drag: { e: false }, task_stage_cards: { v: true }, task_stages: { v: false, e: false, d: false },
        bug_cards: { v: true }, bug_kanban: { v: true, e: true, d: true }, bug_drag: { e: true }, bug_stage_cards: { v: true }, bug_stages: { v: true, e: true, d: true },
        cal_view: { v: true, e: false, d: false },
        rep_kpi: { v: true }, rep_list: { v: true }, rep_drilldown: { v: true },
        md_journal: { v: false, e: false, d: false }, md_pages: { v: false, e: false, d: false },
        ws_global: { v: true, e: false, d: false },
        set_account: { v: true, e: true }, set_general: { v: false, e: false }, set_appearance: { v: true, e: true }, set_teams: { v: false, e: false, d: false }, set_roles: { v: false, e: false }, set_notif: { v: true, e: true }, set_storage: { v: false, e: false, d: false }, set_about: { v: true },
      },
    },
    {
      key: 'commenter',
      title: 'Commenter',
      description: 'Scope: Feedback and stakeholder review only.\n\nPermissions: View project overview, milestones, activity feeds, notes, attachments, and schedules. Can comment on tasks/bugs but cannot create, edit, or move cards.',
      short: 'Read-only review access with comment-focused collaboration.',
      template: {
        dash_cards: { v: true }, dash_projects: { v: true }, dash_proj_create: { e: false }, dash_queue: { v: true }, dash_activity: { v: true }, dash_bugs: { v: true },
        proj_dir: { v: true, e: false, d: false }, proj_overview: { v: true, e: false }, proj_team: { v: true, e: false, d: false }, proj_milestones: { v: true, e: false, d: false }, proj_tasks: { v: true, e: false, d: false }, proj_bugs: { v: true, e: false, d: false }, proj_attach: { v: true, e: false, d: false }, proj_activity: { v: true }, proj_notes: { v: true, e: false, d: false },
        task_cards: { v: true }, task_kanban: { v: true, e: false, d: false }, task_drag: { e: false }, task_stage_cards: { v: false }, task_stages: { v: false, e: false, d: false },
        bug_cards: { v: true }, bug_kanban: { v: true, e: false, d: false }, bug_drag: { e: false }, bug_stage_cards: { v: false }, bug_stages: { v: false, e: false, d: false },
        cal_view: { v: true, e: false, d: false },
        rep_kpi: { v: true }, rep_list: { v: true }, rep_drilldown: { v: true },
        md_journal: { v: true, e: false, d: false }, md_pages: { v: true, e: false, d: false },
        ws_global: { v: true, e: false, d: false },
        set_account: { v: true, e: true }, set_general: { v: false, e: false }, set_appearance: { v: true, e: true }, set_teams: { v: false, e: false, d: false }, set_roles: { v: false, e: false }, set_notif: { v: true, e: true }, set_storage: { v: false, e: false, d: false }, set_about: { v: true },
      },
    },
    {
      key: 'viewer',
      title: 'Viewer',
      description: 'Scope: Strict read-only access.\n\nPermissions: View summary KPIs, project overviews, milestones, activity logs, task/bug boards, calendar schedules, and reports. No edit or markdown access.',
      short: 'Strict read-only access to projects, boards, calendar, and reports.',
      template: {
        dash_cards: { v: true }, dash_projects: { v: true }, dash_proj_create: { e: false }, dash_queue: { v: true }, dash_activity: { v: true }, dash_bugs: { v: true },
        proj_dir: { v: true, e: false, d: false }, proj_overview: { v: true, e: false }, proj_team: { v: true, e: false, d: false }, proj_milestones: { v: true, e: false, d: false }, proj_tasks: { v: true, e: false, d: false }, proj_bugs: { v: true, e: false, d: false }, proj_attach: { v: true, e: false, d: false }, proj_activity: { v: true }, proj_notes: { v: true, e: false, d: false },
        task_cards: { v: true }, task_kanban: { v: true, e: false, d: false }, task_drag: { e: false }, task_stage_cards: { v: false }, task_stages: { v: false, e: false, d: false },
        bug_cards: { v: true }, bug_kanban: { v: true, e: false, d: false }, bug_drag: { e: false }, bug_stage_cards: { v: false }, bug_stages: { v: false, e: false, d: false },
        cal_view: { v: true, e: false, d: false },
        rep_kpi: { v: true }, rep_list: { v: true }, rep_drilldown: { v: true },
        md_journal: { v: false, e: false, d: false }, md_pages: { v: false, e: false, d: false },
        ws_global: { v: true, e: false, d: false },
        set_account: { v: true, e: true }, set_general: { v: false, e: false }, set_appearance: { v: true, e: true }, set_teams: { v: false, e: false, d: false }, set_roles: { v: false, e: false }, set_notif: { v: true, e: true }, set_storage: { v: false, e: false, d: false }, set_about: { v: true },
      },
    },
    {
      key: 'devops',
      title: 'DevOps / Infrastructure',
      description: 'Scope: System-level maintenance, automation, and pipeline triage.\n\nPermissions: Full dashboard, project edit access, full task/bug Kanban and stage management, full reports/calendar, markdown logs, plus database storage status and app settings. Excludes team/role workspace management.',
      short: 'System/pipeline operations, storage, full boards/stages, no team/role admin.',
      template: {
        dash_cards: { v: true }, dash_projects: { v: true }, dash_proj_create: { e: true }, dash_queue: { v: true }, dash_activity: { v: true }, dash_bugs: { v: true },
        proj_dir: { v: true, e: true, d: false }, proj_overview: { v: true, e: true }, proj_team: { v: true, e: false, d: false }, proj_milestones: { v: true, e: true, d: false }, proj_tasks: { v: true, e: true, d: true }, proj_bugs: { v: true, e: true, d: true }, proj_attach: { v: true, e: true, d: true }, proj_activity: { v: true }, proj_notes: { v: true, e: true, d: true },
        task_cards: { v: true }, task_kanban: { v: true, e: true, d: true }, task_drag: { e: true }, task_stage_cards: { v: true }, task_stages: { v: true, e: true, d: true },
        bug_cards: { v: true }, bug_kanban: { v: true, e: true, d: true }, bug_drag: { e: true }, bug_stage_cards: { v: true }, bug_stages: { v: true, e: true, d: true },
        cal_view: { v: true, e: true, d: true },
        rep_kpi: { v: true }, rep_list: { v: true }, rep_drilldown: { v: true },
        md_journal: { v: true, e: true, d: true }, md_pages: { v: true, e: true, d: true },
        ws_global: { v: true, e: false, d: false },
        set_account: { v: true, e: true }, set_general: { v: true, e: true }, set_appearance: { v: true, e: true }, set_teams: { v: false, e: false, d: false }, set_roles: { v: false, e: false }, set_notif: { v: true, e: true }, set_storage: { v: true, e: true, d: true }, set_about: { v: true },
      },
    },
    {
      key: 'guest_vendor',
      title: 'Guest / External Vendor',
      description: 'Scope: Single-project contractor access with strict workspace isolation.\n\nPermissions: Limited strictly to their assigned project\'s dashboard metrics, tasks, bugs, and calendar schedules. Workspace-wide reports, markdown journals, workspace switcher, and core settings are hidden.',
      short: 'Isolated assigned-project access: metrics, tasks, bugs, calendar only.',
      template: {
        dash_cards: { v: true }, dash_projects: { v: false }, dash_proj_create: { e: false }, dash_queue: { v: false }, dash_activity: { v: false }, dash_bugs: { v: false },
        proj_dir: { v: true, e: false, d: false }, proj_overview: { v: true, e: false }, proj_team: { v: false, e: false, d: false }, proj_milestones: { v: false, e: false, d: false }, proj_tasks: { v: true, e: false, d: false }, proj_bugs: { v: true, e: false, d: false }, proj_attach: { v: false, e: false, d: false }, proj_activity: { v: false }, proj_notes: { v: false, e: false, d: false },
        task_cards: { v: true }, task_kanban: { v: true, e: false, d: false }, task_drag: { e: false }, task_stage_cards: { v: false }, task_stages: { v: false, e: false, d: false },
        bug_cards: { v: true }, bug_kanban: { v: true, e: false, d: false }, bug_drag: { e: false }, bug_stage_cards: { v: false }, bug_stages: { v: false, e: false, d: false },
        cal_view: { v: true, e: false, d: false },
        rep_kpi: { v: false }, rep_list: { v: false }, rep_drilldown: { v: false },
        md_journal: { v: false, e: false, d: false }, md_pages: { v: false, e: false, d: false },
        ws_global: { v: false, e: false, d: false },
        set_account: { v: true, e: true }, set_general: { v: false, e: false }, set_appearance: { v: true, e: true }, set_teams: { v: false, e: false, d: false }, set_roles: { v: false, e: false }, set_notif: { v: false, e: false }, set_storage: { v: false, e: false, d: false }, set_about: { v: false },
      },
    },
  ]

  function buildRoleTemplateFromPreset(presetKey) {
    const preset = ROLE_SUGGESTIONS.find(p => p.key === presetKey)
    const base = templateToRole('member')
    if (!preset || !preset.template) return base
    for (const mod of PERM_MATRIX) {
      for (const f of mod.features) {
        const t = preset.template[f.id] || {}
        base[mod.key].features[f.id] = {
          view: !!(f.cap?.v && t.v),
          edit: !!(f.cap?.e && t.e),
          delete: !!(f.cap?.d && t.d),
        }
      }
    }
    // logical normalization and show flags
    for (const mod of PERM_MATRIX) {
      let any = false
      for (const f of mod.features) {
        const p = base[mod.key].features[f.id]
        if ((p.edit || p.delete) && f.cap?.v) p.view = true
        if (!p.view && f.cap?.v) { p.edit = false; p.delete = false }
        if (!f.cap?.v) p.view = false
        if (!f.cap?.e) p.edit = false
        if (!f.cap?.d) p.delete = false
        if (p.view || p.edit || p.delete) any = true
      }
      base[mod.key].show = any
      if (!any) {
        for (const f of mod.features) base[mod.key].features[f.id] = { view: false, edit: false, delete: false }
      }
    }
    return normalizeShowAndLogic(base)
  }

  function __openAddRoleModal() {
    if (!isOwner) return
    setNewRoleTitle('')
    setNewRoleDesc('')
    setSelectedRolePresetKey(null)
    setShowRoleSuggestions(false)
    setShowAddRoleModal(true)
  }

  function applyRoleSuggestion(preset) {
    if (!preset) return
    setSelectedRolePresetKey(preset.key)
    setNewRoleTitle(preset.title)
    setNewRoleDesc(preset.description || '')
    setShowRoleSuggestions(false)
  }


  function openEditRoleModal(roleKey) {
    if (!roleKey || roleKey === 'owner') return
    const isCustomRole = !['admin', 'member'].includes(roleKey)
    if (isCustomRole && !isOwner) return
    if (!isCustomRole && !(isOwner || (isAdmin && roleKey === 'member'))) return
    const meta = getRoleMeta(roleKey)
    setEditRoleModal({ key: roleKey, title: meta.title || roleKey, description: meta.description || '' })
  }

  function saveEditRoleModal() {
    if (!editRoleModal?.key) return
    const key = editRoleModal.key
    const title = String(editRoleModal.title || '').trim()
    if (!title) { toast.error('Role title is required'); return }
    const description = String(editRoleModal.description || '').trim()
    setRolePerms(cur => {
      const next = clone(cur || {})
      if (!next[key] || typeof next[key] !== 'object') return cur
      next[key]._meta = { ...(next[key]._meta || {}), title, description }
      return next
    })
    setEditRoleModal(null)
    toast.success('Role details updated. Save permissions to apply.')
  }

  function deleteCustomRole(roleKey) {
    if (!isOwner || !roleKey || ['admin', 'member', 'owner'].includes(roleKey)) return
    setRolePerms(cur => {
      const next = clone(cur || {})
      delete next[roleKey]
      return next
    })
    if (selectedRole === roleKey) setSelectedRole('admin')
    setConfirmDeleteRole(null)
    toast.success('Role removed from this workspace configuration. Save permissions to apply.')
  }

  function handleCreateCustomRole() {
    if (!isOwner) return
    const title = String(newRoleTitle || '').trim()
    if (!title) {
      toast.error('Role title is required')
      return
    }
    const description = String(newRoleDesc || '').trim()
    const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'custom_role'
    let createdSlug = slugBase
    setRolePerms((cur) => {
      const next = clone(cur || {})
      let slug = slugBase
      let i = 2
      while (next[slug] || slug === 'owner' || slug.startsWith('_')) { slug = `${slugBase}_${i++}` }
      createdSlug = slug
      const roleObj = selectedRolePresetKey ? buildRoleTemplateFromPreset(selectedRolePresetKey) : clone(templateToRole('member'))
      roleObj._meta = { title, description }
      next[slug] = roleObj
      return next
    })
    setSelectedRole(createdSlug)
    setShowAddRoleModal(false)
    setNewRoleTitle('')
    setNewRoleDesc('')
    setSelectedRolePresetKey(null)
    setShowRoleSuggestions(false)
    toast.success(`Added role "${title}". Configure its permissions and save.`)
  }

  async function loadMembers() {
    if (!ws) return
    setMembersLoading(true)
    setTeamMsg(null)
    try {
      const rows = await getMembers(ws.id)
      setMembers(Array.isArray(rows) ? rows : [])
    } catch (err) {
      setTeamMsg({ type: 'error', text: err.message || 'Could not load members' })
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tab === 'team') loadMembers()
     
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  useEffect(() => {
    if (tab !== 'team' || !ws) return
    let alive = true
    async function loadProjectAccessData() {
      setProjAccessLoading(true)
      try {
        const [projRows, memberRows] = await Promise.all([
          getProjects(ws.id),
          (members && members.length) ? Promise.resolve(members) : getMembers(ws.id).catch(() => []),
        ])
        if (!alive) return
        setProjects(Array.isArray(projRows) ? projRows : [])
        if (!(members && members.length) && Array.isArray(memberRows)) setMembers(memberRows)
        if (isOwner) {
          try {
            const rows = await getWorkspaceProjectMemberships(ws.id)
            if (!alive) return
            const map = {}
            for (const r of (Array.isArray(rows) ? rows : [])) {
              const uid = String(r.user_id)
              if (!map[uid]) map[uid] = []
              map[uid].push({ project_id: r.project_id, role: normalizePermissionRole(r.project_role || r.role || 'member') })
            }
            setUserProjectMap(map)
          } catch {
            if (alive) setUserProjectMap({})
          }
        } else {
          setUserProjectMap({})
        }
      } catch {
        if (alive) { setProjects([]); setUserProjectMap({}) }
      } finally {
        if (alive) setProjAccessLoading(false)
      }
    }
    loadProjectAccessData()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, ws?.id, currentUserRole])

  function getUserAssignments(userId) {
    const rows = userProjectMap[String(userId)] || []
    return rows.map((a) => ({ ...a, project_id: a.project_id || a.id, role: a.role || a.project_role || 'member' }))
  }

  function getAvailablePermissionRoles() {
    const perms = normalizeGranularRolePerms(ws?.settings?.rolePermissions)
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
    const total = totalProjects != null ? totalProjects : (projects || []).filter(p => !ws?.id || !p?.workspace_id || String(p.workspace_id) === String(ws.id)).length
    if (member.role === 'owner') return { label: 'All Visible', type: 'all', sub: 'Universal Workspace Scope' }
    if (assignmentCount === 0) return { label: 'Pending Setup', type: 'pending', sub: `0 of ${total} projects` }
    if (total > 0 && assignmentCount === total) return { label: 'All Visible', type: 'all', sub: `${assignmentCount} of ${total} projects visible` }
    return { label: 'Custom Restricted', type: 'custom', sub: `${assignmentCount} of ${total} projects visible` }
  }

  function _memberProjectPermissionRole(member) {
    return defaultPermissionRoleForMember(member)
  }

  function openAccessDrawer(memberId) {
    if (!isOwner) return
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
    const wsProjects = (projects || []).filter(p => !ws?.id || !p?.workspace_id || String(p.workspace_id) === String(ws.id))
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
    if (!ws || !isOwner || !drawerMemberId) return
    const uid = String(drawerMemberId)
    const member = members.find(m => String(m.id) === uid)
    setSavingUserAccess(uid)
    try {
      const next = clone(draftAssignments)
      const nextWorkspaceRole = normalizePermissionRole(draftWorkspaceRole)
      if (member && member.role !== 'owner' && member.role !== nextWorkspaceRole) {
        await updateMemberRole(ws.id, uid, nextWorkspaceRole)
        setMembers(cur => (cur || []).map(m => String(m.id) === uid ? { ...m, role: nextWorkspaceRole } : m))
      }
      const saved = await setUserProjectMemberships(ws.id, uid, next)
      setUserProjectMap(cur => ({ ...cur, [uid]: Array.isArray(saved) ? saved : next }))
      window.dispatchEvent(new CustomEvent('thoth:data-changed', { detail: { type: 'project-access', workspaceId: ws.id, userId: uid } }))
      toast.success('Access updated')
      setDrawerOpen(false)
      setDrawerMemberId(null)
      setDraftAssignments([])
      setDrawerSearch('')
      setDraftWorkspaceRole('member')
    } catch (err) {
      toast.error(err?.message || 'Could not update access')
    } finally {
      setSavingUserAccess(null)
    }
  }

  async function loadAvailableUsers(search = '') {
    if (!ws?.id) return
    setAvailableUsersLoading(true)
    try {
      const token = localStorage.getItem('token')
      const q = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''
      const res = await fetch(`/api/workspaces/${encodeURIComponent(ws.id)}/available-users${q}`, {
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
    if (!showAddMemberModal || !ws?.id) return
    const t = setTimeout(() => { loadAvailableUsers(addMemberSearch) }, 200)
    return () => clearTimeout(t)
  }, [showAddMemberModal, addMemberSearch, ws?.id])

  async function handleAddMemberFromModal(user) {
    if (!ws?.id || !user?.email) return
    setAddingMemberId(user.id)
    setTeamMsg(null)
    try {
      await addMember(ws.id, user.email)
      setTeamMsg({ type: 'ok', text: `${user.full_name || user.username || user.email} added to workspace` })
      await loadMembers()
      await loadAvailableUsers(addMemberSearch)
    } catch (err) {
      setTeamMsg({ type: 'error', text: err.message || 'Could not add member' })
    } finally {
      setAddingMemberId(null)
    }
  }

  async function _handleRoleSave() {
    if (!ws || !editingRole) return
    const target = members.find((m) => m.id === editingRole.userId)
    if (isAdmin && (target?.role === 'owner' || editingRole.role === 'owner' || editingRole.role === 'admin' && target?.role === 'admin')) {
      // allow admin to change non-owner/non-admin tiers as needed? "cannot alter Owner or Admin access tiers"
      // block any change involving owner/admin tiers
    }
    if (isAdmin && (target?.role === 'owner' || target?.role === 'admin' || editingRole.role === 'owner' || editingRole.role === 'admin')) {
      setTeamMsg({ type: 'error', text: 'Admins cannot alter Owner or Admin access tiers.' })
      setEditingRole(null)
      return
    }
    if (target?.role === 'owner' && editingRole.role !== 'owner') {
      setTeamMsg({ type: 'error', text: 'Workspace Owner role cannot be changed here.' })
      setEditingRole(null)
      return
    }
    _setTeamBusy(true)
    setTeamMsg(null)
    try {
      await updateMemberRole(ws.id, editingRole.userId, editingRole.role)
      setEditingRole(null)
      await loadMembers()
    } catch (err) {
      setTeamMsg({ type: 'error', text: err.message || 'Could not update role' })
    } finally {
      _setTeamBusy(false)
    }
  }

  async function handleRemoveMember(m) {
    if (!ws) return
    if (m.role === 'owner' && isAdmin) {
      setTeamMsg({ type: 'error', text: 'Admins cannot remove the Workspace Owner.' })
      return
    }
    if (m.role === 'owner') {
      setTeamMsg({ type: 'error', text: 'Workspace Owner cannot be removed from the workspace.' })
      return
    }
    if (!window.confirm(`Remove ${m.full_name || m.username} from this workspace?`)) return
    _setTeamBusy(true)
    setTeamMsg(null)
    try {
      await removeMember(ws.id, m.id)
      setTeamMsg({ type: 'ok', text: 'Member removed' })
      await loadMembers()
    } catch (err) {
      setTeamMsg({ type: 'error', text: err.message || 'Could not remove member' })
    } finally {
      _setTeamBusy(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (!pwdCurrent || !pwdNext) {
      setPwdMsg({ type: 'error', text: 'Fill in both password fields' })
      return
    }
    if (pwdNext.length < 6) {
      setPwdMsg({ type: 'error', text: 'New password must be at least 6 characters' })
      return
    }
    if (pwdNext !== pwdConfirm) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match' })
      return
    }
    setPwdBusy(true)
    setPwdMsg(null)
    try {
      await changePassword(pwdCurrent, pwdNext)
      setPwdMsg({ type: 'ok', text: 'Password updated' })
      setPwdCurrent('')
      setPwdNext('')
      setPwdConfirm('')
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.message || 'Could not change password' })
    } finally {
      setPwdBusy(false)
    }
  }

  function openDeleteModal() {
    setDeleteMsg(null)
    setDeleteConfirmText('')
    setShowDeleteModal(true)
  }

  function closeDeleteModal() {
    if (deleting) return
    setShowDeleteModal(false)
    setDeleteConfirmText('')
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE ACCOUNT') return
    setDeleting(true)
    setDeleteMsg(null)
    try {
      await deleteAccount()
      clearSession()
    } catch (err) {
      setDeleteMsg(err.message || 'Could not delete account')
      setDeleting(false)
    }
  }

  return (
    <div className="settings-wrap">
      <aside className="settings-side">
        {navItems.map((group) => (
          <div key={group.group} className="settings-side-group">
            <div className="settings-side-head">{group.group}</div>
            {group.items.map((item) => {
              const Icon = item.Icon
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`settings-side-item${tab === item.key ? ' active' : ''}`}
                  onClick={() => setTab(item.key)}
                >
                  <Icon size={13} /> {item.label}
                </button>
              )
            })}
          </div>
        ))}
      </aside>

      <div className="settings-content">
        {tab === 'account' && (
          <>
            <div className="settings-card">
              <div className="settings-card-title">Account</div>
              <p className="settings-card-desc">Your sign-in details for Thoth.</p>
              <div className="settings-field" style={{ marginBottom: 0 }}>
                <label className="settings-label">Email used</label>
                <input className="settings-input" value={user?.email || ''} readOnly />
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-title">Password</div>
              <p className="settings-card-desc">Change the password you sign in with.</p>
              <form onSubmit={handleChangePassword}>
                <div className="settings-field">
                  <label className="settings-label">Current password</label>
                  <input className="settings-input" type="password" value={pwdCurrent} onChange={(e) => setPwdCurrent(e.target.value)} autoComplete="current-password" />
                </div>
                <div className="settings-field">
                  <label className="settings-label">New password</label>
                  <input className="settings-input" type="password" value={pwdNext} onChange={(e) => setPwdNext(e.target.value)} autoComplete="new-password" />
                </div>
                <div className="settings-field">
                  <label className="settings-label">Confirm new password</label>
                  <input className="settings-input" type="password" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} autoComplete="new-password" />
                </div>
                {pwdMsg && <div style={msgStyle(pwdMsg.type)}>{pwdMsg.text}</div>}
                <button type="submit" className="btn primary" disabled={pwdBusy} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {pwdBusy ? 'Saving…' : 'Change password'}
                </button>
              </form>
            </div>

            <div className="settings-card">
              <div className="settings-card-title">Sign out</div>
              <p className="settings-card-desc">End your current session on this device.</p>
              <button type="button" className="btn" onClick={clearSession} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <LogOut size={12} /> Log out
              </button>
            </div>

            <div className="settings-card" style={{ borderColor: 'rgba(255,64,64,0.35)' }}>
              <div className="settings-card-title" style={{ color: '#ff6b6b' }}>Delete account</div>
              <p className="settings-card-desc">Permanently delete your account and all associated data. This action cannot be undone.</p>
              {deleteMsg && <div style={msgStyle('error')}>{deleteMsg}</div>}
              <button
                type="button"
                onClick={openDeleteModal}
                disabled={deleting}
                style={{
                  background: 'rgba(255,64,64,0.12)', color: '#ff6b6b',
                  border: '1px solid rgba(255,64,64,0.45)', borderRadius: '4px',
                  padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px',
                }}
              >
                <Trash2 size={12} /> Delete account
              </button>
            </div>

            {showDeleteModal && (
              <div
                onClick={closeDeleteModal}
                style={{
                  position: 'fixed', inset: 0, zIndex: 1300,
                  background: 'rgba(0,0,0,0.6)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: '16px',
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%', maxWidth: '440px',
                    background: 'var(--panel2)', border: '1px solid rgba(255,64,64,0.35)',
                    borderRadius: '8px', padding: '20px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{
                      width: '28px', height: '28px', borderRadius: '8px',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(255,64,64,0.14)', color: '#ff6b6b',
                    }}>
                      <Trash2 size={14} />
                    </span>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-strong)' }}>Delete account</h2>
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text-soft)', lineHeight: 1.6 }}>
                    This will permanently delete your account and associated data. This action cannot be undone.
                  </p>
                  <div style={{
                    marginBottom: '12px', padding: '10px 12px', borderRadius: '6px',
                    background: 'rgba(255,64,64,0.08)', border: '1px solid rgba(255,64,64,0.2)',
                    fontSize: '11.5px', color: 'var(--text-soft)', lineHeight: 1.5,
                  }}>
                    To confirm, type <strong style={{ color: '#ff6b6b', letterSpacing: '0.03em' }}>DELETE ACCOUNT</strong> below.
                  </div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                    Confirmation
                  </label>
                  <input
                    className="settings-input"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE ACCOUNT"
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {deleteMsg && <div style={{ ...msgStyle('error'), marginTop: '10px' }}>{deleteMsg}</div>}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button type="button" className="btn" onClick={closeDeleteModal} disabled={deleting} style={{ cursor: 'pointer' }}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deleting || deleteConfirmText !== 'DELETE ACCOUNT'}
                      style={{
                        background: '#dc2626', color: '#fff',
                        border: '1px solid #dc2626', borderRadius: '4px',
                        padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: deleting || deleteConfirmText !== 'DELETE ACCOUNT' ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', opacity: deleting || deleteConfirmText !== 'DELETE ACCOUNT' ? 0.55 : 1,
                      }}
                    >
                      {deleting ? 'Deleting…' : 'Permanently delete account'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'general' && (
          <div className="settings-card">
            <div className="settings-card-title">Workspace</div>
            <p className="settings-card-desc">Basic information about your current workspace.</p>
            <div className="settings-field">
              <label className="settings-label">Workspace name</label>
              <input className="settings-input" value={wsName} maxLength={16} onChange={(e) => setWsName(e.target.value.slice(0, 16))} placeholder="My workspace" />
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted2)', textAlign: 'right' }}>{wsName.length}/16</div>
            </div>
            {wsError && <div style={msgStyle('error')}>{wsError}</div>}
            <button
              type="button"
              className="btn primary"
              onClick={handleSaveGeneral}
              disabled={savingWs}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={12} /> {savingWs ? 'Saving…' : wsSaved ? 'Saved' : 'Save changes'}
            </button>
          </div>
        )}

        {tab === 'appearance' && (
          <>
            <div className="settings-card">
              <div className="settings-card-title">Theme</div>
              <p className="settings-card-desc">Choose how Thoth looks across your devices.</p>
              <div className="settings-seg">
                <button type="button" className={`settings-seg-btn${settings.theme === 'light' ? ' active' : ''}`} onClick={() => save({ theme: 'light' })}>
                  <Sun size={13} /> Light
                </button>
                <button type="button" className={`settings-seg-btn${settings.theme === 'dark' ? ' active' : ''}`} onClick={() => save({ theme: 'dark' })}>
                  <Moon size={13} /> Dark
                </button>
                <button type="button" className={`settings-seg-btn${settings.theme === 'system' ? ' active' : ''}`} onClick={() => save({ theme: 'system' })}>
                  <Monitor size={13} /> System
                </button>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-title">Interface Font</div>
              <p className="settings-card-desc">Font used across the entire application.</p>
              <div className="settings-field" style={{ marginBottom: 0 }}>
                <select
                  className="settings-select"
                  value={settings.font}
                  onChange={(e) => save({ font: e.target.value })}
                  style={{ fontFamily: settings.font }}
                >
                  {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                </select>
                <div className="font-preview" style={{ fontFamily: settings.font }}>
                  The quick brown fox jumps over the lazy dog. 1234567890
                </div>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-title">Layout</div>
              <p className="settings-card-desc">Tune the density of the interface.</p>
              <div className="settings-row">
                <div className="settings-row-info">
                  <h4>Compact mode</h4>
                  <p>Reduce spacing and row heights to fit more on screen.</p>
                </div>
                <Toggle
                  label="Compact mode"
                  checked={settings.compact}
                  onChange={(v) => save({ compact: v })}
                />
              </div>
            </div>
          </>
        )}

        {tab === 'roles' && allowedTabs.includes('roles') && (isOwner || isAdmin) && (
          <div className="settings-card" style={{ padding: 0, overflow: 'hidden' }}>
            {(() => {
              const currentRole = (ws?.role || 'member').toLowerCase()
              const isOwnerUser = currentRole === 'owner'
              const isAdminUser = currentRole === 'admin'
              const isMemberUserRole = !isOwnerUser && !isAdminUser
              const editable = !isMemberUserRole && !(isAdminUser && selectedRole !== 'member') && selectedRole !== 'owner'
              const search = ((rolePerms && rolePerms._uiSearch) || '').toLowerCase()
              const collapsed = (rolePerms && rolePerms._collapsed) || {}
              const selectedRoleTitle = getRoleMeta(selectedRole).title
              const _bannerHtml = isMemberUserRole
                ? `<strong>Read-Only Access (${ws?.name || 'Workspace'}):</strong> You are signed in as a Workspace Member. Role and permission configuration requires Workspace Owner or Admin privileges.`
                : isAdminUser
                  ? `<strong>Admin Role Control (${ws?.name || 'Workspace'}):</strong> You are configuring permissions for the <strong>Member</strong> role. Owner and Admin privilege tabs are restricted.`
                  : `<strong>Owner Management (${ws?.name || 'Workspace'}):</strong> Configuring permissions for <strong>${selectedRoleTitle}</strong>.`
              const jumpToModule = (key) => {
                setRolePerms(cur => ({ ...(cur || {}), _collapsed: { ...((cur && cur._collapsed) || {}), [key]: false } }))
                requestAnimationFrame(() => {
                  const el = document.getElementById(`rpm-mod-${key}`)
                  const wrap = document.getElementById('rpm-table-wrap')
                  if (el && wrap) wrap.scrollTo({ top: el.offsetTop - 44, behavior: 'smooth' })
                })
              }
              const toggleSection = (key) => setRolePerms(cur => ({ ...(cur || {}), _collapsed: { ...((cur && cur._collapsed) || {}), [key]: !((cur && cur._collapsed) || {})[key] } }))
              const toggleAllSections = (collapseVal) => setRolePerms(cur => ({ ...(cur || {}), _collapsed: Object.fromEntries(PERM_MATRIX.map(m => [m.key, collapseVal])) }))
              const setSearch = (v) => setRolePerms(cur => ({ ...(cur || {}), _uiSearch: v }))
              const roleTabKeys = Object.keys(rolePerms || {}).filter(k => !k.startsWith('_') && k !== 'owner' && canViewRoleTab(k))
              const _selectedRoleMeta = (rolePerms?.[selectedRole]?._meta || {})
              const isCustomSelectedRole = !['admin', 'member', 'owner'].includes(selectedRole)
              const resetDefaults = () => {
                if (!editable) return
                setRolePerms(cur => {
                  const next = clone(cur || {})
                  const base = defaultGranularRolePerms()[selectedRole] || templateToRole('member')
                  const meta = next?.[selectedRole]?._meta
                  next[selectedRole] = clone(base)
                  if (meta) next[selectedRole]._meta = { ...meta }
                  next._uiSearch = (cur && cur._uiSearch) || ''
                  next._collapsed = (cur && cur._collapsed) || {}
                  return next
                })
                toast.success(`Reset ${String(selectedRole).toUpperCase()} permissions to default template.`)
              }
              const _ROLE_PRESETS = [
                { key: 'project_lead', title: 'Project Lead', description: 'Scope: Full operational authority across the assigned project. Permissions: Edit project details, manage milestones, assign team members, upload attachments/notes, full Task/Bug Kanban CRUD & stage management, reports, and markdown access.', base: 'admin' },
                { key: 'editor', title: 'Editor (Contributor)', description: 'Scope: Day-to-day building and execution without structural configuration. Permissions: View project overview/milestones, create/edit tasks and bugs, drag-and-drop Kanban cards, manage markdown notes, and view reports. Cannot modify workflow stages.', base: 'member' },
                { key: 'qa_tester', title: 'QA / Tester', description: 'Scope: Bug verification, tracking, and triage. Permissions: Full bug Kanban CRUD and stage management, view task boards, upload bug attachments, and view project reports.', base: 'member' },
                { key: 'commenter', title: 'Commenter', description: 'Scope: Feedback and stakeholder review only. Permissions: View project overview, milestones, activity feeds, notes, attachments, and schedules. Can comment on tasks/bugs but cannot create, edit, or move cards.', base: 'member' },
                { key: 'viewer', title: 'Viewer', description: 'Scope: Strict read-only access. Permissions: View summary KPIs, project overviews, milestones, activity logs, task/bug boards, calendar schedules, and reports. No edit or markdown access.', base: 'member' },
                { key: 'devops', title: 'DevOps / Infrastructure', description: 'Scope: System-level maintenance, automation, and pipeline triage. Permissions: Full dashboard, project edit access, full task/bug Kanban and stage management, full reports/calendar, markdown logs, plus database storage status and app settings. Excludes team/role workspace management.', base: 'admin' },
                { key: 'guest_vendor', title: 'Guest / External Vendor', description: 'Scope: Single-project contractor access with strict workspace isolation. Permissions: Limited strictly to assigned project dashboard metrics, tasks, bugs, and calendar schedules. Workspace-wide reports, markdown journals, workspace switcher, and core settings are hidden.', base: 'member' },
              ]
              const _addRoleFromPreset = (preset) => {
                if (!isOwnerUser || !preset) return
                let createdSlug = preset.key
                const existing = rolePerms || {}
                let slug = preset.key
                let i = 2
                while (existing[slug] || slug === 'owner' || slug.startsWith('_')) { slug = `${preset.key}_${i++}` }
                createdSlug = slug
                setRolePerms(cur => {
                  const next = clone(cur || {})
                  next[createdSlug] = clone(templateToRole(preset.base || 'member'))
                  next[createdSlug]._meta = { title: preset.title, description: preset.description || '' }
                  return next
                })
                setSelectedRole(createdSlug)
                toast.success(`Added role "${preset.title}". Configure its permissions and save.`)
              }
              const _openAddRoleModal = () => {
                if (!isOwnerUser) return
                setNewRoleTitle('')
                setNewRoleDesc('')
                setShowAddRoleModal(true)
              }
              const updateCell = (featId, type, val) => {
                if (!editable) return
                setRolePerms(cur => {
                  const next = clone(cur || {})
                  let group = null, feat = null
                  for (const g of PERM_MATRIX) { const f = g.features.find(x => x.id === featId); if (f) { group = g; feat = f; break } }
                  if (!group || !feat) return cur
                  if (!next[selectedRole]) next[selectedRole] = clone(defaultGranularRolePerms()[selectedRole] || templateToRole('member'))
                  const p = { ...((next[selectedRole][group.key] && next[selectedRole][group.key].features && next[selectedRole][group.key].features[featId]) || { view: false, edit: false, delete: false }) }
                  if (type === 'v') { p.view = !!val; if (!p.view) { p.edit = false; p.delete = false } }
                  if (type === 'e') { p.edit = !!val; if (p.edit && feat.cap.v) p.view = true }
                  if (type === 'd') { p.delete = !!val; if (p.delete && feat.cap.v) p.view = true }
                  if (!feat.cap.v) p.view = false; if (!feat.cap.e) p.edit = false; if (!feat.cap.d) p.delete = false
                  next[selectedRole][group.key].features[featId] = p
                  let any = false
                  for (const f of group.features) { const fp = next[selectedRole][group.key].features[f.id]; if (fp.view || fp.edit || fp.delete) any = true }
                  next[selectedRole][group.key].show = any
                  if (!any) for (const f of group.features) next[selectedRole][group.key].features[f.id] = { view: false, edit: false, delete: false }
                  return next
                })
              }
              const toggleModuleVisibility = (moduleKey, val) => {
                if (!editable) return
                setRolePerms(cur => {
                  const next = clone(cur || {})
                  const group = PERM_MATRIX.find(g => g.key === moduleKey)
                  if (!group) return cur
                  if (!next[selectedRole]) next[selectedRole] = clone(defaultGranularRolePerms()[selectedRole] || templateToRole('member'))
                  let any = false
                  for (const f of group.features) {
                    let p = val ? { view: !!f.cap.v, edit: !f.cap.v && !!f.cap.e, delete: false } : { view: false, edit: false, delete: false }
                    if (!f.cap.v) p.view = false; if (!f.cap.e) p.edit = false; if (!f.cap.d) p.delete = false
                    if ((p.edit || p.delete) && f.cap.v) p.view = true
                    next[selectedRole][moduleKey].features[f.id] = p
                    if (p.view || p.edit || p.delete) any = true
                  }
                  next[selectedRole][moduleKey].show = any
                  if (!any) for (const f of group.features) next[selectedRole][moduleKey].features[f.id] = { view: false, edit: false, delete: false }
                  return next
                })
              }
              return (
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <style>{`
                    .rpm-role-tab{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:6px;border:1px solid var(--border);background:var(--panel3);color:var(--text-soft);font-size:11px;font-weight:600;cursor:pointer;transition:all .15s ease;white-space:nowrap}
                    .rpm-role-tab:hover{background:var(--hover);border-color:var(--hover-border);color:var(--text-strong)}
                    .rpm-role-tab.active{background:rgba(110,97,255,.14);border-color:rgba(110,97,255,.55);color:var(--text-strong)}
                    .rpm-role-tab .rpm-role-dot{width:5px;height:5px;border-radius:50%;background:var(--muted2);flex-shrink:0;transition:all .15s ease}
                    .rpm-role-tab.active .rpm-role-dot{background:#6e61ff;box-shadow:0 0 0 2px rgba(110,97,255,.2)}
                    .rpm-more-toggle{background:none;border:none;padding:2px 2px;margin-left:2px;color:var(--muted);font-size:11px;font-weight:500;text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px;cursor:pointer}
                    .rpm-more-toggle:hover{color:var(--text-soft)}
                    .rpm-add-role-btn{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;border-radius:6px;border:1px solid rgba(110,97,255,.45);background:#6e61ff;color:#fff;font-size:11px;font-weight:600;cursor:pointer;box-shadow:none;transition:all .15s ease}
                    .rpm-add-role-btn:hover{background:#7b70ff;border-color:rgba(110,97,255,.65)}
                    .rpm-add-role-btn:active{transform:translateY(1px)}
                    .rpm-search-wrap{position:relative;width:100%;max-width:280px}
                    .rpm-search{border:1px solid var(--border);border-radius:6px;padding:6px 10px 6px 30px;font-size:11px;width:100%;outline:none;background:var(--panel3);color:var(--text-soft)}
                    .rpm-search:focus{border-color:rgba(110,97,255,.5);box-shadow:0 0 0 2px rgba(110,97,255,.12)}
                    .rpm-cb{appearance:none;-webkit-appearance:none;width:16px;height:16px;border:1.5px solid var(--border);border-radius:4px;outline:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;background:var(--panel2);vertical-align:middle;transition:all .12s ease}
                    .rpm-cb:hover:not(:disabled){border-color:var(--hover-border);background:var(--hover)}
                    .rpm-cb:checked{background:#6e61ff;border-color:#6e61ff}
                    .rpm-cb:checked::after{content:"";width:4px;height:8px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg);margin-bottom:1px}
                    .rpm-cb:disabled{background:var(--panel3);border-color:var(--border-soft);cursor:not-allowed;opacity:.7}
                    .rpm-cb:disabled:checked{background:#5a52a8;border-color:#5a52a8;opacity:.75}
                    .rpm-reset{background:var(--panel3);border:1px solid var(--border);color:var(--text-soft);padding:7px 12px;font-size:11.5px;font-weight:600;border-radius:8px;cursor:pointer}
                    .rpm-reset:hover:not(:disabled){background:var(--hover);border-color:var(--hover-border);color:var(--text-strong)}
                    .rpm-reset:disabled{opacity:.45;cursor:not-allowed}
                    .rpm-pill{background:var(--panel3);border:1px solid var(--border);color:var(--text-soft);font-size:11px;font-weight:600;padding:5px 10px;border-radius:999px;cursor:pointer}
                    .rpm-pill:hover{background:var(--hover);border-color:var(--hover-border);color:var(--text-strong)}
                    .rpm-pill.off{opacity:.45;text-decoration:line-through}
                    .rpm-ghost{background:transparent;border:1px solid transparent;color:#9a90ff;font-size:11px;font-weight:600;cursor:pointer;padding:6px 8px;border-radius:8px}
                    .rpm-ghost:hover{background:rgba(110,97,255,.08);border-color:rgba(110,97,255,.2);color:#c3bcff}
                  `}</style>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Top bar: role pills + search */}
                  <div style={{ background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Workspace Roles</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, padding: '0 6px', borderRadius: 999, background: 'var(--panel3)', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 10, fontWeight: 700 }}>{roleTabKeys.length}</span>
                      </div>

                      <div className="rpm-search-wrap" style={{ maxWidth: 280 }}>
                        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted2)', pointerEvents: 'none' }} />
                        <input
                          type="text"
                          className="rpm-search"
                          placeholder={`Search permissions in ${getRoleMeta(selectedRole).title || selectedRole}...`}
                          value={(rolePerms && rolePerms._uiSearch) || ''}
                          onChange={(e) => setSearch(e.target.value)}
                          style={{ height: 28, paddingLeft: 30, borderRadius: 6, background: 'var(--panel3)' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
                        {(() => {
                          const maxVisible = 3
                          const activeIndex = roleTabKeys.indexOf(selectedRole)
                          let visibleRoles = roleTabKeys
                          let hiddenCount = 0
                          if (roleTabKeys.length > maxVisible) {
                            if (activeIndex >= maxVisible) {
                              visibleRoles = [...roleTabKeys.slice(0, maxVisible - 1), roleTabKeys[activeIndex]]
                            } else {
                              visibleRoles = roleTabKeys.slice(0, maxVisible)
                            }
                            hiddenCount = roleTabKeys.length - visibleRoles.length
                          }
                          return (
                            <>
                              {visibleRoles.map(role => {
                                const active = selectedRole === role
                                const meta = getRoleMeta(role)
                                return (
                                  <button
                                    key={role}
                                    type="button"
                                    className={`rpm-role-tab ${active ? 'active' : ''}`}
                                    onClick={() => setSelectedRole(role)}
                                    title={meta.description || meta.title || role}
                                  >
                                    <span className="rpm-role-dot" aria-hidden="true" />
                                    <span>{meta.title || role}</span>
                                  </button>
                                )
                              })}
                              {hiddenCount > 0 && (
                                <button type="button" className="rpm-more-toggle" onClick={() => setShowRolesModal(true)}>
                                  +{hiddenCount} more
                                </button>
                              )}
                            </>
                          )
                        })()}
                      </div>

                      {isOwnerUser && (
                        <button type="button" className="rpm-add-role-btn" onClick={_openAddRoleModal}>
                          <Plus size={12} />
                          <span>Add role</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {showRolesModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }} onClick={() => setShowRolesModal(false)}>
                      <div style={{ width: 'min(520px, calc(100vw - 32px))', maxHeight: 'min(70vh, 560px)', overflow: 'hidden', background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,.35)' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-strong)' }}>All roles</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Select a role to view or edit its permissions.</div>
                          </div>
                          <button type="button" className="btn" onClick={() => setShowRolesModal(false)}>Close</button>
                        </div>
                        <div style={{ padding: 12, overflowY: 'auto', maxHeight: 'calc(min(70vh, 560px) - 64px)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {roleTabKeys.map((role) => {
                            const meta = getRoleMeta(role)
                            const active = selectedRole === role
                            const canEditRoleMeta = isOwnerUser ? true : (isAdminUser && role === 'member')
                            return (
                              <div
                                key={role}
                                style={{
                                  width: '100%', display: 'flex', alignItems: 'stretch', gap: 8,
                                  padding: '10px 12px', borderRadius: 10,
                                  border: `1px solid ${active ? 'rgba(110,97,255,.45)' : 'var(--border)'}`,
                                  background: active ? 'rgba(110,97,255,.12)' : 'var(--panel3)',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => { setSelectedRole(role); setShowRolesModal(false) }}
                                  style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'transparent', border: 'none', padding: 0, color: 'var(--text-soft)', cursor: 'pointer' }}
                                >
                                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' }}>{meta.title || role}</div>
                                  {meta.description ? (() => {
                                    const words = String(meta.description).trim().split(/\s+/).filter(Boolean)
                                    const collapsed = words.length > 16
                                    const text = collapsed ? words.slice(0, 16).join(' ') + '…' : meta.description
                                    return <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, lineHeight: 1.45 }}>{text}</div>
                                  })() : null}
                                </button>
                                {canEditRoleMeta && (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, alignSelf: 'center', flexShrink: 0 }}>
                                    <button
                                      type="button"
                                      className="icon-btn"
                                      title="Edit role"
                                      onClick={(e) => { e.stopPropagation(); setShowRolesModal(false); openEditRoleModal(role) }}
                                      style={{ width: 30, height: 30 }}
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    {isOwnerUser && !['admin','member','owner'].includes(role) && (
                                      <button
                                        type="button"
                                        className="icon-btn"
                                        title="Delete role"
                                        onClick={(e) => { e.stopPropagation(); setShowRolesModal(false); setConfirmDeleteRole(role) }}
                                        style={{ width: 30, height: 30, color: '#ff6b6b' }}
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Role detail card */}
                  <div style={{ background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-strong)' }}>{getRoleMeta(selectedRole).title || selectedRole}</h3>
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '.04em', textTransform: 'uppercase',
                              background: isCustomSelectedRole ? 'rgba(110,97,255,.14)' : 'rgba(32,217,107,.12)',
                              color: isCustomSelectedRole ? '#a89cff' : '#20d96b',
                              border: `1px solid ${isCustomSelectedRole ? 'rgba(110,97,255,.3)' : 'rgba(32,217,107,.25)'}`
                            }}>
                              {isCustomSelectedRole ? 'CUSTOM ROLE' : 'BUILT-IN ROLE'}
                            </span>
                          </div>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>
                            {getRoleMeta(selectedRole).description || 'Configure permissions for this role.'}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--panel3)', border: '1px solid var(--border)', borderRadius: 6, padding: 3, flexShrink: 0 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted2)', letterSpacing: '.05em', padding: '0 6px', textTransform: 'uppercase' }}>Presets:</span>
                        {[
                          { key: 'custom', label: 'Custom' },
                          { key: 'readonly', label: 'Read-Only' },
                          { key: 'full', label: 'Full Contributor' },
                        ].map(p => (
                          <button
                            key={p.key}
                            type="button"
                            disabled={!editable}
                            onClick={() => {
                              if (!editable) return
                              if (p.key === 'custom') { toast.info('Custom preset: adjust permissions manually below.'); return }
                              setRolePerms(cur => {
                                const next = clone(cur || {})
                                if (!next[selectedRole]) next[selectedRole] = clone(templateToRole('member'))
                                const meta = next[selectedRole]._meta
                                for (const mod of PERM_MATRIX) {
                                  for (const f of mod.features) {
                                    if (p.key === 'readonly') {
                                      next[selectedRole][mod.key].features[f.id] = { view: !!f.cap.v, edit: false, delete: false }
                                    } else {
                                      next[selectedRole][mod.key].features[f.id] = { view: !!f.cap.v, edit: !!f.cap.e, delete: !!f.cap.d }
                                    }
                                  }
                                  normalizeShowAndLogic(next[selectedRole])
                                }
                                if (meta) next[selectedRole]._meta = { ...meta, title: meta.title || getRoleMeta(selectedRole).title, description: meta.description || getRoleMeta(selectedRole).description }
                                return next
                              })
                              toast.success(p.key === 'readonly' ? 'Read-only preset applied. Save permissions to persist.' : 'Full contributor preset applied. Save permissions to persist.')
                            }}
                            style={{
                              padding: '4px 8px', borderRadius: 5, fontSize: 10.5, fontWeight: 600, cursor: editable ? 'pointer' : 'not-allowed',
                              border: '1px solid transparent', background: p.key === 'custom' ? '#6e61ff' : 'transparent',
                              color: p.key === 'custom' ? '#fff' : 'var(--text-soft)', opacity: editable ? 1 : 0.6
                            }}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: editable ? 'pointer' : 'default', userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          className="rpm-cb"
                          checked={false}
                          disabled={!editable}
                          onChange={(e) => {
                            if (!editable || !e.target.checked) return
                            setRolePerms(cur => {
                              const next = clone(cur || {})
                              const base = clone(templateToRole('member'))
                              const meta = next[selectedRole]?._meta
                              next[selectedRole] = base
                              if (meta) next[selectedRole]._meta = meta
                              return next
                            })
                            toast.success('Member baseline permissions applied. Save permissions to persist.')
                          }}
                          title="Apply standard member baseline permissions"
                        />
                        <span style={{ fontSize: 11 }}>
                          <strong style={{ color: 'var(--text-strong)' }}>Inherit baseline permissions</strong>
                          <span style={{ color: 'var(--muted)', fontSize: 10 }}> (Applies standard "Member" defaults automatically)</span>
                        </span>
                      </label>

                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--muted)' }}>
                        <button
                          type="button"
                          disabled={!editable}
                          onClick={() => {
                            if (!editable) return
                            setRolePerms(cur => {
                              const next = clone(cur || {})
                              if (!next[selectedRole]) next[selectedRole] = clone(templateToRole('member'))
                              for (const mod of PERM_MATRIX) {
                                for (const f of mod.features) {
                                  const p = next[selectedRole][mod.key].features[f.id] || { view:false, edit:false, delete:false }
                                  if (f.cap.v) p.view = true
                                  if ((p.edit || p.delete) && f.cap.v) p.view = true
                                  next[selectedRole][mod.key].features[f.id] = p
                                }
                                normalizeShowAndLogic(next[selectedRole])
                              }
                              return next
                            })
                            toast.success('All view permissions selected. Save permissions to persist.')
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: editable ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 5, padding: 2 }}
                        >
                          <Eye size={13} /> <span>Select All View</span>
                        </button>
                        <span style={{ color: 'var(--border)' }}>|</span>
                        <button
                          type="button"
                          disabled={!editable}
                          onClick={() => {
                            if (!editable) return
                            setRolePerms(cur => {
                              const next = clone(cur || {})
                              if (!next[selectedRole]) next[selectedRole] = clone(templateToRole('member'))
                              for (const mod of PERM_MATRIX) {
                                for (const f of mod.features) {
                                  const p = next[selectedRole][mod.key].features[f.id] || { view:false, edit:false, delete:false }
                                  p.delete = false
                                  next[selectedRole][mod.key].features[f.id] = p
                                }
                                normalizeShowAndLogic(next[selectedRole])
                              }
                              return next
                            })
                            toast.success('All delete permissions cleared. Save permissions to persist.')
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: editable ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 5, padding: 2 }}
                        >
                          <Trash2 size={13} /> <span>Clear All Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Matrix controls */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {PERM_MATRIX.map(group => {
                        let activeChecks = 0
                        for (const f of group.features) { const p = (rolePerms?.[selectedRole]?.[group.key]?.features || {})[f.id] || {}; if (p.view) activeChecks++; if (p.edit) activeChecks++; if (p.delete) activeChecks++ }
                        return <button key={group.key} type="button" className={`rpm-pill ${activeChecks === 0 ? 'off' : ''}`} onClick={() => jumpToModule(group.key)} title={`Jump to ${group.module}`}>{group.shortName}</button>
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button type="button" className="rpm-reset" disabled={!editable} onClick={resetDefaults}>Reset to Default</button>
                      <button type="button" className="rpm-ghost" onClick={() => toggleAllSections(false)}>Expand All</button>
                      <button type="button" className="rpm-ghost" onClick={() => toggleAllSections(true)}>Collapse All</button>
                    </div>
                  </div>

                  <div id="rpm-table-wrap" style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'auto', maxHeight: 620, background: 'var(--panel)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr>
                          <th style={{ position:'sticky', top:0, zIndex:10, background:'var(--panel3)', fontSize:10.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--muted2)', padding:'10px 14px', borderBottom:'1px solid var(--border)' }}>Module & Feature Action</th>
                          <th style={{ position:'sticky', top:0, zIndex:10, background:'var(--panel3)', textAlign:'center', width:110, fontSize:10.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--muted2)', padding:'10px 12px', borderBottom:'1px solid var(--border)' }}>View / Read</th>
                          <th style={{ position:'sticky', top:0, zIndex:10, background:'var(--panel3)', textAlign:'center', width:110, fontSize:10.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--muted2)', padding:'10px 12px', borderBottom:'1px solid var(--border)' }}>Edit / Write</th>
                          <th style={{ position:'sticky', top:0, zIndex:10, background:'var(--panel3)', textAlign:'center', width:100, fontSize:10.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--muted2)', padding:'10px 12px', borderBottom:'1px solid var(--border)' }}>Delete</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PERM_MATRIX.map(group => {
                          const matching = group.features.filter(f => !search || f.name.toLowerCase().includes(search) || f.desc.toLowerCase().includes(search) || (f.sub || '').toLowerCase().includes(search) || group.module.toLowerCase().includes(search))
                          let activeChecks = 0, enabledRows = 0
                          for (const f of group.features) { const p = (rolePerms?.[selectedRole]?.[group.key]?.features || {})[f.id] || {}; if (p.view) activeChecks++; if (p.edit) activeChecks++; if (p.delete) activeChecks++; if (p.view || p.edit || p.delete) enabledRows++ }
                          const isModuleOn = activeChecks > 0
                          const isCollapsed = search ? false : !!collapsed[group.key]
                          if (matching.length === 0) return null
                          const rows = []
                          let lastSub = null
                          for (const feat of matching) {
                            if (feat.sub !== lastSub) {
                              lastSub = feat.sub
                              if (!isCollapsed) rows.push(
                                <tr key={`${group.key}-sub-${feat.sub}`}>
                                  <td colSpan={4} style={{ background: 'var(--panel2)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', padding: '6px 14px 6px 34px', borderBottom: '1px solid var(--border-soft)' }}>{feat.sub}</td>
                                </tr>
                              )
                            }
                            const p = (rolePerms?.[selectedRole]?.[group.key]?.features || {})[feat.id] || { view: false, edit: false, delete: false }
                            const renderCell = (type, supported, checked) => supported
                              ? <input type="checkbox" className="rpm-cb" checked={!!checked} disabled={!editable} onChange={(e) => updateCell(feat.id, type, e.target.checked)} />
                              : <span style={{ display: 'inline-block', color: 'var(--muted2)', fontWeight: 700, fontSize: 13, userSelect: 'none' }} title="Not applicable">—</span>
                            if (!isCollapsed) rows.push(
                              <tr key={feat.id} style={{ opacity: !isModuleOn ? 0.45 : 1 }}>
                                <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-soft)', verticalAlign: 'middle' }}>
                                  <div style={{ paddingLeft: 20 }}>
                                    <span style={{ fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 2, fontSize: 12.5 }}>{feat.name}</span>
                                    <span style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>{feat.desc}</span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center', width: 100, padding: '10px 12px', borderBottom: '1px solid var(--border-soft)' }}>{renderCell('v', !!feat.cap.v, p.view)}</td>
                                <td style={{ textAlign: 'center', width: 100, padding: '10px 12px', borderBottom: '1px solid var(--border-soft)' }}>{renderCell('e', !!feat.cap.e, p.edit)}</td>
                                <td style={{ textAlign: 'center', width: 100, padding: '10px 12px', borderBottom: '1px solid var(--border-soft)' }}>{renderCell('d', !!feat.cap.d, p.delete)}</td>
                              </tr>
                            )
                          }
                          return (
                            <Fragment key={group.key}>
                              <tr id={`rpm-mod-${group.key}`}>
                                <td colSpan={4} style={{ background: 'var(--panel3)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '8px 14px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSection(group.key)}>
                                      <span style={{ display: 'inline-block', fontSize: 10, color: 'var(--muted)', width: 14, textAlign: 'center', transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform .15s ease' }}>▼</span>
                                      <span style={{ fontWeight: 700, color: 'var(--text-strong)', fontSize: 13 }}>{group.module}</span>
                                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-soft)', background: 'var(--panel2)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 999 }}>{enabledRows}/{group.features.length} active</span>
                                    </div>
                                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 10.5, fontWeight: 700, color: 'var(--text-soft)', background: 'var(--panel2)', border: '1px solid var(--border)', padding: '4px 9px', borderRadius: 5, cursor: editable ? 'pointer' : 'not-allowed', opacity: editable ? 1 : 0.55 }} title={`Toggle all permissions for ${group.shortName}`}>
                                      SHOW MODULE
                                      <input type="checkbox" checked={isModuleOn} disabled={!editable} onChange={(e) => toggleModuleVisibility(group.key, e.target.checked)} style={{ accentColor: '#6e61ff', width: 13, height: 13, cursor: editable ? 'pointer' : 'not-allowed' }} />
                                    </label>
                                  </div>
                                </td>
                              </tr>
                              {rows}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 620, lineHeight: 1.5 }}>* <strong style={{ color: 'var(--text-soft)' }}>Granular Enforcement:</strong> Checking Edit or Delete automatically enables View. Unchecking View clears Edit and Delete actions. Saved to the active workspace configuration.</div>
                    <button type="button" className="btn primary" onClick={handleSavePermissions} disabled={savingPerms || !editable}>{savingPerms ? 'Saving…' : 'Save permissions'}</button>
                  </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {tab === 'team' && allowedTabs.includes('team') && (isOwner || isAdmin) && (
          <div className="settings-card" style={{ padding: 0, overflow: 'hidden' }}>
            {(() => {
              const q = (accessSearch || '').trim().toLowerCase()
              const workspaceProjects = (projects || []).filter(p => !ws?.id || !p?.workspace_id || String(p.workspace_id) === String(ws.id))
              const memberRows = (members || []).filter((m) => {
                if (m.role === 'owner') return false
                const assignments = getUserAssignments(m.id)
                const projNames = assignments.map(a => (workspaceProjects.find(p => String(p.id) === String(a.project_id))?.name || '').toLowerCase()).join(' ')
                const matchesSearch = !q || (m.full_name || '').toLowerCase().includes(q) || (m.username || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q) || projNames.includes(q)
                const matchesProject = accessProjectFilter === 'all' || m.role === 'owner' || assignments.some(a => String(a.project_id) === String(accessProjectFilter))
                const wsRoleLabel = m.role === 'owner' ? 'Workspace Owner' : (m.role || 'member')
                const matchesRole = accessRoleFilter === 'all' || wsRoleLabel.toLowerCase() === accessRoleFilter.toLowerCase() || (accessRoleFilter === 'Admin' && m.role === 'admin') || (accessRoleFilter === 'Member' && m.role === 'member')
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

                  <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div className="settings-card-title" style={{ marginBottom: 4 }}>Members & Project Access</div>
                      <p className="settings-card-desc" style={{ margin: 0 }}>Manage workspace members, project visibility, and per-project roles for <strong>{ws?.name || 'this workspace'}</strong>.</p>
                    </div>
                    {teamMsg && <div style={msgStyle(teamMsg.type)}>{teamMsg.text}</div>}
                    <div style={{ display: 'flex', gap: 8, flexWrap:'wrap' }}>
                      <button type="button" className="btn primary" onClick={() => { setAddMemberSearch(''); setShowAddMemberModal(true) }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}><UserPlus size={12} /> Add member</button>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:8 }}>
                      <div style={{ position: 'relative', width: 260 }}>
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
                        <option value="Pending Setup">Pending Setup</option>
                      </select>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>Showing {memberRows.length} of {(members || []).length} members</span>
                    </div>
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
                          const scope = getVisibilityScope(m, isOwnerMember ? workspaceProjects.length : assignments.length, workspaceProjects.length)
                          const sc = scopeStyle(scope.type)
                          const canManageAccess = isOwner && !isOwnerMember
                          const visibleAssignments = isOwnerMember ? [] : assignments.slice(0,3)
                          const extra = !isOwnerMember ? Math.max(0, assignments.length - 3) : 0
                          const _editingWsRole = editingRole?.userId === m.id
                          const _adminCannotAlterTier = isAdmin && (isOwnerMember || m.role === 'admin')
                          return (
                            <tr key={uid} className="wpt-row">
                              <td className="wpt-td" style={{ minWidth: 260 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                  <span className="avatar" style={{ width:34, height:34, fontSize:11 }}>{initials(m)}</span>
                                  <div style={{ minWidth:0, display:'flex', flexDirection:'column', gap:2 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                                      <span style={{ fontWeight:700, fontSize:13, color:'var(--text-strong)' }}>{m.full_name || m.username || m.email}{String(user?.id)===uid ? ' (you)' : ''}</span>
                                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:5, background:badge.bg, color:badge.color, border:`1px solid ${badge.border}` }}>{badge.label}</span>
                                    </div>
                                    <span style={{ fontSize:11, color:'var(--muted)' }}>{m.email}</span>

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
                                  {isOwnerMember ? (
                                    <span style={{ fontSize:11.5, fontStyle:'italic', color:'var(--muted)' }}>Owner Immutable</span>
                                  ) : canManageAccess ? (
                                    <button type="button" className="wpt-manage" onClick={() => openAccessDrawer(uid)}>⇄ Manage Access</button>
                                  ) : (
                                    <span style={{ fontSize:11, color:'var(--muted)' }}>Owner-managed</span>
                                  )}
                                  <button
                                    className="icon-btn"
                                    title={isOwnerMember ? 'Workspace Owner cannot be removed' : (String(user?.id)===uid ? 'You cannot remove yourself' : 'Remove member')}
                                    disabled={String(user?.id)===uid || isOwnerMember}
                                    onClick={() => handleRemoveMember(m)}
                                    style={{ opacity: (String(user?.id)===uid || isOwnerMember) ? 0.4 : 1, cursor: (String(user?.id)===uid || isOwnerMember) ? 'not-allowed' : 'pointer', color: '#ff6b6b' }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--panel2)', fontSize: 11, color: 'var(--muted)' }}>
                    {isOwner ? 'Owner can manage each member’s project visibility and project-specific role via “Manage Access”.' : 'Project access and per-project roles are managed by the workspace owner.'}
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
        )}

        {tab === 'notifications' && allowedTabs.includes('notifications') && (
          <div className="settings-card">
            <div className="settings-card-title">Notifications</div>
            <p className="settings-card-desc">Choose which events trigger a notification.</p>
            {[
              { key: 'assigned', title: 'Task assigned to me', desc: 'When you are assigned to a task.' },
              { key: 'comments', title: 'New comments', desc: 'When someone comments on an item you follow.' },
              { key: 'dueSoon', title: 'Due soon', desc: 'Tasks and bugs approaching their due date.' },
              { key: 'weekly', title: 'Weekly digest', desc: 'A summary of the week’s activity every Monday.' },
            ].map((row) => (
              <div className="settings-row" key={row.key}>
                <div className="settings-row-info">
                  <h4>{row.title}</h4>
                  <p>{row.desc}</p>
                </div>
                <Toggle
                  label={row.title}
                  checked={notifs[row.key]}
                  onChange={(v) => setNotifs((cur) => ({ ...cur, [row.key]: v }))}
                />
              </div>
            ))}
          </div>
        )}

        {tab === 'storage' && allowedTabs.includes('storage') && isOwner && (
          <div className="settings-card">
            <div className="settings-card-title">Data &amp; Storage</div>
            <p className="settings-card-desc">Thoth is local-first. Your data lives in Postgres and stays on your machines.</p>
            <div className="settings-row">
              <div className="settings-row-info">
                <h4>Export workspace data</h4>
                <p>Download all tasks, bugs, notes and milestones as JSON.</p>
              </div>
              <button type="button" className="btn" onClick={() => toast.info('Export coming soon.')}>Export</button>
            </div>
            <div className="settings-row">
              <div className="settings-row-info">
                <h4>Clear local preferences</h4>
                <p>Reset theme, fonts and other stored settings to defaults.</p>
              </div>
              <button
                type="button"
                className="btn"
                style={{ color: '#ff6b6b', borderColor: 'rgba(255,64,64,.4)' }}
                onClick={() => {
                  saveSettings({ theme: 'dark', font: 'Inter', compact: false })
                  setSettings(getSettings())
                }}
              >
                Reset
              </button>
            </div>

            <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
              <div style={{ marginBottom: 12 }}>
                <div className="settings-card-title" style={{ marginBottom: 4 }}>Archive</div>
                <p className="settings-card-desc" style={{ margin: 0 }}>Deleted projects in this workspace.</p>
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--panel2)', overflow: 'hidden' }}>
                {archiveLoading ? (
                  <div style={{ padding: 14, fontSize: 12, color: 'var(--muted)' }}>Loading archive…</div>
                ) : archiveRows.length === 0 ? (
                  <div style={{ padding: 14, fontSize: 12, color: 'var(--muted)' }}>No deleted projects found.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {archiveRows.map((row, idx) => {
                      const isHover = String(archiveHoverId) === String(row.id)
                      const isExpanded = String(expandedArchiveId) === String(row.id)
                      const detailRows = isExpanded ? [
                        ...(expandedArchiveData.tasks || []).map(t => ({ type: 'Task', id: t.task_code || t.id, title: t.title, status: t.status, assignee: t.assignee_name, attachments: Array.isArray(t.meta?.attachments) ? t.meta.attachments : [], deleted_at: t.deleted_at, created_at: t.created_at })),
                        ...(expandedArchiveData.bugs || []).map(b => ({ type: 'Bug', id: b.bug_id || b.id, title: b.title, status: b.status || b.kanban_column, assignee: b.assignee_name, attachments: Array.isArray(b.attachments) ? b.attachments : (typeof b.attachments === 'string' ? (() => { try { const v=JSON.parse(b.attachments); return Array.isArray(v)?v:[] } catch { return [] } })() : []), deleted_at: b.deleted_at, created_at: b.created_at })),
                      ].sort((a,b) => new Date(b.deleted_at || b.created_at || 0) - new Date(a.deleted_at || a.created_at || 0)) : []
                      return (
                        <div key={String(row.id || idx)} style={{ borderBottom: idx === archiveRows.length - 1 ? 'none' : '1px solid var(--border-soft, var(--border))', background: isHover || isExpanded ? 'var(--panel3)' : 'transparent' }}>
                          <div
                            onMouseEnter={() => setArchiveHoverId(row.id)}
                            onMouseLeave={() => setArchiveHoverId(null)}
                            style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, cursor: 'pointer' }}
                            onClick={() => toggleArchiveExpand(row)}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name || 'Untitled project'}</div>
                              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {(row.status || 'project')}{row.deleted_at ? ` • Deleted ${new Date(row.deleted_at).toLocaleString()}` : ''}
                              </div>
                            </div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                              <button
                                type="button"
                                className="icon-btn"
                                title="View details"
                                onClick={(e) => { e.stopPropagation(); openArchiveDetail(row) }}
                                style={{ width: 28, height: 28, opacity: isHover || isExpanded ? 1 : 0, pointerEvents: isHover || isExpanded ? 'auto' : 'none', transition: 'opacity .12s ease' }}
                              >
                                <Pencil size={13} />
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div style={{ padding: '0 12px 12px' }}>
                              <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto', maxHeight: 320, background: 'var(--panel2)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                                  <thead>
                                    <tr style={{ background: 'var(--panel3)' }}>
                                      {['Type', 'ID', 'Title', 'Status', 'Assignee', 'Attachments', 'Deleted'].map(h => (
                                        <th key={h} style={{ textAlign: 'left', padding: '9px 10px', fontSize: 10, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1, background: 'var(--panel3)' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {expandedArchiveLoading ? (
                                      <tr><td colSpan={7} style={{ padding: 12, fontSize: 12, color: 'var(--muted)' }}>Loading project items…</td></tr>
                                    ) : detailRows.length === 0 ? (
                                      <tr><td colSpan={7} style={{ padding: 12, fontSize: 12, color: 'var(--muted)' }}>No tasks, bugs, or attachments found in this project.</td></tr>
                                    ) : detailRows.map((r, i) => (
                                      <tr key={`${r.type}-${r.id}-${i}`} style={{ borderBottom: i === detailRows.length - 1 ? 'none' : '1px solid var(--border-soft, var(--border))' }}>
                                        <td style={{ padding: '9px 10px', fontSize: 11, fontWeight: 700, color: r.type === 'Bug' ? '#ff8a8a' : '#a89cff' }}>{r.type}</td>
                                        <td style={{ padding: '9px 10px', fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{r.id || '—'}</td>
                                        <td style={{ padding: '9px 10px', fontSize: 12, color: 'var(--text-soft)' }}>{r.title || '—'}</td>
                                        <td style={{ padding: '9px 10px', fontSize: 11, color: 'var(--muted)' }}>{r.status || '—'}</td>
                                        <td style={{ padding: '9px 10px', fontSize: 11, color: 'var(--muted)' }}>{r.assignee || '—'}</td>
                                        <td style={{ padding: '9px 10px', fontSize: 11, color: 'var(--muted)' }}>
                                          {r.attachments.length === 0 ? '—' : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                              {r.attachments.map((a, ai) => {
                                                const name = a?.name || a?.filename || a?.file_name || a?.url || a?.path || `Attachment ${ai + 1}`
                                                const url = a?.url || a?.path || a?.href
                                                return url ? <a key={ai} href={url} target="_blank" rel="noreferrer" style={{ color: '#a89cff', textDecoration: 'none' }}>{String(name)}</a> : <span key={ai}>{String(name)}</span>
                                              })}
                                            </div>
                                          )}
                                        </td>
                                        <td style={{ padding: '9px 10px', fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{r.deleted_at ? new Date(r.deleted_at).toLocaleString() : 'Active'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'about' && allowedTabs.includes('about') && (
          <div className="settings-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 0, minHeight: 320 }}>
              <section style={{ padding: '28px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src="/favicon.svg" alt="Thoth logo" style={{ width: 28, height: 28, borderRadius: 6 }} />
                  <h2 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-strong)', lineHeight: 1.1, fontFamily: "Georgia, 'Times New Roman', serif" }}>Thoth</h2>
                </div>
                <span style={{ display: 'inline-block', marginTop: 12, padding: '4px 10px', borderRadius: 6, background: 'var(--panel3)', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 12, fontWeight: 500 }}>{import.meta.env.VITE_APP_VERSION || 'dev'}</span>
                <h3 style={{ margin: '22px 0 14px', fontSize: 34, fontWeight: 500, lineHeight: 1.15, letterSpacing: '-0.03em', color: 'var(--text-strong)', maxWidth: '14ch', fontFamily: "Georgia, 'Times New Roman', serif" }}>Your project’s memory, self-hosted.</h3>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--muted)', maxWidth: 420 }}>
                  Thoth is a local-first project management and knowledge workspace backed by PostgreSQL. Track tasks, bugs, notes, and team workflows in one place while keeping your data under your control.
                </p>
              </section>

              <section style={{ padding: '28px' }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>Project</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  {[
                    { title: 'Official Website', subtitle: 'Visit the Thoth project homepage', href: 'https://notlansdev.github.io/Thoth/', icon: <Globe size={18} /> },
                    { title: 'Documentation & Setup', subtitle: 'Local setup and self-hosting guide', href: 'https://github.com/notLansDEV/Thoth', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.42.36.79 1.07.79 2.16v3.2c0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg> },
                  ].map((card) => (
                    <a
                      key={card.title}
                      href={card.href}
                      target={card.href.startsWith('http') ? '_blank' : undefined}
                      rel={card.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      onClick={(e) => {
                        if (card.href.startsWith('#/')) {
                          e.preventDefault()
                          window.history.pushState({}, '', `/Thoth/${ws?.slug || getCurrentWorkspace()?.slug || 'default'}/${card.href.slice(2)}`)
                          window.dispatchEvent(new PopStateEvent('popstate'))
                        }
                      }}
                      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 138, padding: '18px', borderRadius: 8, background: 'var(--panel3)', border: '1px solid var(--border)', textDecoration: 'none', color: 'inherit' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, color: 'var(--muted)' }}>
                        <span style={{ display: 'inline-flex' }}>{card.icon}</span>
                        <ArrowRight size={14} style={{ transform: 'rotate(-45deg)' }} />
                      </div>
                      <div style={{ marginTop: 24 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-strong)' }}>{card.title}</div>
                        <div style={{ marginTop: 4, fontSize: 13, color: 'var(--muted)' }}>{card.subtitle}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}


        {archiveDetail && (
          <div
            onClick={() => setArchiveDetail(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 920, maxHeight: 'min(82vh, 760px)', overflow: 'hidden', background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 20px 40px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 14px', gap: 12, borderBottom: '1px solid var(--border)' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-strong)' }}>Deleted Project</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>Archived project details, tasks, bugs, and attachments</p>
                </div>
                <button type="button" className="icon-btn" onClick={() => setArchiveDetail(null)} title="Close"><X size={14} /></button>
              </div>

              <div style={{ padding: '16px 24px 24px', overflowY: 'auto', display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <div style={{ background: 'var(--panel3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                    <div className="settings-label" style={{ marginBottom: 6 }}>Title</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>{archiveDetail.name || 'Untitled project'}</div>
                  </div>
                  <div style={{ background: 'var(--panel3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                    <div className="settings-label" style={{ marginBottom: 6 }}>Status</div>
                    <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>{archiveDetail.status || '—'}</div>
                  </div>
                  <div style={{ background: 'var(--panel3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                    <div className="settings-label" style={{ marginBottom: 6 }}>Deleted</div>
                    <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>{archiveDetail.deleted_at ? new Date(archiveDetail.deleted_at).toLocaleString() : '—'}</div>
                  </div>
                </div>

                <div>
                  <div className="settings-label" style={{ marginBottom: 6 }}>Description</div>
                  <div style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: 'var(--panel3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', minHeight: 56 }}>
                    {archiveDetail.description || 'No description'}
                  </div>
                </div>

                <div>
                  <div className="settings-label" style={{ marginBottom: 8 }}>Tasks, Bugs & Attachments</div>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto', maxHeight: 320, background: 'var(--panel3)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                      <thead>
                        <tr style={{ background: 'var(--panel2)' }}>
                          {['Type', 'ID', 'Title', 'Status', 'Assignee', 'Attachments', 'Deleted', 'View'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 10.5, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1, background: 'var(--panel2)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {archiveDetailLoading ? (
                          <tr><td colSpan={8} style={{ padding: 14, fontSize: 12, color: 'var(--muted)' }}>Loading project items…</td></tr>
                        ) : (() => {
                          const rows = [
                            ...(archiveDetailData.tasks || []).map(t => ({ type: 'Task', id: t.task_code || t.id, title: t.title, status: t.status, assignee: t.assignee_name, attachments: Array.isArray(t.meta?.attachments) ? t.meta.attachments : [], deleted_at: t.deleted_at, created_at: t.created_at, raw: t })),
                            ...(archiveDetailData.bugs || []).map(b => ({ type: 'Bug', id: b.bug_id || b.id, title: b.title, status: b.status || b.kanban_column, assignee: b.assignee_name, attachments: Array.isArray(b.attachments) ? b.attachments : (typeof b.attachments === 'string' ? (() => { try { const v=JSON.parse(b.attachments); return Array.isArray(v)?v:[] } catch { return [] } })() : []), deleted_at: b.deleted_at, created_at: b.created_at, raw: b })),
                          ].sort((a,b) => new Date(b.deleted_at || b.created_at || 0) - new Date(a.deleted_at || a.created_at || 0))
                          if (rows.length === 0) return <tr><td colSpan={8} style={{ padding: 14, fontSize: 12, color: 'var(--muted)' }}>No tasks or bugs found in this project.</td></tr>
                          return rows.map((r, i) => (
                            <tr key={`${r.type}-${r.id}-${i}`} style={{ borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--border-soft, var(--border))' }}>
                              <td style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, color: r.type === 'Bug' ? '#ff8a8a' : '#a89cff' }}>{r.type}</td>
                              <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{r.id || '—'}</td>
                              <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-soft)' }}>{r.title || '—'}</td>
                              <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)' }}>{r.status || '—'}</td>
                              <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)' }}>{r.assignee || '—'}</td>
                              <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)' }}>
                                {r.attachments.length === 0 ? '—' : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {r.attachments.map((a, ai) => {
                                      const name = a?.name || a?.filename || a?.file_name || a?.url || a?.path || `Attachment ${ai + 1}`
                                      const url = a?.url || a?.path || a?.href
                                      return url ? <a key={ai} href={url} target="_blank" rel="noreferrer" style={{ color: '#a89cff', textDecoration: 'none' }}>{String(name)}</a> : <span key={ai}>{String(name)}</span>
                                    })}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{r.deleted_at ? new Date(r.deleted_at).toLocaleString() : 'Active'}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <button type="button" className="icon-btn" title="View" onClick={() => setArchiveViewItem({ kind: r.type.toLowerCase(), data: r.raw })} style={{ width: 28, height: 28 }}>
                                  <Eye size={13} />
                                </button>
                              </td>
                            </tr>
                          ))
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <div className="settings-label" style={{ marginBottom: 8 }}>Attachments</div>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto', maxHeight: 220, background: 'var(--panel3)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                      <thead>
                        <tr style={{ background: 'var(--panel2)' }}>
                          {['Name', 'Source', 'Type', 'Size', 'View'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 10.5, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1, background: 'var(--panel2)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {archiveDetailLoading ? (
                          <tr><td colSpan={5} style={{ padding: 14, fontSize: 12, color: 'var(--muted)' }}>Loading attachments…</td></tr>
                        ) : (archiveDetailData.attachments || []).length === 0 ? (
                          <tr><td colSpan={5} style={{ padding: 14, fontSize: 12, color: 'var(--muted)' }}>No attachments found.</td></tr>
                        ) : (archiveDetailData.attachments || []).map((a, i, arr) => {
                          const name = a?.name || a?.filename || a?.file_name || a?.url || a?.path || `Attachment ${i + 1}`
                          const url = a?.url || a?.path || a?.href
                          const source = [a?.source_type, a?.source_id].filter(Boolean).join(' ')
                          const size = a?.size ? (a.size < 1024 ? `${a.size} B` : a.size < 1024*1024 ? `${(a.size/1024).toFixed(1)} KB` : `${(a.size/(1024*1024)).toFixed(1)} MB`) : '—'
                          const type = a?.type || a?.mimeType || a?.mime_type || (String(name).includes('.') ? String(name).split('.').pop().toUpperCase() : '—')
                          return (
                            <tr key={i} style={{ borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border-soft, var(--border))' }}>
                              <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-soft)' }}>{url ? <a href={url} target="_blank" rel="noreferrer" style={{ color: '#a89cff', textDecoration: 'none' }}>{String(name)}</a> : String(name)}</td>
                              <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)' }}>{source || '—'}{a?.source_title ? <span style={{ color: 'var(--muted2)' }}> — {a.source_title}</span> : null}</td>
                              <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)' }}>{String(type)}</td>
                              <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{size}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <button type="button" className="icon-btn" title="View" onClick={() => setArchiveViewItem({ kind: 'attachment', data: a })} style={{ width: 28, height: 28 }}>
                                  <Eye size={13} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <div className="settings-label" style={{ marginBottom: 8 }}>Pages</div>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto', maxHeight: 220, background: 'var(--panel3)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                      <thead>
                        <tr style={{ background: 'var(--panel2)' }}>
                          {['Title', 'Type', 'Date', 'Updated', 'View'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 10.5, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1, background: 'var(--panel2)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {archiveDetailLoading ? (
                          <tr><td colSpan={5} style={{ padding: 14, fontSize: 12, color: 'var(--muted)' }}>Loading pages…</td></tr>
                        ) : (archiveDetailData.pages || []).length === 0 ? (
                          <tr><td colSpan={5} style={{ padding: 14, fontSize: 12, color: 'var(--muted)' }}>No pages found.</td></tr>
                        ) : (archiveDetailData.pages || []).map((pg, i, arr) => (
                          <tr key={pg.id || i} style={{ borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border-soft, var(--border))' }}>
                            <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-soft)' }}>{pg.title || 'Untitled'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)' }}>{pg.page_type || 'page'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{pg.page_date ? new Date(pg.page_date).toLocaleDateString() : '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{pg.updated_at ? new Date(pg.updated_at).toLocaleString() : '—'}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <button type="button" className="icon-btn" title="View" onClick={() => setArchiveViewItem({ kind: 'page', data: pg })} style={{ width: 28, height: 28 }}>
                                <Eye size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div style={{ padding: '14px 24px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: 'var(--panel2)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted2)' }}>All deleted projects will be permanently deleted after 30 days.</div>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => setConfirmRecoverProject(archiveDetail)}
                  disabled={recoveringArchive}
                  style={{ cursor: recoveringArchive ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                >
                  Recover
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmRecoverProject && (
          <ConfirmModal
            title="Recover project"
            message={`Recover "${confirmRecoverProject.name || 'this project'}" and all its tasks and bugs?`}
            note="This will restore the project and all items inside it."
            confirmLabel="Recover"
            tone="primary"
            busy={recoveringArchive}
            requiredText={`RECOVER ${confirmRecoverProject.name || ''}`.trim()}
            onConfirm={handleRecoverProject}
            onCancel={() => { if (!recoveringArchive) setConfirmRecoverProject(null) }}
          />
        )}

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
                    className="settings-input"
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
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 8, border: '1px solid transparent' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}{u.username ? ` • @${u.username}` : ''}</div>
                      </div>
                      <button
                        type="button"
                        className="btn primary"
                        disabled={busy}
                        onClick={() => handleAddMemberFromModal(u)}
                        style={{ flexShrink: 0, padding: '6px 10px', fontSize: 11 }}
                      >
                        {busy ? 'Adding…' : 'Add'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {archiveViewItem && (() => {
          const { kind, data } = archiveViewItem
          const title = kind === 'task' ? (data.task_code || 'Task') : kind === 'bug' ? (data.bug_id || 'Bug') : kind === 'page' ? (data.title || 'Page') : (data?.name || data?.filename || 'Attachment')
          const rows = kind === 'task' ? [
            ['Title', data.title], ['Status', data.status], ['Priority', data.priority], ['Assignee', data.assignee_name], ['Start', data.start_date ? new Date(data.start_date).toLocaleDateString() : null], ['Due', data.due_date ? new Date(data.due_date).toLocaleDateString() : null], ['Deleted', data.deleted_at ? new Date(data.deleted_at).toLocaleString() : 'Active'],
          ] : kind === 'bug' ? [
            ['Title', data.title], ['Status', data.status || data.kanban_column], ['Priority', data.priority], ['Assignee', data.assignee_name], ['Created', data.created_at ? new Date(data.created_at).toLocaleString() : null], ['Deleted', data.deleted_at ? new Date(data.deleted_at).toLocaleString() : 'Active'],
          ] : kind === 'page' ? [
            ['Title', data.title], ['Type', data.page_type], ['Date', data.page_date ? new Date(data.page_date).toLocaleDateString() : null], ['Updated', data.updated_at ? new Date(data.updated_at).toLocaleString() : null],
          ] : [
            ['Name', data?.name || data?.filename || data?.file_name], ['Source', [data?.source_type, data?.source_id].filter(Boolean).join(' ')], ['Type', data?.type || data?.mimeType || data?.mime_type], ['Size', data?.size ? (data.size < 1024 ? `${data.size} B` : data.size < 1024*1024 ? `${(data.size/1024).toFixed(1)} KB` : `${(data.size/(1024*1024)).toFixed(1)} MB`) : null],
          ]
          const description = kind === 'task' || kind === 'bug' ? data.description : kind === 'page' ? data.content : null
          const fileSrc = kind === 'attachment' ? (data?.dataUrl || data?.data_url || data?.url || data?.path || data?.href || data?.src) : null
          const fileType = String(data?.type || data?.mimeType || data?.mime_type || '')
          const isImage = !!fileSrc && (fileType.startsWith('image/') || /^data:image\//i.test(String(fileSrc)) || /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?|$)/i.test(String(fileSrc)))
          const isVideo = !!fileSrc && !isImage && (fileType.startsWith('video/') || /^data:video\//i.test(String(fileSrc)) || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(String(fileSrc)))
          return (
            <div onClick={() => setArchiveViewItem(null)} style={{ position: 'fixed', inset: 0, zIndex: 1400, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 680, maxHeight: 'min(80vh,720px)', overflow: 'hidden', background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 20px 40px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{kind}</div>
                    <h3 style={{ margin: '4px 0 0', fontSize: 17, fontWeight: 700, color: 'var(--text-strong)' }}>{String(title)}</h3>
                  </div>
                  <button type="button" className="icon-btn" onClick={() => setArchiveViewItem(null)} title="Close"><X size={14} /></button>
                </div>
                <div style={{ padding: '16px 22px 22px', overflowY: 'auto', display: 'grid', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                    {rows.filter(([,v]) => v !== null && v !== undefined && v !== '').map(([k,v]) => (
                      <div key={k} style={{ background: 'var(--panel3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                        <div className="settings-label" style={{ marginBottom: 4 }}>{k}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-soft)', wordBreak: 'break-word' }}>{String(v)}</div>
                      </div>
                    ))}
                  </div>
                  {fileSrc && (
                    <div>
                      <div className="settings-label" style={{ marginBottom: 6 }}>Preview</div>
                      {isImage ? (
                        <img src={fileSrc} alt={String(title)} style={{ maxWidth: '100%', maxHeight: 420, borderRadius: 8, border: '1px solid var(--border)', display: 'block' }} />
                      ) : isVideo ? (
                        <video src={fileSrc} controls style={{ maxWidth: '100%', maxHeight: 420, borderRadius: 8, border: '1px solid var(--border)', display: 'block' }} />
                      ) : (
                        <a href={fileSrc} target="_blank" rel="noreferrer" style={{ color: '#a89cff', fontSize: 12, wordBreak: 'break-all' }}>{String(fileSrc).startsWith('data:') ? `Open ${String(title)}` : String(fileSrc)}</a>
                      )}
                    </div>
                  )}
                  {description ? (
                    <div>
                      <div className="settings-label" style={{ marginBottom: 6 }}>{kind === 'page' ? 'Content' : 'Description'}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: 'var(--panel3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', minHeight: 56 }}>{String(description)}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })()}

        {editRoleModal && (
          <div
            onClick={() => setEditRoleModal(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 520, background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 24px', boxShadow: '0 20px 40px rgba(0,0,0,0.35)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-strong)' }}>Edit Role</h3>
                <button type="button" className="icon-btn" onClick={() => setEditRoleModal(null)} title="Close"><X size={14} /></button>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="settings-label" style={{ display: 'block', marginBottom: 6 }}>Role Title</label>
                <input
                  className="settings-input"
                  value={editRoleModal.title}
                  onChange={(e) => setEditRoleModal(cur => cur ? { ...cur, title: e.target.value } : cur)}
                  placeholder="Role title"
                />
              </div>
              <div style={{ marginBottom: 4 }}>
                <label className="settings-label" style={{ display: 'block', marginBottom: 6 }}>Role Description</label>
                <textarea
                  className="settings-input"
                  value={editRoleModal.description}
                  onChange={(e) => setEditRoleModal(cur => cur ? { ...cur, description: e.target.value } : cur)}
                  placeholder="Describe this role’s scope and permissions"
                  rows={5}
                  style={{ resize: 'vertical', minHeight: 110 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
                <button type="button" className="btn" onClick={() => setEditRoleModal(null)}>Cancel</button>
                <button type="button" className="btn primary" onClick={saveEditRoleModal} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Check size={14} /> Save
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmDeleteRole && (
          <ConfirmModal
            title={`Remove role "${getRoleMeta(confirmDeleteRole).title || confirmDeleteRole}"?`}
            message="This custom role will be removed from the workspace roles & permissions configuration."
            note="* Members assigned to this role may lose access until reassigned. Save permissions after removal to apply changes."
            confirmLabel="Remove role"
            onConfirm={() => deleteCustomRole(confirmDeleteRole)}
            onCancel={() => setConfirmDeleteRole(null)}
          />
        )}

{showAddRoleModal && (
          <div
            onClick={() => { setShowAddRoleModal(false); setShowRoleSuggestions(false) }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1300,
              background: 'rgba(0,0,0,0.55)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
          >
            <div
              onClick={(e) => { e.stopPropagation(); setShowRoleSuggestions(false) }}
              style={{
                width: '100%', maxWidth: 520,
                background: 'var(--panel2)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '22px 24px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-strong)' }}>Add New Role</h3>
                <button type="button" className="icon-btn" onClick={() => { setShowAddRoleModal(false); setShowRoleSuggestions(false) }} title="Close"><X size={14} /></button>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                  <label className="settings-label" style={{ margin: 0 }}>Role Title</label>
                  <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setShowRoleSuggestions(v => !v)}
                      style={{
                        background: 'rgba(110,97,255,0.12)',
                        border: '1px solid rgba(110,97,255,0.35)',
                        color: '#a89cff',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Sparkles size={12} /> Suggest Role
                    </button>

                    {showRoleSuggestions && (
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          marginTop: 6,
                          width: 320,
                          maxWidth: '80vw',
                          background: 'var(--panel)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
                          zIndex: 20,
                          padding: 6,
                          maxHeight: 360,
                          overflowY: 'auto',
                        }}
                      >
                        <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)', padding: '6px 8px', borderBottom: '1px solid var(--border-soft)', marginBottom: 4 }}>
                          Predefined Templates
                        </div>
                        {ROLE_SUGGESTIONS.map((preset) => (
                          <button
                            key={preset.key}
                            type="button"
                            onClick={() => applyRoleSuggestion(preset)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              background: selectedRolePresetKey === preset.key ? 'var(--hover)' : 'transparent',
                              border: 'none',
                              borderRadius: 6,
                              padding: 8,
                              cursor: 'pointer',
                              color: 'inherit',
                            }}
                          >
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>{preset.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.35, marginTop: 2 }}>{preset.short}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <input
                  className="settings-input"
                  value={newRoleTitle}
                  onChange={(e) => { setNewRoleTitle(e.target.value); setSelectedRolePresetKey(null) }}
                  placeholder="e.g. Project Lead, QA / Tester"
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 4 }}>
                <label className="settings-label" style={{ display: 'block', marginBottom: 6 }}>Role Description</label>
                <textarea
                  className="settings-input"
                  value={newRoleDesc}
                  onChange={(e) => { setNewRoleDesc(e.target.value); setSelectedRolePresetKey(null) }}
                  placeholder="Describe this role’s scope and permissions"
                  rows={5}
                  style={{ resize: 'vertical', minHeight: 110 }}
                />
                {selectedRolePresetKey && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#a89cff' }}>
                    Template selected: permissions will be pre-filled from this role preset.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                <button type="button" className="btn" onClick={() => { setShowAddRoleModal(false); setShowRoleSuggestions(false) }}>Cancel</button>
                <button type="button" className="btn primary" onClick={handleCreateCustomRole}>Create Role</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
