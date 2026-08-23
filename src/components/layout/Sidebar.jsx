import { useState, useEffect } from 'react'
import { setCurrentWorkspace } from '../../features/workspaces/workspaces.service.js'

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: '◫' },
  { key: 'projects', label: 'Projects', icon: '📁' },
  {
    key: 'tasks', label: 'Tasks', icon: '☑',
    children: [
      { sub: 'all', label: 'All Task' },
      { sub: 'stages', label: 'Task Stages' },
    ],
  },
  {
    key: 'bugs', label: 'Bugs', icon: '🐞',
    children: [
      { sub: 'all', label: 'All Bugs' },
      { sub: 'stages', label: 'Bug Stages' },
    ],
  },
  { key: 'calendar', label: 'Calendar', icon: '▦' },
  { key: 'reports', label: 'Reports', icon: '▥' },
  { key: 'markdown', label: 'Markdown', icon: '✎' },
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

function navigateTo(workspace, page, sub) {
  const path = sub
    ? `/Thoth/${workspace}/${page}/${sub}`
    : `/Thoth/${workspace}/${page}`
  window.history.pushState({}, '', path)
  // trigger SPA routing listeners
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function Sidebar({ collapsed }) {
  const [route, setRoute] = useState(parsePath())
  const [openKey, setOpenKey] = useState(null)

  useEffect(() => {
    const onPop = () => setRoute(parsePath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

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
        {NAV.map(item => (
          <div key={item.key}>
            <a href={`/Thoth/${workspace}/${item.key}`}
               title={item.label}
               className={`nav-item ${page === item.key && !item.children ? 'active' : ''} ${page === item.key && item.children ? 'parent-active' : ''}`}
               onClick={(e) => handleNavClick(e, item)}>
              <span className="icon">{item.icon}</span>
              <span className="label">{item.label}</span>
              {item.children && !collapsed && (
                <span className="chev" style={{
                  marginLeft: 'auto', fontSize: '8px', color: '#555',
                  transform: openKey === item.key ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.15s',
                }}>▶</span>
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
        ))}
      </nav>

      {!collapsed && (
        <>
          <div className="section-title">Projects</div>
          <div>
            <div className="project"><span className="dot purple" />Thoth Core</div>
            <div className="project"><span className="dot green" />API Gateway</div>
          </div>
        </>
      )}

      <div className="bottom">
        <a href={`/Thoth/${workspace}/workspaces`} title="Workspaces" className={`nav-item ${page === 'workspaces' ? 'active' : ''}`} onClick={(e)=>{e.preventDefault(); navigateTo(workspace,'workspaces')}}><span className="icon">▣</span><span className="label">Workspace</span></a>
        <a href={`/Thoth/${workspace}/settings`} title="Settings" className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={(e)=>{e.preventDefault(); navigateTo(workspace,'settings')}}><span className="icon">⚙</span><span className="label">Settings</span></a>
        <a href="/login" title="Log out" className="nav-item" onClick={(e)=>{
          e.preventDefault()
          localStorage.removeItem('token')
          localStorage.removeItem('thoth_user')
          setCurrentWorkspace(null)
          window.history.pushState({}, '', '/login')
          window.dispatchEvent(new PopStateEvent('popstate'))
        }}><span className="icon">⏻</span><span className="label">Log out</span></a>
        {!collapsed && (
          <div className="status"><span className="status-dot" />PostgreSQL connected</div>
        )}
      </div>
    </aside>
  )
}
