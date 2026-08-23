import { useEffect, useRef, useState } from 'react'
import {
  TASK_STAGES,
  priorityStyle,
  getTasks,
  updateTask,
} from '../features/tasks/tasks.service.js'
import { getProjects } from '../features/projects/projects.service.js'
import { getCurrentWorkspace } from '../features/workspaces/workspaces.service.js'
import CreateTaskModal from '../features/tasks/components/CreateTaskModal.jsx'
import TaskPreviewModal from '../features/tasks/components/TaskPreviewModal.jsx'

function isOverdue(task) {
  if (!task.due_date || task.status === 'done') return false
  return new Date(task.due_date) < new Date(new Date().toDateString())
}

function formatDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString()
}

function TaskCard({ task, compact, onOpen, onDragStart }) {
  const overdue = isOverdue(task)
  const due = formatDate(task.due_date)

  if (compact) {
    return (
      <div
        draggable
        onDragStart={(e) => onDragStart(e, task.id)}
        onClick={() => onOpen(task)}
        style={{
          background: '#101010', border: '1px solid #2a2a2a', borderRadius: '4px',
          padding: '8px 9px', marginBottom: '7px', cursor: 'grab',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#ddd', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.title}
          </span>
          <span className="badge" style={{ ...priorityStyle(task.priority), background: 'transparent', fontSize: '9px', flexShrink: 0 }}>
            {task.priority}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => onOpen(task)}
      style={{
        background: '#101010', border: overdue ? '1px solid rgba(255,64,64,0.4)' : '1px solid #2a2a2a',
        borderRadius: '4px', padding: '10px', marginBottom: '8px', cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = overdue ? 'rgba(255,64,64,0.7)' : '#6e61ff' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = overdue ? 'rgba(255,64,64,0.4)' : '#2a2a2a' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '12px', color: '#eee', fontWeight: 600 }}>{task.title}</div>
        <span className="badge" style={{ ...priorityStyle(task.priority), background: 'transparent', fontSize: '9px', flexShrink: 0 }}>
          {task.priority}
        </span>
      </div>

      {task.description && (
        <div style={{
          color: '#777', fontSize: '10px', marginTop: '5px',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {task.description}
        </div>
      )}

      {task.assignee_name && (
        <div style={{ fontSize: '10px', color: '#888', marginTop: '7px' }}>
          👤 {task.assignee_name}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        <span style={{ fontSize: '9px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="dot" style={{ background: task.project_color || '#6e61ff', width: 6, height: 6 }} />
          {task.project_name}
        </span>
        {due && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '9px' }}>
            {overdue && (
              <span style={{ color: '#ff4040', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Overdue
              </span>
            )}
            <span style={{ color: overdue ? '#ff8080' : '#777' }}>⏰ {due}</span>
          </span>
        )}
      </div>
    </div>
  )
}

export default function Tasks() {
  const ws = getCurrentWorkspace()
  const [mode, setMode] = useState('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [preview, setPreview] = useState(null)
  const dragId = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const [t, p] = await Promise.all([
          getTasks(ws?.id),
          getProjects(ws?.id),
        ])
        if (alive) { setTasks(t); setProjects(p) }
      } catch {
        if (alive) setTasks([])
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function handleDrop(status) {
    const id = dragId.current
    dragId.current = null
    if (!id) return
    const task = tasks.find((t) => t.id === id)
    if (!task || task.status === status) return

    setTasks((current) => current.map((t) => (t.id === id ? { ...t, status } : t)))
    updateTask(id, { status })
      .then((updated) => setTasks((cur) => cur.map((t) => (t.id === id ? { ...t, ...updated } : t))))
      .catch(() => setTasks((cur) => cur.map((t) => (t.id === id ? { ...t, status: task.status } : t))))
  }

  function onCreated(task) {
    setTasks((current) => [{
      ...task,
      project_name: projects.find((p) => p.id === task.project_id)?.name,
    }, ...current])
    setShowCreate(false)
  }

  function onUpdated(updated) {
    setPreview(updated)
    setTasks((current) => current.map((t) => (t.id === updated.id ? updated : t)))
  }

  const stages = mode === 'all'
    ? [...TASK_STAGES]
    : TASK_STAGES.filter((s) => s.value !== 'done')

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">Plan, track and move work across stages</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} ref={menuRef}>
          <div style={{ position: 'relative' }}>
            <button className="btn" onClick={() => setMenuOpen((v) => !v)} style={{ cursor: 'pointer' }}>
              {mode === 'all' ? 'All Tasks' : 'Task Stages'} ▾
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '31px', zIndex: 50,
                background: '#151515', border: '1px solid #2a2a2a', borderRadius: '4px',
                minWidth: '150px', boxShadow: '0 8px 20px rgba(0,0,0,0.45)', overflow: 'hidden',
              }}>
                <div
                  onClick={() => { setMode('all'); setMenuOpen(false) }}
                  style={{
                    padding: '8px 11px', fontSize: '12px', cursor: 'pointer',
                    color: mode === 'all' ? '#fff' : '#999',
                    background: mode === 'all' ? '#1c1c1c' : 'transparent',
                    borderBottom: '1px solid #242424',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#1c1c1c' }}
                  onMouseLeave={(e) => { if (mode !== 'all') e.currentTarget.style.background = 'transparent' }}
                >
                  All Tasks
                  <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>Every task in Kanban view</div>
                </div>
                <div
                  onClick={() => { setMode('stages'); setMenuOpen(false) }}
                  style={{
                    padding: '8px 11px', fontSize: '12px', cursor: 'pointer',
                    color: mode === 'stages' ? '#fff' : '#999',
                    background: mode === 'stages' ? '#1c1c1c' : 'transparent',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#1c1c1c' }}
                  onMouseLeave={(e) => { if (mode !== 'stages') e.currentTarget.style.background = 'transparent' }}
                >
                  Task Stages
                  <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>Drag tasks between stages</div>
                </div>
              </div>
            )}
          </div>

          <button className="btn primary" onClick={() => setShowCreate(true)} style={{ cursor: 'pointer' }}>
            + New Task
          </button>
        </div>
      </div>

      {projects.length === 0 && !loading && (
        <div className="card">
          <div className="description" style={{ margin: 0 }}>
            Create a project first — tasks live inside projects.
          </div>
        </div>
      )}

      {loading ? (
        <div className="card"><div className="description" style={{ margin: 0 }}>Loading tasks…</div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, minmax(230px, 1fr))`, gap: '10px', alignItems: 'start' }}>
          {stages.map((stage) => {
            const columnTasks = tasks.filter((t) => (t.status || 'todo') === stage.value)
            return (
              <div
                key={stage.value}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(stage.value)}
                style={{
                  background: '#121212', border: '1px solid #292929', borderRadius: '5px',
                  padding: '9px', minHeight: '120px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '9px', padding: '0 2px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: stage.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {stage.label}
                  </span>
                  <span style={{ fontSize: '10px', color: '#555' }}>{columnTasks.length}</span>
                </div>

                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    compact={mode === 'stages'}
                    onOpen={setPreview}
                    onDragStart={(e, id) => { dragId.current = id; e.dataTransfer.effectAllowed = 'move' }}
                  />
                ))}

                {columnTasks.length === 0 && (
                  <div style={{
                    border: '1px dashed #2a2a2a', borderRadius: '4px', padding: '14px',
                    textAlign: 'center', color: '#444', fontSize: '10px',
                  }}>
                    Drop tasks here
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <CreateTaskModal
          projects={projects}
          workspaceId={ws?.id}
          defaultProjectId={projects[0]?.id}
          onCreated={onCreated}
          onClose={() => setShowCreate(false)}
        />
      )}

      {preview && (
        <TaskPreviewModal
          task={preview}
          workspaceId={ws?.id}
          onUpdated={onUpdated}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}
