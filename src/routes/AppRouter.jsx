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
import ForgotPassword from '../auth/ForgotPassword'
import { getCurrentWorkspace, setCurrentWorkspace, getWorkspaces, canAccessModule, refreshMyProjectMemberships, getSelectedProjectId, setSelectedProjectId } from '../features/workspaces/workspaces.service.js'
import PageSkeleton from '../components/PageSkeleton.jsx'

const AUTH_PAGES = ['login', 'signup', 'forgot-password']

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
  const [, setWsSyncTick] = useState(0)
  const routeKey = `${route.page}:${route.id || ''}:${route.workspace || ''}`
  const [readyKey, setReadyKey] = useState('')
  const pageLoading = readyKey !== routeKey

  useEffect(() => {
    const t = setTimeout(() => setReadyKey(routeKey), 350)
    return () => clearTimeout(t)
  }, [routeKey])

  useEffect(() => {
    const onPop = () => setRoute(parsePath())
    const onProjectChanged = () => setWsSyncTick(t => t + 1)
    window.addEventListener('popstate', onPop)
    window.addEventListener('thoth:project-changed', onProjectChanged)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('thoth:project-changed', onProjectChanged)
    }
  }, [])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const current = getCurrentWorkspace()
    if (!token || !current?.id) return
    let alive = true
    getWorkspaces()
      .then(async (rows) => {
        if (!alive || !Array.isArray(rows)) return
        const fresh = rows.find(w => String(w.id) === String(current.id))
        if (!fresh) {
          setCurrentWorkspace(null)
          await refreshMyProjectMemberships(null).catch(() => {})
          if (alive) setWsSyncTick(t => t + 1)
          return
        }
        const prev = JSON.stringify({ role: current.role, settings: current.settings || {}, name: current.name })
        const next = JSON.stringify({ role: fresh.role, settings: fresh.settings || {}, name: fresh.name })
        if (prev !== next) {
          setCurrentWorkspace({ ...current, ...fresh })
        }
        const memberships = await refreshMyProjectMemberships(fresh.id).catch(() => [])
        const selected = getSelectedProjectId(fresh.id)
        if (Array.isArray(memberships) && memberships.length > 0) {
          const hasSelected = selected && memberships.some(m => String(m.project_id) === String(selected))
          if (!hasSelected) {
            setSelectedProjectId(memberships[0].project_id, fresh.id)
          }
        } else if (!Array.isArray(memberships) || memberships.length === 0) {
          setSelectedProjectId(null, fresh.id)
        }
        if (alive) setWsSyncTick(t => t + 1)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [route.page, route.workspace])

  const { workspace } = route
  let { page } = route
  const routeId = route.id

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  // If not authenticated and not on auth pages, show login by default
  if(!token && !AUTH_PAGES.includes(page)){
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

  const MODULE_PAGES = ['dashboard', 'projects', 'tasks', 'bugs', 'calendar', 'reports', 'markdown', 'settings']
  if (token && MODULE_PAGES.includes(page) && !canAccessModule(page)) {
    const fallback = MODULE_PAGES.find((p) => canAccessModule(p)) || 'workspaces'
    page = fallback
  }

  switch(page){
    case 'login': return render(<Login />)
    case 'signup': return render(<Signup />)
    case 'forgot-password': return render(<ForgotPassword />)
    case 'dashboard': return render(<Dashboard workspace={workspace} />)
    case 'projects': return render(<Projects workspace={workspace} projectId={routeId} />)
    case 'tasks': return render(<Tasks workspace={workspace} subPage={routeId} />)
    case 'bugs': return render(<Bugs workspace={workspace} subPage={routeId} />)
    case 'calendar': return render(<Calendar workspace={workspace} />)
    case 'reports': return render(<Reports workspace={workspace} />)
    case 'markdown': return render(<Markdown subPage={routeId} />)
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
        <AppLayout key={wsKey}>{pageLoading ? <PageSkeleton /> : element}</AppLayout>
      </ErrorBoundary>
    )
  }
}
