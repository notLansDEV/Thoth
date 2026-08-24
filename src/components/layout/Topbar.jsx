import { useEffect, useRef, useState } from 'react'
import { LogOut, Menu, PanelLeftClose, ChevronDown } from 'lucide-react'
import {
  getCurrentWorkspace,
  setCurrentWorkspace,
  getWorkspaces,
} from '../../features/workspaces/workspaces.service.js'

const PAGE_LABELS = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  tasks: 'Tasks',
  bugs: 'Bugs',
  calendar: 'Calendar',
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

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('thoth_user')
  setCurrentWorkspace(null)
  navigate('/login')
}

export default function Topbar({ collapsed, onToggleCollapse }) {
  const ws = getCurrentWorkspace()
  const user = getUser()
  const [wsOpen, setWsOpen] = useState(false)
  const [wsList, setWsList] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setWsOpen(false)
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  async function toggleWsMenu() {
    const next = !wsOpen
    setWsOpen(next)
    setProfileOpen(false)
    if (next && wsList === null) {
      try {
        const rows = await getWorkspaces()
        setWsList(Array.isArray(rows) ? rows : [])
      } catch {
        setWsList([])
      }
    }
  }

  const parts = window.location.pathname.split('/').filter(Boolean)
  if (parts[0] && parts[0].toLowerCase() === 'thoth') parts.shift()
  // /{workspace}/{page}[/{id}] — page is always the second segment
  const pageKey = parts[1] || parts[0] || 'dashboard'
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
          {collapsed ? <Menu size={14} /> : <PanelLeftClose size={14} />}
        </button>
        <span className="breadcrumb">
          {ws ? `${ws.name} / ` : ''}{pageLabel}
        </span>
      </div>

      <div className="top-right" ref={menuRef}>
        {/* Workspace switcher */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn ws-btn"
            onClick={toggleWsMenu}
            title="Switch workspace"
            aria-haspopup="menu"
            aria-expanded={wsOpen}
          >
            <span className="dot purple" />
            {ws ? ws.name : 'No workspace'}
            <span style={{ fontSize: '8px', color: '#666' }}><ChevronDown size={10} /></span>
          </button>
          {wsOpen && (
            <div className="dropdown-menu" role="menu">
              <div className="dropdown-head">Workspaces</div>
              {wsList === null && <div className="dropdown-empty">Loading…</div>}
              {Array.isArray(wsList) && wsList.length === 0 && (
                <div className="dropdown-empty">No workspaces yet</div>
              )}
              {Array.isArray(wsList) && wsList.map((w) => (
                <button
                  key={w.id}
                  className={`dropdown-item${ws?.id === w.id ? ' active' : ''}`}
                  onClick={() => {
                    setWsOpen(false)
                    if (ws?.id !== w.id) {
                      setCurrentWorkspace(w)
                      navigate('/dashboard')
                    }
                  }}
                >
                  <span className="dot purple" />
                  {w.name}
                </button>
              ))}
              {Array.isArray(wsList) && (
                <button
                  className="dropdown-item"
                  onClick={() => { setWsOpen(false); navigate('/workspaces') }}
                >
                  + New workspace
                </button>
              )}
            </div>
          )}
        </div>

        {/* Profile menu */}
        <div style={{ position: 'relative' }}>
          <button
            className="profile-btn"
            onClick={() => { setProfileOpen(!profileOpen); setWsOpen(false) }}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            title="Account"
          >
            <span className="avatar">{initials}</span>
            <span className="user">{name}</span>
          </button>
          {profileOpen && (
            <div className="dropdown-menu right" role="menu">
              <div className="dropdown-head">{name}</div>
              {user?.email && <div className="dropdown-email">{user.email}</div>}
              <button className="dropdown-item danger" onClick={logout}>
                <LogOut size={12} style={{ display: 'inline', marginRight: '5px' }} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
