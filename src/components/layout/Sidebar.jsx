import { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard, FolderOpen, ListChecks, Bug as BugIcon,
  Calendar, BarChart3, FilePen, LayoutGrid, Settings, LogOut,
  ChevronRight, ChevronDown, Plus,
} from 'lucide-react'
import { setCurrentWorkspace, getCurrentWorkspace, canAccessModule, canWriteModule, getWorkspaces, refreshMyProjectMemberships } from '../../features/workspaces/workspaces.service.js'
import { getProjects } from '../../features/projects/projects.service.js'

const STATUS_COLORS = {
  planning: '#5f74ff',
  active: '#20d86b',
  on_hold: '#ff7918',
  completed: '#7165ff',
  cancelled: '#ff4040',
}

const NAV = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'projects', label: 'Projects', Icon: FolderOpen },
  {
    key: 'tasks', label: 'Tasks', Icon: ListChecks,
    children: [
      { sub: 'all', label: 'All Task' },
      { sub: 'stages', label: 'Task Stages' },
    ],
  },
  {
    key: 'bugs', label: 'Bugs', Icon: BugIcon,
    children: [
      { sub: 'all', label: 'All Bugs' },
      { sub: 'stages', label: 'Bug Stages' },
    ],
  },
  { key: 'calendar', label: 'Calendar', Icon: Calendar },
  { key: 'reports', label: 'Reports', Icon: BarChart3 },
  {
    key: 'markdown', label: 'Markdown', Icon: FilePen,
    children: [
      { sub: 'journal', label: 'Journal' },
      { sub: 'pages', label: 'All Pages' },
    ],
  },
]

function parsePath() {
  const parts = window.location.pathname.split('/').filter(Boolean)
  if (parts[0] && parts[0].toLowerCase() === 'thoth') {
    parts.shift()
  }
  const workspace = parts[0] || 'default'
  const page = parts[1] || 'dashboard'
  const sub = parts[2] || null
  return { workspace, page, sub }
}

