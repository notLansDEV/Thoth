import { useEffect, useState } from 'react'
import { getProjects, addProject } from '../features/projects/projects.service.js'
import { getCurrentWorkspace } from '../features/workspaces/workspaces.service.js'
import ProjectForm from '../features/projects/components/ProjectForm.jsx'
import ProjectCard from '../features/projects/components/ProjectCard.jsx'

export default function Projects({ workspace }) {
  const [projects, setProjects] = useState([])
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    let alive = true

    async function loadProjects() {
      const ws = getCurrentWorkspace()
      const rows = await getProjects(ws?.id || undefined)
      if (alive) setProjects(rows)
    }

    loadProjects()

    return () => {
      alive = false
    }
  }, [workspace])

  const handleAddProject = async (fields) => {
    const ws = getCurrentWorkspace()
    const newProject = await addProject(ws?.id || workspace?.id, fields)
    setProjects((current) => [...current, newProject])
    setShowForm(false)
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
          style={{
            height: '32px',
            padding: '0 14px',
            borderRadius: '4px',
            background: '#695df0',
            border: '0',
            color: '#fff',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '12px'
          }}
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
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {showForm && (
        <ProjectForm
          onSubmit={handleAddProject}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
