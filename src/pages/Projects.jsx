import { useEffect, useState } from 'react'
import { getProjects, addProject, deleteProject } from '../features/projects/projects.service.js'
import { getCurrentWorkspace } from '../features/workspaces/workspaces.service.js'
import ProjectForm from '../features/projects/components/ProjectForm.jsx'
import ProjectCard from '../features/projects/components/ProjectCard.jsx'
import EditProjectModal from '../features/projects/components/EditProjectModal.jsx'
import ProjectDetail from '../features/projects/components/ProjectDetail.jsx'

function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function Projects({ workspace, projectId }) {
  const [projects, setProjects] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const ws = getCurrentWorkspace()

  useEffect(() => {
    if (projectId) return
    let alive = true

    async function loadProjects() {
      const current = getCurrentWorkspace()
      const rows = await getProjects(current?.id || undefined)
      if (alive) setProjects(rows)
    }

    loadProjects()

    return () => {
      alive = false
    }
  }, [workspace, projectId])

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

  const handleDelete = async (project) => {
    if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return
    try {
      await deleteProject(project.id)
      setProjects((current) => current.filter((p) => p.id !== project.id))
    } catch {
      window.alert('Could not delete project')
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
          <p style={{ margin: '0', color: '#737373', fontSize: '12px' }}>Manage and track your projects</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn primary"
          style={{ cursor: 'pointer' }}
        >
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#777'
        }}>
          <div style={{ fontSize: '14px', marginBottom: '12px' }}>No projects yet</div>
          <div style={{ fontSize: '12px', color: '#555' }}>Create your first project to get started</div>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
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
    </div>
  )
}
