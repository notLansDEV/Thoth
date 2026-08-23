import { useState, useEffect } from 'react'

const NAV = [
  {key:'dashboard',label:'Dashboard'},
  {key:'projects',label:'Projects'},
  {key:'tasks',label:'Tasks'},
  {key:'bugs',label:'Bugs'},
  {key:'calendar',label:'Calendar'},
  {key:'milestones',label:'Milestones'},
  {key:'reports',label:'Reports'},
  {key:'markdown',label:'Markdown'},
]

function parsePath(){
  const parts = window.location.pathname.split('/').filter(Boolean)
  if(parts[0] && parts[0].toLowerCase() === 'thoth'){
    return {workspace: parts[1] || 'default', page: parts[2] || 'dashboard'}
  }
  return {workspace: parts[0] || 'default', page: parts[1] || 'dashboard'}
}

function navigateTo(workspace, page){
  const path = `/Thoth/${workspace}/${page}`
  window.history.pushState({}, '', path)
  // trigger SPA routing listeners
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function Sidebar(){
  const [route, setRoute] = useState(parsePath())

  useEffect(() => {
    const onPop = () => setRoute(parsePath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const { workspace, page } = route

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <button className="back">‹</button>
        <span>thoth</span>
      </div>

      <nav className="nav">
        {NAV.map(item => (
          <a key={item.key}
             href={`/Thoth/${workspace}/${item.key}`}
             className={`nav-item ${page === item.key ? 'active' : ''}`}
             onClick={(e)=>{e.preventDefault(); navigateTo(workspace, item.key)}}>
            <span className="icon">◫</span>{item.label}
          </a>
        ))}
      </nav>

      <div className="section-title">Projects</div>
      <div>
        <div className="project"><span className="dot purple" />Thoth Core</div>
        <div className="project"><span className="dot green" />API Gateway</div>
      </div>

      <div className="bottom">
        <a href={`/Thoth/${workspace}/workspaces`} className={`nav-item ${page === 'workspaces' ? 'active' : ''}`} onClick={(e)=>{e.preventDefault(); navigateTo(workspace,'workspaces')}}>Workspace</a>
        <a href={`/Thoth/${workspace}/settings`} className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={(e)=>{e.preventDefault(); navigateTo(workspace,'settings')}}>Settings</a>
        <div className="status"><span className="status-dot" />SQLite connected</div>
      </div>
    </aside>
  )
}
