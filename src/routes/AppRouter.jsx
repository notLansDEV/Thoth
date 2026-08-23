import React, { useState, useEffect } from 'react'
import Dashboard from '../features/dashboard/Dashboard'
import Projects from '../pages/Projects'
import Kanban from '../pages/Kanban'
import Tasks from '../pages/Tasks'
import Bugs from '../pages/Bugs'
import Calendar from '../pages/Calendar'
import Milestones from '../pages/Milestones'
import Reports from '../pages/Reports'
import Markdown from '../pages/Markdown'
import Settings from '../pages/Settings'
import Workspaces from '../pages/Workspaces'

function parsePath(){
  const parts = window.location.pathname.split('/').filter(Boolean)
  let workspace = 'default'
  let page = 'dashboard'
  if(parts.length === 0){ return {workspace,page} }
  // Support both /Thoth/workspace/page and /workspace/page
  if(parts[0].toLowerCase() === 'thoth'){
    if(parts[1]) workspace = parts[1]
    if(parts[2]) page = parts[2]
  } else {
    if(parts[0]) workspace = parts[0]
    if(parts[1]) page = parts[1]
  }
  return {workspace,page}
}

export default function AppRouter(){
  const [route, setRoute] = useState(parsePath())

  useEffect(() => {
    const onPop = () => setRoute(parsePath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const { workspace, page } = route

  switch(page){
    case 'dashboard': return <Dashboard workspace={workspace} />
    case 'projects': return <Projects workspace={workspace} />
    case 'kanban': return <Kanban workspace={workspace} />
    case 'tasks': return <Tasks workspace={workspace} />
    case 'bugs': return <Bugs workspace={workspace} />
    case 'calendar': return <Calendar workspace={workspace} />
    case 'milestones': return <Milestones workspace={workspace} />
    case 'reports': return <Reports workspace={workspace} />
    case 'markdown': return <Markdown workspace={workspace} />
    case 'workspaces': return <Workspaces workspace={workspace} />
    case 'settings': return <Settings workspace={workspace} />
    default: return <Dashboard workspace={workspace} />
  }
}
