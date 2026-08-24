import { useState, useEffect } from 'react'
import {
  LayoutDashboard, FolderOpen, ListChecks, Bug as BugIcon,
  Calendar, BarChart3, FilePen, LayoutGrid, Settings, LogOut,
  ChevronRight,
} from 'lucide-react'
import { setCurrentWorkspace, getCurrentWorkspace } from '../../features/workspaces/workspaces.service.js'
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
  { key: 'markdown', label: 'Markdown', Icon: FilePen },
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

  useEffect(() => {
    let alive = true
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

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <nav className="nav">
        {NAV.map(item => {
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
                    marginLeft: 'auto', color: '#555', display: 'inline-flex',
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
          <div className="section-title">Projects</div>
          <div>
            {projects.length === 0 ? (
              <div className="project" style={{ color: '#555' }}>No projects yet</div>
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
                  <span className="dot" style={{ background: STATUS_COLORS[p.status] || '#777', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                </a>
              ))
            )}
          </div>
        </>
      )}

      <div className="bottom">
        <a href={`/Thoth/${workspace}/workspaces`} title="Workspaces" className={`nav-item ${page === 'workspaces' ? 'active' : ''}`} onClick={(e)=>{e.preventDefault(); navigateTo(workspace,'workspaces')}}><span className="icon"><LayoutGrid size={14} /></span><span className="label">Workspace</span></a>
        <a href={`/Thoth/${workspace}/settings`} title="Settings" className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={(e)=>{e.preventDefault(); navigateTo(workspace,'settings')}}><span className="icon"><Settings size={14} /></span><span className="label">Settings</span></a>
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
