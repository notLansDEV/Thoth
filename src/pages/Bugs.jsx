import { useEffect, useRef, useState } from 'react'
import { Bug as BugIcon, CircleDot, Columns3, Plus, Pencil, Trash2 } from 'lucide-react'
import {
  BUG_STAGES,
  getBugs,
  getStages,
  createStage,
  updateBug,
  deleteBug,
  updateStage as updateStageApi,
  deleteStage as deleteStageApi,
  reorderStages,
} from '../features/bugs/bugs.service.js'
import { priorityStyle } from '../features/tasks/tasks.service.js'
import { getProjects } from '../features/projects/projects.service.js'
import { getCurrentWorkspace, canWriteModule, canDeleteModule, canWriteProjectModule, canDeleteProjectModule, canAccessProject, getSelectedProjectId, setSelectedProjectId } from '../features/workspaces/workspaces.service.js'
import StageBoard from '../components/StageBoard.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import ListToolbar from '../components/ListToolbar.jsx'
import ReportBugModal from '../features/bugs/components/ReportBugModal.jsx'
import BugPreviewModal from '../features/bugs/components/BugPreviewModal.jsx'
import { toast } from 'sonner'

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

function BugCard({ bug, projectName, projectColor, onDragStart, onOpen, onDelete, canWriteBug, canDeleteBug }) {
  return (
    <div
      draggable={!!canWriteBug}
      onDragStart={(e) => canWriteBug && onDragStart(e, bug.id)}
      onClick={() => onOpen(bug)}
      style={{
        background: 'var(--panel3)', border: '1px solid var(--border)',
        borderRadius: '4px', padding: '10px', marginBottom: '8px', cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ff6b6b' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-strong)', fontWeight: 600, minWidth: 0 }}>
          {bug.bug_id && (
            <span style={{ fontFamily: 'monospace', fontSize: '9.5px', color: '#ff6b6b', marginRight: '6px' }}>
              {bug.bug_id}
            </span>
          )}
          {bug.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
          <span className="badge" style={{ ...priorityStyle(bug.priority), background: 'transparent', fontSize: '9px' }}>
            {bug.priority || 'medium'}
          </span>
          {canWriteBug && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpen(bug) }}
              title="Edit"
              style={{ background: 'transparent', border: 0, color: 'var(--muted2)', cursor: 'pointer', padding: '2px', display: 'inline-flex', borderRadius: '3px' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'var(--hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted2)'; e.currentTarget.style.background = 'transparent' }}
            ><Pencil size={11} /></button>
          )}
          {canDeleteBug && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(bug) }}
              title="Delete"
              style={{ background: 'transparent', border: 0, color: 'var(--muted2)', cursor: 'pointer', padding: '2px', display: 'inline-flex', borderRadius: '3px' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ff4040'; e.currentTarget.style.background = 'var(--hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted2)'; e.currentTarget.style.background = 'transparent' }}
            ><Trash2 size={11} /></button>
          )}
        </div>
      </div>

      {bug.description && (
        <div style={{
          color: 'var(--muted)', fontSize: '10px', marginTop: '5px',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {bug.description}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        <span style={{ fontSize: '9px', color: 'var(--muted2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="dot" style={{ background: projectColor || '#6e61ff', width: 6, height: 6 }} />
          {projectName || 'Project'}
        </span>
        <span style={{ fontSize: '9px', color: 'var(--muted2)' }}>
          {new Date(bug.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}

export default function Bugs({ subPage }) {
  const ws = getCurrentWorkspace()
  const tab = subPage === 'stages' ? 'stages' : 'all'
  const canWrite = canWriteModule('bugs')
  const canDelete = canDeleteModule('bugs')
  const canWriteBugProject = (projectId) => canWriteProjectModule(projectId, 'bugs')
  const canDeleteBugProject = (projectId) => canDeleteProjectModule(projectId, 'bugs')
  const [bugs, setBugs] = useState([])
  const [projects, setProjects] = useState([])
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmDeleteBug, setConfirmDeleteBug] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [preview, setPreview] = useState(null)
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
      const [b, p, s] = await Promise.all([
        getBugs({ workspaceId: ws?.id }).catch(() => []),
        getProjects(ws?.id).catch(() => []),
        getStages(ws?.id).catch(() => []),
      ])
      setBugs(Array.isArray(b) ? b : [])
      setProjects(p)
      setStages(s.length > 0 ? s : BUG_STAGES.map((x) => ({ id: x.value, name: x.value, color: x.color })))
    } catch {
      /* keep current state */
    }
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [b, p, s] = await Promise.all([
          getBugs({ workspaceId: ws?.id }).catch(() => []),
          getProjects(ws?.id).catch(() => []),
          getStages(ws?.id).catch(() => []),
        ])
        if (!alive) return
        setBugs(Array.isArray(b) ? b : [])
        setProjects(p)
        setStages(s.length > 0 ? s : BUG_STAGES.map((x) => ({ id: x.value, name: x.value, color: x.color })))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!subPage || subPage === 'stages' || subPage === 'all') return
    const found = bugs.find((b) => b.id === subPage || b.bug_id === subPage)
    if (found) setPreview(found)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subPage, bugs.length])

  function handleDrop(stageName) {
    const id = dragId.current
    dragId.current = null
    if (!id) return
    const bug = bugs.find((b) => b.id === id)
    if (!bug || (bug.kanban_column || defaultStageName) === stageName) return
    if (!canWriteBugProject(bug.project_id)) return

    setBugs((current) => current.map((b) => (b.id === id ? { ...b, kanban_column: stageName, status: stageName } : b)))
    updateBug(id, { kanban_column: stageName })
      .then((updated) => setBugs((cur) => cur.map((b) => (b.id === id ? { ...b, ...updated } : b))))
      .catch(() => setBugs((cur) => cur.map((b) => (b.id === id ? { ...b, kanban_column: bug.kanban_column, status: bug.status } : b))))
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

  async function handleDeleteBug() {
    if (!canDelete || !confirmDeleteBug) return
    setDeleting(true)
    try {
      await deleteBug(confirmDeleteBug.id)
      const title = confirmDeleteBug.title || 'Bug'
      setBugs((cur) => cur.filter((b) => b.id !== confirmDeleteBug.id))
      setConfirmDeleteBug(null)
      if (preview?.id === confirmDeleteBug.id) setPreview(null)
      toast.success(`Bug "${title}" has been removed`)
    } catch (err) {
      toast.error(err.message || 'Could not delete bug')
    } finally {
      setDeleting(false)
    }
  }

  const defaultStageName = stages[0]?.name || 'New'
  const accessibleProjects = projects.filter((p) => canAccessProject(p.id))
  const activeProjectId = selectedProjectId || (projectFilter !== 'all' ? projectFilter : null)
  const scopedBugs = activeProjectId
    ? bugs.filter((b) => String(b.project_id) === String(activeProjectId))
    : bugs.filter((b) => accessibleProjects.some((p) => String(p.id) === String(b.project_id)))

  const counts = {}
  for (const b of scopedBugs) {
    const key = b.kanban_column || defaultStageName
    counts[key] = (counts[key] || 0) + 1
  }

  // Board filters are scoped to the active/selected project
  const q = query.trim().toLowerCase()
  const visibleBugs = scopedBugs.filter((b) => {
    if (priorityFilter !== 'all' && (b.priority || 'medium') !== priorityFilter) return false
    if (projectFilter !== 'all' && String(b.project_id) !== String(projectFilter)) return false
    if (q && !`${b.bug_id || ''} ${b.title || ''} ${b.description || ''}`.toLowerCase().includes(q)) return false
    return true
  })

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Bugs</h1>
          <p className="page-subtitle">Track and squash bugs across your projects</p>
        </div>

        {canWrite && (
          <button className="btn primary" onClick={() => setShowReport(true)} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Plus size={13} /> Report a Bug
          </button>
        )}
      </div>

      {/* 3 stat cards */}
      <div className="stat-grid">
        <StatCard icon={<CircleDot size={12} />} label={defaultStageName} value={counts[defaultStageName] || 0} />
        <StatCard icon={<BugIcon size={12} />} label="Total bug" value={scopedBugs.length} />
        <StatCard icon={<Columns3 size={12} />} label="Total stage" value={stages.length} />
      </div>

      {loading ? (
        <div className="card"><div className="description" style={{ margin: 0 }}>Loading bugs…</div></div>
      ) : accessibleProjects.length === 0 ? (
        <div className="card">
          <div className="description" style={{ margin: 0 }}>
            No accessible projects. Ask a workspace owner to assign you to a project.
          </div>
        </div>
      ) : (
        <>
          {tab === 'all' && (
            <ListToolbar
              query={query} onQuery={setQuery}
              priority={priorityFilter} onPriority={setPriorityFilter}
              project={projectFilter} onProject={setProjectFilter}
              projects={accessibleProjects.filter(p => canWriteBugProject(p.id))}
              placeholder="Search bugs…"
            />
          )}

          {tab === 'all' ? (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(stages.length, 1)}, minmax(230px, 1fr))`, gap: '10px', alignItems: 'start', overflowX: 'auto' }}>
              {stages.map((stage) => {
                const columnBugs = visibleBugs.filter((b) => (b.kanban_column || defaultStageName) === stage.name)
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
                      <span style={{ fontSize: '10px', color: 'var(--muted2)' }}>{columnBugs.length}</span>
                    </div>

                    {columnBugs.map((bug) => (
                      <BugCard
                        key={bug.id}
                        bug={bug}
                        projectName={projects.find((p) => p.id === bug.project_id)?.name}
                        projectColor={projects.find((p) => p.id === bug.project_id)?.color}
                        canWriteBug={canWriteBugProject(bug.project_id)}
                        canDeleteBug={canDeleteBugProject(bug.project_id)}
                        onDragStart={(e, id) => { dragId.current = id; e.dataTransfer.effectAllowed = 'move' }}
                        onOpen={setPreview}
                        onDelete={(b) => { if (canDeleteBugProject(b.project_id)) setConfirmDeleteBug(b) }}
                      />
                    ))}

                    {columnBugs.length === 0 && (
                      <div style={{
                        border: '1px dashed var(--border)', borderRadius: '4px', padding: '14px',
                        textAlign: 'center', color: 'var(--muted2)', fontSize: '10px',
                      }}>
                        Drop bugs here
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
              itemLabel="bugs"
              canWrite={canWrite}
              canDelete={canDelete}
              onAdd={handleAddStage}
              onUpdate={handleUpdateStage}
              onDelete={setConfirmDelete}
              onReorder={handleReorder}
            />
          )}
        </>
      )}

      {confirmDelete && (
        <ConfirmModal
          title={`Delete stage "${confirmDelete.name}"?`}
          message="Are you sure you want to delete this stage?"
          note="* All of the bugs inside will be moved to the Archived stage."
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {confirmDeleteBug && (
        <ConfirmModal
          title={`Delete bug "${confirmDeleteBug.title}"?`}
          message="Are you sure you want to delete this bug? This action cannot be undone."
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={handleDeleteBug}
          onCancel={() => setConfirmDeleteBug(null)}
        />
      )}

      {showReport && (
        <ReportBugModal
          projects={accessibleProjects.filter(p => canWriteBugProject(p.id))}
          workspaceId={ws?.id}
          stages={stages}
          defaultStageName={defaultStageName}
          defaultProjectId={activeProjectId || accessibleProjects[0]?.id}
          onCreated={(bug) => {
            setBugs((current) => [bug, ...current])
            setShowReport(false)
            const wsId = getCurrentWorkspace()?.id
            if (bug?.project_id && String(selectedProjectId || '') !== String(bug.project_id)) {
              setSelectedProjectId(bug.project_id, wsId)
              setSelectedProjectIdState(bug.project_id)
              setProjectFilter(bug.project_id)
              window.dispatchEvent(new CustomEvent('thoth:project-changed', { detail: { projectId: bug.project_id, workspaceId: wsId } }))
            }
            toast.success(`Bug "${bug.title || 'Untitled'}" has been added`)
          }}
          onClose={() => setShowReport(false)}
        />
      )}

      {preview && (
        <BugPreviewModal
          bug={bugs.find((b) => b.id === preview.id) || preview}
          workspaceId={ws?.id}
          projectName={projects.find((p) => p.id === preview.project_id)?.name}
          stages={stages}
          onUpdated={(updated) => {
            setBugs((cur) => cur.map((b) => (b.id === updated.id ? updated : b)))
            setPreview(updated)
          }}
          onClose={() => setPreview(null)}
        />
      )}

    </div>
  )
}
