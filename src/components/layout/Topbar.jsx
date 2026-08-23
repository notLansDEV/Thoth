import { getCurrentWorkspace } from '../../features/workspaces/workspaces.service.js'

const PAGE_LABELS = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  tasks: 'Tasks',
  bugs: 'Bugs',
  calendar: 'Calendar',
  milestones: 'Milestones',
  reports: 'Reports',
  markdown: 'Markdown',
  workspaces: 'Workspaces',
  settings: 'Settings',
}

function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('thoth_user') || 'null')
  } catch {
    return null
  }
}

export default function Topbar({ collapsed, onToggleCollapse }) {
  const ws = getCurrentWorkspace()
  const user = getUser()

  const parts = window.location.pathname.split('/').filter(Boolean)
  const pageKey = parts[parts.length - 1] || 'dashboard'
  const pageLabel = PAGE_LABELS[pageKey] || pageKey

  const name = user?.full_name || user?.username || 'Guest'
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="topbar">
      <div className="top-left">
        <div className="brand">
          <span className="brand-icon">T</span>Thoth
        </div>
        <button
          className="collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '☰' : '⇤'}
        </button>
        <span className="breadcrumb">
          {ws ? `${ws.name} / ` : ''}{pageLabel}
        </span>
      </div>

      <div className="top-right">
        <button className="btn ws-btn" onClick={() => navigate('/workspaces')} title="Switch workspace">
          <span className="dot purple" />
          {ws ? ws.name : 'No workspace'}
        </button>
        <span className="avatar">{initials}</span>
        <span className="user">{name}</span>
      </div>
    </header>
  )
}
