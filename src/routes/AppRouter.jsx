import { useState, useEffect } from 'react'
import AppLayout from '../components/layout/AppLayout'
import ErrorBoundary from '../components/ErrorBoundary.jsx'
import Dashboard from '../features/dashboard/Dashboard'
import Projects from '../pages/Projects'
import Tasks from '../pages/Tasks'
import Bugs from '../pages/Bugs'
import Calendar from '../pages/Calendar'
import Reports from '../pages/Reports'
import Markdown from '../pages/Markdown'
import Settings from '../pages/Settings'
import Workspaces from '../pages/Workspaces'
import Login from '../auth/Login'
import Signup from '../auth/Signup'
import { getCurrentWorkspace } from '../features/workspaces/workspaces.service.js'

const AUTH_PAGES = ['login', 'signup']

function parsePath(){
  const parts = window.location.pathname.split('/').filter(Boolean)
  let workspace = 'default'
  let page = 'dashboard'
  if(parts.length === 0){ return {workspace,page,id:null} }
  // Support both /Thoth/workspace/page and /workspace/page
  if(parts[0].toLowerCase() === 'thoth'){
    parts.shift()
  }
  if(parts.length === 0){ return {workspace,page,id:null} }
  // /login and /signup are top-level pages, not workspaces
  if(AUTH_PAGES.includes(parts[0])){
    return { workspace: 'default', page: parts[0], id: null }
  }
  // A single segment is a PAGE (e.g. /workspaces, /tasks), not a workspace name
  if(parts.length === 1){
    return { workspace: 'default', page: parts[0], id: null }
  }
  if(parts[0]) workspace = parts[0]
  if(parts[1]) page = parts[1]
  const id = parts[2] || null
  return {workspace,page,id}
}

export default function AppRouter(){
  const [route, setRoute] = useState(parsePath())

  useEffect(() => {
    const onPop = () => setRoute(parsePath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const { workspace } = route
  let { page } = route
  const routeId = route.id

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  // If not authenticated and not on auth pages, show login by default
  if(!token && page !== 'login' && page !== 'signup'){
    page = 'login'
  }

  // Already authenticated? Skip auth pages
  if(token && AUTH_PAGES.includes(page)){
    page = 'dashboard'
  }

  // A workspace is required before using the app
  if(token && !getCurrentWorkspace() && page !== 'workspaces'){
    page = 'workspaces'
  }

  switch(page){
    case 'login': return render(<Login />)
    case 'signup': return render(<Signup />)
    case 'dashboard': return render(<Dashboard workspace={workspace} />)
    case 'projects': return render(<Projects workspace={workspace} projectId={routeId} />)
    case 'tasks': return render(<Tasks workspace={workspace} subPage={routeId} />)
    case 'bugs': return render(<Bugs workspace={workspace} subPage={routeId} />)
    case 'calendar': return render(<Calendar workspace={workspace} />)
    case 'reports': return render(<Reports workspace={workspace} />)
    case 'markdown': return render(<Markdown workspace={workspace} />)
    case 'workspaces': return render(<Workspaces workspace={workspace} />)
    case 'settings': return render(<Settings workspace={workspace} />)
    default: return render(<Dashboard workspace={workspace} />)
  }

  function render(element){
    // Auth pages and logged-out users get no app chrome
    if(!token || AUTH_PAGES.includes(page)){
      return element
    }
    // Key on the selected workspace so pages remount (and refetch) when it changes
    const wsKey = getCurrentWorkspace()?.id || 'none'
    return (
      <ErrorBoundary>
        <AppLayout key={wsKey}>{element}</AppLayout>
      </ErrorBoundary>
    )
  }
}
