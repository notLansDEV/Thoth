import { useEffect, useRef, useState } from 'react'
import { LogOut, Menu, PanelLeftClose, ChevronDown, Bell, Sun, Moon } from 'lucide-react'
import {
  getCurrentWorkspace,
  getProjectRole,
  refreshMyProjectMemberships,
  getSelectedProjectId,
  setSelectedProjectId,
} from '../../features/workspaces/workspaces.service.js'
import { getProjects } from '../../features/projects/projects.service.js'
import {
  getNotifications,
  markNotificationRead,
  relativeTime,
} from '../../features/notifications/notifications.service.js'
import { getSettings, saveSettings } from '../../features/settings/settings.service.js'
import { clearSession } from '../../features/auth/account.service.js'

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
  try { setCurrentWorkspace(null) } catch {}
  try {
    localStorage.removeItem('token')
    localStorage.removeItem('thoth_user')
    localStorage.removeItem('thoth_workspace')
  } catch {}
  window.location.href = '/login'
}

export default function Topbar({ collapsed, onToggleCollapse }) {
  const ws = getCurrentWorkspace()
  const hasWorkspace = !!ws?.id
  const user = getUser()
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [projOpen, setProjOpen] = useState(false)
  const [projList, setProjList] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [theme, setTheme] = useState(() => getSettings().theme)
  const [selectedProjectId, setSelectedProjectIdState] = useState(() => getSelectedProjectId(getCurrentWorkspace()?.id))
  const menuRef = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (e.target?.closest?.('[data-action="logout"]')) return
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setProfileOpen(false)
        setNotifOpen(false)
        setProjOpen(false)
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
    const onSettingsChanged = (e) => { if (e.detail?.theme) setTheme(e.detail.theme) }
    window.addEventListener('thoth:settings-changed', onSettingsChanged)
    const timer = setInterval(refreshNotifications, 15000)
    const onVisible = () => refreshNotifications()
    window.addEventListener('focus', onVisible)
    return () => {
      window.removeEventListener('thoth:data-changed', onDataChanged)
      window.removeEventListener('thoth:settings-changed', onSettingsChanged)
      clearInterval(timer)
      window.removeEventListener('focus', onVisible)
    }
  }, [])

  function resolvedTheme() {
    if (theme === 'system') {
      const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
      return dark ? 'dark' : 'light'
    }
    return theme
  }

  function toggleTheme() {
    const next = resolvedTheme() === 'dark' ? 'light' : 'dark'
    setTheme(next)
    saveSettings({ theme: next })
  }


  function pickDefaultProjectId(list, wsId) {
    const rows = Array.isArray(list) ? list : []
    if (rows.length === 0) return null
    const cur = getSelectedProjectId(wsId)
    if (cur && rows.some((p) => String(p.id) === String(cur))) return cur
    if (rows.length === 1) return rows[0].id
    const alpha = [...rows].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' }))
    return alpha[0]?.id || rows[0]?.id || null
  }

  async function loadProjectsAndResolveDefault() {
    const wsId = getCurrentWorkspace()?.id
    if (!wsId) {
      setProjList([])
      setSelectedProjectIdState(null)
      return
    }
    try {
      await refreshMyProjectMemberships(wsId).catch(() => {})
      const rows = await getProjects(wsId)
      const list = Array.isArray(rows) ? rows : []
      setProjList(list)
      const nextId = pickDefaultProjectId(list, wsId)
      const cur = getSelectedProjectId(wsId)
      if (nextId) {
        if (String(cur || '') !== String(nextId)) setSelectedProjectId(nextId, wsId)
        setSelectedProjectIdState(nextId)
      } else {
        if (cur) setSelectedProjectId(null, wsId)
        setSelectedProjectIdState(null)
      }
    } catch {
      setProjList([])
    }
  }

  async function toggleProjMenu() {
    const next = !projOpen
    setProjOpen(next)
    setProfileOpen(false)
    setNotifOpen(false)
    if (next) {
      await loadProjectsAndResolveDefault()
    }
  }

  function selectProject(projectId) {
    const wsId = getCurrentWorkspace()?.id
    setSelectedProjectId(projectId, wsId)
    setSelectedProjectIdState(projectId)
    setProjOpen(false)
    window.dispatchEvent(new CustomEvent('thoth:project-changed', { detail: { projectId, workspaceId: wsId } }))
    // Navigate to dashboard so module/sidebar permissions re-evaluate in project context
    navigate(`/Thoth/${ws?.slug || 'default'}/dashboard`)
  }

  const parts = window.location.pathname.split('/').filter(Boolean)
  if (parts[0] && parts[0].toLowerCase() === 'thoth') parts.shift()
  // /{workspace}/{page}[/{sub|id}] — page is always the second segment
  const pageKey = parts[1] || parts[0] || 'dashboard'
  const subSeg = parts[2] || null
  const pageLabel = PAGE_LABELS[pageKey] || pageKey

  useEffect(() => {
    setSelectedProjectIdState(getSelectedProjectId(getCurrentWorkspace()?.id))
  }, [ws?.id, pageKey, subSeg])

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!alive) return
      await loadProjectsAndResolveDefault()
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws?.id])

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
        {hasWorkspace && (
        <>
        {/* Project switcher */}
        <div style={{ position: 'relative' }}>
          {(() => {
            const activeProjectId = selectedProjectId || (pageKey === 'projects' ? subSeg : null)
            const activeProject = projList.find(p => String(p.id) === String(activeProjectId))
              || (pageKey === 'projects' && subSeg && projectName ? { id: subSeg, name: projectName } : null)
            return (
          <button
            className="btn ws-btn"
            onClick={toggleProjMenu}
            title="Switch project"
            aria-haspopup="menu"
            aria-expanded={projOpen}
            style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            <span className="dot" style={{ background: activeProject ? (activeProject.color || '#6e61ff') : 'var(--muted2)' }} />
            {activeProject?.name || 'Select project'}
            <span style={{ fontSize: '8px', color: 'var(--muted2)' }}><ChevronDown size={10} /></span>
          </button>
            )
          })()}
          {projOpen && (
            <div className="dropdown-menu" role="menu" style={{ minWidth: 220 }}>
              <div className="dropdown-head">Projects</div>
              {projList.length === 0 && <div className="dropdown-empty">No accessible projects</div>}
              {projList.map((p) => {
                const projectRole = getProjectRole?.(p.id, ws)
                const active = String(selectedProjectId || (pageKey === 'projects' ? subSeg : '')) === String(p.id)
                return (
                  <button
                    key={p.id}
                    className={`dropdown-item${active ? ' active' : ''}`}
                    onClick={() => selectProject(p.id)}
                    style={{ alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span className="dot" style={{ background: p.color || '#6e61ff', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    </span>
                    {projectRole && (
                      <span style={{ fontSize: 9, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.04em', flexShrink: 0 }}>
                        {String(projectRole).replace(/[_-]+/g, ' ')}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          className="notif-btn"
          onClick={() => { toggleTheme(); setProjOpen(false); setNotifOpen(false); setProfileOpen(false) }}
          aria-label={resolvedTheme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={resolvedTheme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {resolvedTheme() === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            className="notif-btn"
            onClick={() => {
              const next = !notifOpen
              setNotifOpen(next)
              setProjOpen(false)
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
        </>
        )}

        {/* Profile menu */}
        <div style={{ position: 'relative' }}>
          <button
            className="profile-btn"
            onClick={() => { setProfileOpen(!profileOpen); setProjOpen(false); setNotifOpen(false) }}
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
              <button
                type="button"
                className="dropdown-item danger"
                data-action="logout"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); logout(); }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); logout(); }}
              >
                <LogOut size={12} style={{ display: 'inline', marginRight: '5px' }} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
