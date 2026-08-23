import { useEffect, useRef, useState } from 'react'
import {
  TASK_STAGES,
  priorityStyle,
  getTasks,
  updateTask,
  getStages,
  createStage,
  updateStage as updateStageApi,
  deleteStage as deleteStageApi,
  reorderStages,
} from '../features/tasks/tasks.service.js'
import { getProjects } from '../features/projects/projects.service.js'
import { getCurrentWorkspace } from '../features/workspaces/workspaces.service.js'
import CreateTaskModal from '../features/tasks/components/CreateTaskModal.jsx'
import TaskPreviewModal from '../features/tasks/components/TaskPreviewModal.jsx'
import StageBoard from '../components/StageBoard.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'

function isOverdue(task) {
  if (!task.due_date || task.status === 'Done') return false
  return new Date(task.due_date) < new Date(new Date().toDateString())
}

function formatDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString()
}

function StatCard({ icon, label, value }) {
  return (
    <div className="card" style={{ padding: '12px' }}>
      <div style={{ fontSize: '9px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: '#f1f1f1' }}>{value}</div>
    </div>
  )
}

function TaskCard({ task, onOpen, onDragStart }) {
  const overdue = isOverdue(task)
  const due = formatDate(task.due_date)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => onOpen(task)}
      style={{
        background: '#101010', border: overdue ? '1px solid rgba(255,64,64,0.4)' : '1px solid #2a2a2a',
        borderRadius: '4px', padding: '10px', marginBottom: '8px', cursor: 'grab',
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
          ?? {task.assignee_name}
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
            <span style={{ color: overdue ? '#ff8080' : '#777' }}>? {due}</span>
          </span>
        )}
      </div>
    </div>
  )
}

function navigateTo(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function Tasks({ subPage }) {
  const ws = getCurrentWorkspace()
  const tab = subPage === 'stages' ? 'stages' : 'all'
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [preview, setPreview] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const dragId = useRef(null)

  async function refresh() {
    try {
      const [t, p, s] = await Promise.all([
        getTasks(ws?.id),
        getProjects(ws?.id),
        getStages(ws?.id).catch(() => []),
      ])
      setTasks(t)
      setProjects(p)
      setStages(s.length > 0 ? s : TASK_STAGES.map((x) => ({ id: x.value, name: x.value, color: x.color })))
    } catch {
      /* keep current state */
    }
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [t, p, s] = await Promise.all([
          getTasks(ws?.id),
          getProjects(ws?.id),
          getStages(ws?.id).catch(() => []),
        ])
        if (!alive) return
        setTasks(t)
        setProjects(p)
        setStages(s.length > 0 ? s : TASK_STAGES.map((x) => ({ id: x.value, name: x.value, color: x.color })))
      } catch {
        if (alive) setTasks([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function handleAddStage(data) {
    try {
      await createStage(ws?.id, data.name, data.color)
      await refresh()
    } catch (err) {
      window.alert(err.message || 'Could not create stage')
    }
  }

  async function handleUpdateStage(id, data) {
    try {
      await updateStageApi(id, data)
      await refresh()
    } catch (err) {
      window.alert(err.message || 'Could not update stage')
    }
  }

  async function handleReorder(orderIds) {
    setStages((cur) => {
      const map = new Map(cur.map((s) => [s.id, s]))
      return orderIds.map((id) => map.get(id)).filter(Boolean)
    })
    try {
      await reorderStages(orderIds)
    } catch {
      await refresh()
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteStageApi(confirmDelete.id)
      setConfirmDelete(null)
      await refresh()
    } catch (err) {
      window.alert(err.message || 'Could not delete stage')
    } finally {
      setDeleting(false)
    }
  }

  const counts = {}
  for (const t of tasks) {
    const key = t.status || stages[0]?.name || 'To Do'
    counts[key] = (counts[key] || 0) + 1
  }

  const defaultStageName = stages[0]?.name || 'To Do'

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">Plan, track and move work across stages</p>
        </div>

        <button className="btn primary" onClick={() => setShowCreate(true)} style={{ cursor: 'pointer' }}>
          + New Task
        </button>
      </div>

      {/* Sub-module tabs */}
      <div className="tab-row">
        {[{ key: 'all', label: 'All Task' }, { key: 'stages', label: 'Task Stages' }].map((t) => (
          <button
            key={t.key}
            className={`tab-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => navigateTo(`/Thoth/${ws?.slug || 'ws'}/tasks/${t.key}`)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 3 stat cards */}
      <div className="stat-grid">
        <StatCard icon="◉" label={defaultStageName} value={counts[defaultStageName] || 0} />
        <StatCard icon="☑" label="Total task" value={tasks.length} />
        <StatCard icon="◈" label="Total stage" value={stages.length} />
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
      ) : tab === 'all' ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(stages.length, 1)}, minmax(230px, 1fr))`, gap: '10px', alignItems: 'start', overflowX: 'auto' }}>
          {stages.map((stage) => {
            const columnTasks = tasks.filter((t) => (t.status || defaultStageName) === stage.name)
            return (
              <div
                key={stage.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(stage.name)}
                style={{
                  background: '#121212', border: '1px solid #292929', borderRadius: '5px',
                  padding: '9px', minHeight: '120px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '9px', padding: '0 2px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: stage.color || '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {stage.name}
                  </span>
                  <span style={{ fontSize: '10px', color: '#555' }}>{columnTasks.length}</span>
                </div>

                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
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
      ) : (
        <StageBoard
          stages={stages}
          counts={counts}
          itemLabel="tasks"
          onAdd={handleAddStage}
          onUpdate={handleUpdateStage}
          onDelete={setConfirmDelete}
          onReorder={handleReorder}
        />
      )}

      {showCreate && (
        <CreateTaskModal
          projects={projects}
          workspaceId={ws?.id}
          stages={stages}
          defaultProjectId={projects[0]?.id}
          onCreated={onCreated}
          onClose={() => setShowCreate(false)}
        />
      )}

      {preview && (
        <TaskPreviewModal
          task={preview}
          workspaceId={ws?.id}
          stages={stages}
          onUpdated={onUpdated}
          onClose={() => setPreview(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title={`Delete stage "${confirmDelete.name}"?`}
          message="Are you sure you want to delete this stage?"
          note="* All of the tasks inside will be moved to the Archived stage."
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
