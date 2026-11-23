import { useEffect, useRef, useState } from 'react'
import { User, Clock, CircleDot, ListChecks, Columns3, Pencil, Trash2 } from 'lucide-react'
import {
  TASK_STAGES,
  priorityStyle,
  getTasks,
  updateTask,
  deleteTask,
  getStages,
  createStage,
  updateStage as updateStageApi,
  deleteStage as deleteStageApi,
  reorderStages,
} from '../features/tasks/tasks.service.js'
import { getProjects } from '../features/projects/projects.service.js'
import { getCurrentWorkspace, canWriteModule, canDeleteModule, canWriteProjectModule, canDeleteProjectModule, canAccessProject, getSelectedProjectId, setSelectedProjectId } from '../features/workspaces/workspaces.service.js'
import CreateTaskModal from '../features/tasks/components/CreateTaskModal.jsx'
import TaskPreviewModal from '../features/tasks/components/TaskPreviewModal.jsx'
import StageBoard from '../components/StageBoard.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import ListToolbar from '../components/ListToolbar.jsx'
import { toast } from 'sonner'

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
      <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ display: 'inline-flex' }}>{icon}</span> {label}
      </div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-strong)' }}>{value}</div>
    </div>
  )
}

function TaskCard({ task, onOpen, onDelete, onDragStart, canWrite, canDelete }) {
  const overdue = isOverdue(task)
  const due = formatDate(task.due_date)

  return (
    <div
      draggable={!!canWrite}
      onDragStart={(e) => canWrite && onDragStart(e, task.id)}
      onClick={() => onOpen(task)}
      style={{
        background: 'var(--panel3)', border: overdue ? '1px solid rgba(255,64,64,0.4)' : '1px solid var(--border)',
        borderRadius: '4px', padding: '10px', marginBottom: '8px', cursor: canWrite ? 'grab' : 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = overdue ? 'rgba(255,64,64,0.7)' : '#6e61ff' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = overdue ? 'rgba(255,64,64,0.4)' : 'var(--border)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-strong)', fontWeight: 600, minWidth: 0 }}>
          {task.task_code && (
            <span style={{ fontFamily: 'monospace', fontSize: '9.5px', color: '#6e61ff', marginRight: '6px' }}>
              {task.task_code}
            </span>
          )}
          {task.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
          <span className="badge" style={{ ...priorityStyle(task.priority), background: 'transparent', fontSize: '9px' }}>
            {task.priority}
          </span>
          {canWrite && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpen(task) }}
              title="Edit"
              style={{ background: 'transparent', border: 0, color: 'var(--muted2)', cursor: 'pointer', padding: '2px', display: 'inline-flex', borderRadius: '3px' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'var(--hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted2)'; e.currentTarget.style.background = 'transparent' }}
            ><Pencil size={11} /></button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(task) }}
              title="Delete"
              style={{ background: 'transparent', border: 0, color: 'var(--muted2)', cursor: 'pointer', padding: '2px', display: 'inline-flex', borderRadius: '3px' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ff4040'; e.currentTarget.style.background = 'var(--hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted2)'; e.currentTarget.style.background = 'transparent' }}
            ><Trash2 size={11} /></button>
          )}
        </div>
      </div>

      {task.description && (
        <div style={{
          color: 'var(--muted)', fontSize: '10px', marginTop: '5px',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {task.description}
        </div>
      )}

      {task.assignee_name && (
        <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '7px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <User size={10} /> {task.assignee_name}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        <span style={{ fontSize: '9px', color: 'var(--muted2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
            <span style={{ color: overdue ? '#ff8080' : 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <Clock size={10} /> {due}
            </span>
          </span>
        )}
      </div>
    </div>
  )
}

export default function Tasks({ subPage }) {
  const ws = getCurrentWorkspace()
  const tab = subPage === 'stages' ? 'stages' : 'all'
  const canWrite = canWriteModule('tasks')
  const canDelete = canDeleteModule('tasks')
  const canWriteTaskProject = (projectId) => canWriteProjectModule(projectId, 'tasks')
  const canDeleteTaskProject = (projectId) => canDeleteProjectModule(projectId, 'tasks')
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [preview, setPreview] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const dragId = useRef(null)

  const [query, setQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [selectedProjectId, setSelectedProjectIdState] = useState(() => getSelectedProjectId(ws?.id))
  const [projectFilter, setProjectFilter] = useState(() => getSelectedProjectId(ws?.id) || 'all')

  useEffect(() => {
    const sync = () => {
      const next = getSelectedProjectId(getCurrentWorkspace()?.id)
      setSelectedProjectIdState(next)
      setProjectFilter(next || 'all')
    }
    sync()
    window.addEventListener('thoth:project-changed', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('thoth:project-changed', sync)
      window.removeEventListener('storage', sync)
    }
  }, [ws?.id])

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

  useEffect(() => {
    if (!subPage || subPage === 'stages' || subPage === 'all') return
    const found = tasks.find((t) => t.id === subPage || t.task_code === subPage)
    if (found) setPreview(found)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subPage, tasks.length])

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
    const wsId = getCurrentWorkspace()?.id
    if (task?.project_id && String(selectedProjectId || '') !== String(task.project_id)) {
      setSelectedProjectId(task.project_id, wsId)
      setSelectedProjectIdState(task.project_id)
      setProjectFilter(task.project_id)
      window.dispatchEvent(new CustomEvent('thoth:project-changed', { detail: { projectId: task.project_id, workspaceId: wsId } }))
    }
    toast.success(`Task "${task.title || 'Untitled'}" has been added`)
  }

  function onUpdated(updated) {
    setPreview(updated)
    setTasks((current) => current.map((t) => (t.id === updated.id ? updated : t)))
  }

  async function handleAddStage(data) {
    if (!canWrite) return
    try {
      await createStage(ws?.id, data.name, data.color)
      await refresh()
      toast.success(`Stage "${data.name}" added`)
    } catch (err) {
      toast.error(err.message || 'Could not create stage')
    }
  }

  async function handleUpdateStage(id, data) {
    if (!canWrite) return
    try {
      await updateStageApi(id, data)
      await refresh()
      toast.success(`Stage "${data.name}" updated`)
    } catch (err) {
      toast.error(err.message || 'Could not update stage')
    }
  }

  async function handleReorder(orderIds) {
    if (!canWrite) return
    setStages((cur) => {
      const map = new Map(cur.map((s) => [s.id, s]))
      return orderIds.map((id) => map.get(id)).filter(Boolean)
    })
    try {
      await reorderStages(orderIds)
      toast.success('Stages reordered')
    } catch {
      await refresh()
      toast.error('Could not reorder stages')
    }
  }

  async function handleConfirmDelete() {
    if (!canDelete || !confirmDelete) return
    setDeleting(true)
    try {
      await deleteStageApi(confirmDelete.id)
      const name = confirmDelete.name
      setConfirmDelete(null)
      await refresh()
      toast.success(`Stage "${name}" removed`)
    } catch (err) {
      toast.error(err.message || 'Could not delete stage')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteTask() {
    if (!canDelete || !confirmDeleteTask) return
    setDeleting(true)
    try {
      const res = await deleteTask(confirmDeleteTask.id)
      const updated = res?.task
      const title = confirmDeleteTask.title || 'Task'
      setTasks((cur) => cur.map((t) => (t.id === confirmDeleteTask.id ? { ...t, ...(updated || {}), status: 'Archived' } : t)))
      setStages((cur) => cur.some((s) => s.name === 'Archived') ? cur : [...cur, { id: 'archived-temp', name: 'Archived', color: '#555555' }])
      setConfirmDeleteTask(null)
      if (preview?.id === confirmDeleteTask.id) setPreview((p) => p ? { ...p, ...(updated || {}), status: 'Archived' } : p)
      toast.success(`Task "${title}" moved to Archived`)
    } catch (err) {
      toast.error(err.message || 'Could not delete task')
    } finally {
      setDeleting(false)
    }
  }

  const defaultStageName = stages[0]?.name || 'To Do'
  const accessibleProjects = projects.filter((p) => canAccessProject(p.id))
  const activeProjectId = selectedProjectId || (projectFilter !== 'all' ? projectFilter : null)
  const scopedTasks = activeProjectId
    ? tasks.filter((t) => String(t.project_id) === String(activeProjectId))
    : tasks.filter((t) => accessibleProjects.some((p) => String(p.id) === String(t.project_id)))

  const counts = {}
  for (const t of scopedTasks) {
    const key = t.status || defaultStageName
    counts[key] = (counts[key] || 0) + 1
  }

  // Board filters are scoped to the active/selected project
  const q = query.trim().toLowerCase()
  const visibleTasks = scopedTasks.filter((t) => {
    if (priorityFilter !== 'all' && (t.priority || 'medium') !== priorityFilter) return false
    if (projectFilter !== 'all' && String(t.project_id) !== String(projectFilter)) return false
    if (q && !`${t.task_code || ''} ${t.title || ''} ${t.description || ''}`.toLowerCase().includes(q)) return false
    return true
  })

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">Plan, track and move work across stages</p>
        </div>

        {tab !== 'stages' && canWrite && (
          <button className="btn primary" onClick={() => setShowCreate(true)} style={{ cursor: 'pointer' }}>
            + New Task
          </button>
        )}
      </div>

      {/* 3 stat cards */}
      <div className="stat-grid">
        <StatCard icon={<CircleDot size={12} />} label={defaultStageName} value={counts[defaultStageName] || 0} />
        <StatCard icon={<ListChecks size={12} />} label="Total task" value={scopedTasks.length} />
        <StatCard icon={<Columns3 size={12} />} label="Total stage" value={stages.length} />
      </div>

      {accessibleProjects.length === 0 && !loading && (
        <div className="card">
          <div className="description" style={{ margin: 0 }}>
            No accessible projects. Ask a workspace owner to assign you to a project.
          </div>
        </div>
      )}

      {!loading && accessibleProjects.length > 0 && (
        <ListToolbar
          query={query} onQuery={setQuery}
          priority={priorityFilter} onPriority={setPriorityFilter}
          project={projectFilter} onProject={setProjectFilter}
          projects={accessibleProjects.filter(p => canWriteTaskProject(p.id))}
          placeholder="Search tasks…"
        />
      )}

      {loading ? (
        <div className="card"><div className="description" style={{ margin: 0 }}>Loading tasks…</div></div>
      ) : tab === 'all' ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(stages.length, 1)}, minmax(230px, 1fr))`, gap: '10px', alignItems: 'start', overflowX: 'auto' }}>
          {stages.map((stage) => {
            const columnTasks = visibleTasks.filter((t) => (t.status || defaultStageName) === stage.name)
            return (
              <div
                key={stage.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(stage.name)}
                style={{
                  background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '5px',
                  padding: '9px', minHeight: '120px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '9px', padding: '0 2px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: stage.color || 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {stage.name}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--muted2)' }}>{columnTasks.length}</span>
                </div>

                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    canWrite={canWriteTaskProject(task.project_id)}
                    canDelete={canDeleteTaskProject(task.project_id)}
                    onOpen={setPreview}
                    onDelete={(t) => { if (canDeleteTaskProject(t.project_id)) setConfirmDeleteTask(t) }}
                    onDragStart={(e, id) => { dragId.current = id; e.dataTransfer.effectAllowed = 'move' }}
                  />
                ))}

                {columnTasks.length === 0 && (
                  <div style={{
                    border: '1px dashed var(--border)', borderRadius: '4px', padding: '14px',
                    textAlign: 'center', color: 'var(--muted2)', fontSize: '10px',
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
          readOnly={!canWrite || !canDelete}
          canWrite={canWrite}
          canDelete={canDelete}
          onAdd={handleAddStage}
          onUpdate={handleUpdateStage}
          onDelete={setConfirmDelete}
          onReorder={handleReorder}
        />
      )}

      {showCreate && (
        <CreateTaskModal
          projects={accessibleProjects.filter(p => canWriteTaskProject(p.id))}
          workspaceId={ws?.id}
          stages={stages}
          defaultProjectId={activeProjectId || accessibleProjects[0]?.id}
          onCreated={onCreated}
          onClose={() => setShowCreate(false)}
        />
      )}

      {preview && (
        <TaskPreviewModal
          task={preview}
          canWrite={canWriteTaskProject(preview.project_id)}
          canDelete={canDeleteTaskProject(preview.project_id)}
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

      {confirmDeleteTask && (
        <ConfirmModal
          title={`Delete task "${confirmDeleteTask.title}"?`}
          message="Are you sure you want to delete this task? This action cannot be undone."
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={handleDeleteTask}
          onCancel={() => setConfirmDeleteTask(null)}
        />
      )}

    </div>
  )
}
