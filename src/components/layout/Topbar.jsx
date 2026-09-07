import { useEffect, useRef, useState } from 'react'
import { LogOut, Menu, PanelLeftClose, ChevronDown, Bell } from 'lucide-react'
import {
  getCurrentWorkspace,
  setCurrentWorkspace,
  getWorkspaces,
} from '../../features/workspaces/workspaces.service.js'
import { getProjects } from '../../features/projects/projects.service.js'
import {
  getNotifications,
  markNotificationRead,
  relativeTime,
} from '../../features/notifications/notifications.service.js'

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

const SUB_LABELS = {
  tasks: { all: 'All Task', stages: 'Task Stages' },
  bugs: { all: 'All Bugs', stages: 'Bug Stages' },
  markdown: { journal: 'Journal', pages: 'All Pages' },
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
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const menuRef = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setWsOpen(false)
        setProfileOpen(false)
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  async function refreshNotifications() {
    try {
      const data = await getNotifications(50)
      setNotifications(Array.isArray(data.notifications) ? data.notifications : [])
      setUnread(data.unread || 0)
    } catch {
      setNotifications([])
      setUnread(0)
    }
  }

  useEffect(() => {
    refreshNotifications()
    const onDataChanged = () => refreshNotifications()
    window.addEventListener('thoth:data-changed', onDataChanged)
    const timer = setInterval(refreshNotifications, 15000)
    const onVisible = () => refreshNotifications()
    window.addEventListener('focus', onVisible)
    return () => {
      window.removeEventListener('thoth:data-changed', onDataChanged)
      clearInterval(timer)
      window.removeEventListener('focus', onVisible)
    }
  }, [])

  async function toggleWsMenu() {
    const next = !wsOpen
    setWsOpen(next)
    setProfileOpen(false)
    setNotifOpen(false)
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
  // /{workspace}/{page}[/{sub|id}] — page is always the second segment
  const pageKey = parts[1] || parts[0] || 'dashboard'
  const subSeg = parts[2] || null
  const pageLabel = PAGE_LABELS[pageKey] || pageKey

  // Resolve the crumb tail: project name on detail pages, otherwise sub-page label
  const [projectName, setProjectName] = useState(null)
  useEffect(() => {
    setProjectName(null)
    if (!(pageKey === 'projects' && subSeg)) return undefined
    let alive = true
    getProjects(getCurrentWorkspace()?.id)
      .then((rows) => {
        if (!alive) return
        const p = (Array.isArray(rows) ? rows : []).find((x) => x.id === subSeg)
        setProjectName(p?.name || null)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [pageKey, subSeg])

  let crumbTail = null
  if (pageKey === 'projects' && subSeg) {
    crumbTail = projectName || null
  } else if (subSeg && SUB_LABELS[pageKey]?.[subSeg]) {
    crumbTail = SUB_LABELS[pageKey][subSeg]
  }
  const tailIsSub = Boolean(subSeg && SUB_LABELS[pageKey]?.[subSeg])

  const go = (segments) => (e) => {
    e.preventDefault()
    const path = ['/Thoth', ws?.slug, ...segments].filter(Boolean).join('/')
    navigate(path)
  }

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
        <button
          className="collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <Menu size={14} /> : <PanelLeftClose size={14} />}
        </button>
        <span className="breadcrumb">
          {ws ? (
            <button className="crumb-link crumb-ws" onClick={go(['dashboard'])}>{ws.name}</button>
          ) : (
            <span className="crumb-ws">No workspace</span>
          )}
          <span className="crumb-sep">/</span>
          <button className="crumb-link crumb-here" onClick={go([pageKey])}>{pageLabel}</button>
          {crumbTail && (
            <>
              <span className="crumb-sep">&gt;</span>
              {tailIsSub ? (
                <button className="crumb-link" onClick={go([pageKey, subSeg])}>{crumbTail}</button>
              ) : (
                <span>{crumbTail}</span>
              )}
            </>
          )}
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
            <span style={{ fontSize: '8px', color: 'var(--muted2)' }}><ChevronDown size={10} /></span>
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

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            className="notif-btn"
            onClick={() => {
              const next = !notifOpen
              setNotifOpen(next)
              setWsOpen(false)
              setProfileOpen(false)
              if (next) refreshNotifications()
            }}
            aria-haspopup="menu"
            aria-expanded={notifOpen}
            title="Notifications"
          >
            <Bell size={14} />
            {unread > 0 && <span className="notif-badge">{unread}</span>}
          </button>
          {notifOpen && (
            <div className="dropdown-menu right" role="menu" style={{ minWidth: '260px' }}>
              <div className="dropdown-head">Notifications</div>
              {notifications.length === 0 && <div className="dropdown-empty">No notifications</div>}
              {notifications.map((n) => (
                <button
                  key={n.id}
                  className={`dropdown-item${n.is_read ? '' : ' unread'}`}
                  onClick={() => {
                    setNotifOpen(false)
                    if (!n.is_read) {
                      markNotificationRead(n.id).catch(() => {})
                      setUnread((u) => Math.max(0, u - 1))
                    }
                    const page = n.entity_type === 'task' ? 'tasks' : n.entity_type === 'bug' ? 'bugs' : n.entity_type
                    const base = ['/Thoth', ws?.slug || ws?.id, page].filter(Boolean).join('/')
                    navigate(n.entity_id ? `${base}/${n.entity_id}` : base)
                  }}
                  style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 2 }}
                >
                  <span style={{ color: 'var(--text-soft)', fontSize: '11px', lineHeight: 1.4 }}>{n.title}</span>
                  {n.body && <span style={{ fontSize: '10px', color: 'var(--muted)', lineHeight: 1.3 }}>{n.body}</span>}
                  <span style={{ fontSize: '9px', color: 'var(--muted2)' }}>{relativeTime(n.created_at)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Profile menu */}
        <div style={{ position: 'relative' }}>
          <button
            className="profile-btn"
            onClick={() => { setProfileOpen(!profileOpen); setWsOpen(false); setNotifOpen(false) }}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            title={name}
          >
            <span className="avatar">{initials}</span>
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