function navigateTo(workspace, page, sub, id) {
  let path = sub
    ? `/Thoth/${workspace}/${page}/${sub}`
    : `/Thoth/${workspace}/${page}`
  if (id) path += `/${id}`
  window.history.pushState({}, '', path)
  // trigger SPA routing listeners
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function Sidebar({ collapsed }) {
  const [route, setRoute] = useState(parsePath())
  const [openKey, setOpenKey] = useState(null)
  const [projects, setProjects] = useState([])
  const [wsList, setWsList] = useState([])
  const [wsOpen, setWsOpen] = useState(false)
  const wsMenuRef = useRef(null)

  useEffect(() => {
    let alive = true
    getWorkspaces().then((rows) => { if (alive) setWsList(Array.isArray(rows) ? rows : []) }).catch(() => { if (alive) setWsList([]) })
    getProjects(getCurrentWorkspace()?.id)
      .then((rows) => { if (alive) setProjects(Array.isArray(rows) ? rows : []) })
      .catch(() => { if (alive) setProjects([]) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const onPop = () => setRoute(parsePath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    function onDocClick(e) {
      if (wsMenuRef.current && !wsMenuRef.current.contains(e.target)) setWsOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function openProject(e, id) {
    e.preventDefault()
    navigateTo(workspace, 'projects', null, id)
  }

  const { workspace, page, sub } = route

  // Auto-expand the section matching the current page (reset on page change, during render)
  const [prevPage, setPrevPage] = useState(page)
  if (prevPage !== page) {
    setPrevPage(page)
    const parent = NAV.find((n) => n.children && n.key === page)
    setOpenKey(parent ? parent.key : null)
  }

  function handleNavClick(e, item) {
    e.preventDefault()
    if (item.children) {
      setOpenKey(openKey === item.key ? null : item.key)
      navigateTo(workspace, item.key, item.children[0].sub)
    } else {
      navigateTo(workspace, item.key)
    }
  }

  function isChildActive(item, child) {
    return page === item.key && (sub || item.children[0].sub) === child.sub
  }

  async function switchWorkspace(w) {
    setWsOpen(false)
    if (!w || String(getCurrentWorkspace()?.id) === String(w.id)) return
    setCurrentWorkspace(w)
    await refreshMyProjectMemberships(w.id).catch(() => {})
    navigateTo(w.slug || 'default', 'dashboard')
  }

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="side-head">
        <span className="brand-icon" aria-hidden="true">
          <img src="/favicon.svg" alt="" />
        </span>
        <span className="label side-brand">Thoth</span>
      </div>

      {!collapsed && (
        <div ref={wsMenuRef} style={{ padding: '8px 8px 4px', position: 'relative' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 4px 6px' }}>Workspace</div>
          <button
            type="button"
            className="btn ws-btn"
            onClick={() => setWsOpen(v => !v)}
            title="Switch workspace"
            aria-haspopup="menu"
            aria-expanded={wsOpen}
            style={{ width: '100%', justifyContent: 'space-between', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span className="dot purple" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{getCurrentWorkspace()?.name || 'No workspace'}</span>
            </span>
            <ChevronDown size={12} style={{ color: 'var(--muted2)', flexShrink: 0 }} />
          </button>
          {wsOpen && (
            <div className="dropdown-menu" role="menu" style={{ left: 8, right: 8, minWidth: 0, top: 'calc(100% - 2px)', zIndex: 40 }}>
              <div className="dropdown-head">Workspaces</div>
              {wsList.length === 0 && <div className="dropdown-empty">No workspaces</div>}
              {wsList.map((w) => (
                <button
                  key={w.id}
                  className={`dropdown-item${String(getCurrentWorkspace()?.id) === String(w.id) ? ' active' : ''}`}
                  onClick={() => switchWorkspace(w)}
                >
                  <span className="dot purple" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</span>
                </button>
              ))}
              <button className="dropdown-item" onClick={() => { setWsOpen(false); navigateTo(workspace, 'workspaces') }}>
                + Manage workspaces
              </button>
            </div>
          )}
        </div>
      )}

      <nav className="nav">
        {NAV.filter((item) => canAccessModule(item.key)).map(item => {
          const { Icon } = item
          return (
            <div key={item.key}>
              <a href={`/Thoth/${workspace}/${item.key}`}
                 title={item.label}
                 className={`nav-item ${page === item.key && !item.children ? 'active' : ''} ${page === item.key && item.children ? 'parent-active' : ''}`}
                 onClick={(e) => handleNavClick(e, item)}>
                <span className="icon"><Icon size={14} /></span>
                <span className="label">{item.label}</span>
                {item.children && !collapsed && (
                  <span className="chev" style={{
                    marginLeft: 'auto', color: 'var(--muted2)', display: 'inline-flex',
                    transform: openKey === item.key ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.15s',
                  }}><ChevronRight size={11} /></span>
                )}
              </a>

              {item.children && !collapsed && openKey === item.key && (
                <div className="submenu">
                  {item.children.map(child => (
                    <a key={child.sub}
                       href={`/Thoth/${workspace}/${item.key}/${child.sub}`}
                       className={`submenu-item ${isChildActive(item, child) ? 'active' : ''}`}
                       onClick={(e) => { e.preventDefault(); navigateTo(workspace, item.key, child.sub) }}>
                      <span className="label">{child.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {!collapsed && (
        <>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span>Projects</span>
            {canWriteModule('projects') && (
              <button
                type="button"
                title="New project"
                aria-label="New project"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigateTo(workspace, 'projects'); window.history.pushState({}, '', `/Thoth/${workspace}/projects?new=1`); window.dispatchEvent(new PopStateEvent('popstate')) }}
                style={{
                  width: 20, height: 20, borderRadius: 5, border: '1px solid var(--border)',
                  background: 'var(--panel3)', color: 'var(--muted)', display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0
                }}
              >
                <Plus size={12} />
              </button>
            )}
          </div>
          <div>
            {projects.length === 0 ? (
              <div className="project" style={{ color: 'var(--muted2)' }}>No projects yet</div>
            ) : (
              projects.map((p) => (
                <a
                  key={p.id}
                  href={`/Thoth/${workspace}/projects/${p.id}`}
                  title={p.name}
                  className="project"
                  style={{ display: 'flex', cursor: 'pointer' }}
                  onClick={(e) => openProject(e, p.id)}
                >
                  <span className="dot" style={{ background: STATUS_COLORS[p.status] || 'var(--muted)', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                </a>
              ))
            )}
          </div>
        </>
      )}

      <div className="bottom">
        <a href={`/Thoth/${workspace}/workspaces`} title="Workspaces" className={`nav-item ${page === 'workspaces' ? 'active' : ''}`} onClick={(e)=>{e.preventDefault(); navigateTo(workspace,'workspaces')}}><span className="icon"><LayoutGrid size={14} /></span><span className="label">Workspace</span></a>
        {canAccessModule('settings') && (
          <a href={`/Thoth/${workspace}/settings`} title="Settings" className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={(e)=>{e.preventDefault(); navigateTo(workspace,'settings')}}><span className="icon"><Settings size={14} /></span><span className="label">Settings</span></a>
        )}
        <a href="/login" title="Log out" className="nav-item" onClick={(e)=>{
          e.preventDefault()
          localStorage.removeItem('token')
          localStorage.removeItem('thoth_user')
          setCurrentWorkspace(null)
          window.history.pushState({}, '', '/login')
          window.dispatchEvent(new PopStateEvent('popstate'))
        }}><span className="icon"><LogOut size={14} /></span><span className="label">Log out</span></a>
        {!collapsed && (
          <div className="status"><span className="status-dot" />PostgreSQL connected</div>
        )}
      </div>
    </aside>
  )
}
