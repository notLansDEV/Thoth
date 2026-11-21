import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getProjects, addProject, deleteProject } from '../features/projects/projects.service.js'
import { getCurrentWorkspace, canWriteModule, canDeleteModule, getMembers } from '../features/workspaces/workspaces.service.js'
import { getAccountUser } from '../features/auth/account.service.js'
import ProjectForm from '../features/projects/components/ProjectForm.jsx'
import ProjectCard from '../features/projects/components/ProjectCard.jsx'
import EditProjectModal from '../features/projects/components/EditProjectModal.jsx'
import ProjectDetail from '../features/projects/components/ProjectDetail.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'

function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function Projects({ workspace, projectId }) {
  const [projects, setProjects] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [members, setMembers] = useState([])
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(null)
  const [deletingProject, setDeletingProject] = useState(false)
  const canWrite = canWriteModule('projects')
  const canDelete = canDeleteModule('projects')

  const ws = getCurrentWorkspace()
  const user = getAccountUser()
  const role = (ws?.role || '').toLowerCase()
  const isWorkspaceOwner = role === 'owner'
  const isWorkspaceAdmin = role === 'admin'

  const creatorRole = (project) => {
    if (!project?.created_by) return 'owner' // legacy treated as owner-managed by default
    const m = (members || []).find((x) => String(x.id) === String(project.created_by))
    return m?.role || null
  }

  const canDeleteProject = (project) => {
    const uid = user?.id
    if (!uid) return false

    // Workspace owner can delete all created projects
    if (isWorkspaceOwner) return true

    // Admin can create/delete projects but cannot delete owner's projects
    if (isWorkspaceAdmin) {
      if (creatorRole(project) === 'owner') return false
      return canDelete
    }

    // Members: respect module delete permission and allow deleting own non-owner projects only
    if (!canDelete) return false
    if (!project?.created_by) return false
    if (creatorRole(project) === 'owner') return false
    return String(project.created_by) === String(uid)
  }

  useEffect(() => {
    if (projectId) return
    let alive = true

    async function loadProjects() {
      const current = getCurrentWorkspace()
      const [rows, memberRows] = await Promise.all([
        getProjects(current?.id || undefined),
        current?.id ? getMembers(current.id).catch(() => []) : Promise.resolve([]),
      ])
      if (alive) {
        setProjects(rows)
        setMembers(memberRows || [])
      }
    }

    loadProjects()

    return () => {
      alive = false
    }
  }, [workspace, projectId])

  useEffect(() => {
    if (projectId) return
    const syncNew = () => {
      const params = new URLSearchParams(window.location.search)
      if (params.get('new') === '1' && canWrite) {
        setShowForm(true)
        params.delete('new')
        const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`
        window.history.replaceState({}, '', next)
      }
    }
    syncNew()
    window.addEventListener('popstate', syncNew)
    return () => window.removeEventListener('popstate', syncNew)
  }, [projectId, canWrite, workspace])

  const openProject = (project) => {
    const slug = ws?.slug || ws?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'ws'
    navigate(`/Thoth/${slug}/projects/${project.id}`)
  }

  const backToList = () => {
    const slug = ws?.slug || ws?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'ws'
    navigate(`/Thoth/${slug}/projects`)
  }

  const handleAddProject = async (fields) => {
    const current = getCurrentWorkspace()
    const newProject = await addProject(current?.id || workspace?.id, fields)
    setProjects((currentList) => [...currentList, newProject])
    setShowForm(false)
  }

  const handleUpdated = (updated) => {
    setProjects((current) => current.map((p) => (p.id === updated.id ? updated : p)))
    setEditing(null)
    setRefreshKey((k) => k + 1)
  }

  const handleDelete = (project) => {
    if (!canDeleteProject(project)) return
    setConfirmDeleteProject(project)
  }

  const handleConfirmDeleteProject = async () => {
    if (!confirmDeleteProject) return
    setDeletingProject(true)
    try {
      await deleteProject(confirmDeleteProject.id)
      setProjects((current) => current.filter((p) => p.id !== confirmDeleteProject.id))
      toast.success('Project deleted')
      setConfirmDeleteProject(null)
    } catch (err) {
      toast.error(err?.message || 'Could not delete project')
    } finally {
      setDeletingProject(false)
    }
  }

  // Full-screen project detail
  if (projectId) {
    return (
      <ProjectDetail
        key={refreshKey}
        projectId={projectId}
        onBack={backToList}
      />
    )
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '700' }}>Projects</h1>
          <p style={{ margin: '0', color: 'var(--muted)', fontSize: '12px' }}>Manage and track your projects</p>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowForm(true)}
            className="btn primary"
            style={{ cursor: 'pointer' }}
          >
            + New Project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--muted)'
        }}>
          <div style={{ fontSize: '14px', marginBottom: '12px' }}>No projects yet</div>
          <div style={{ fontSize: '12px', color: 'var(--muted2)' }}>Create your first project to get started</div>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              canWrite={canWrite}
              canDelete={canDeleteProject(project)}
              onView={openProject}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showForm && (
        <ProjectForm
          onSubmit={handleAddProject}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editing && (
        <EditProjectModal
          project={editing}
          onSaved={handleUpdated}
          onClose={() => setEditing(null)}
        />
      )}

      {confirmDeleteProject && (
        <ConfirmModal
          title={`Delete project "${confirmDeleteProject.name}"?`}
          message="This permanently deletes the project and its related data."
          note="* This action cannot be undone."
          confirmLabel="Delete project"
          requiredText="DELETE PROJECT"
          busy={deletingProject}
          onConfirm={handleConfirmDeleteProject}
          onCancel={() => { if (!deletingProject) setConfirmDeleteProject(null) }}
        />
      )}
    </div>
  )
}
