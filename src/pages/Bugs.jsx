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
import { getCurrentWorkspace } from '../features/workspaces/workspaces.service.js'
import StageBoard from '../components/StageBoard.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import ListToolbar from '../components/ListToolbar.jsx'
import ReportBugModal from '../features/bugs/components/ReportBugModal.jsx'
import BugPreviewModal from '../features/bugs/components/BugPreviewModal.jsx'

function StatCard({ icon, label, value }) {
  return (
    <div className="card" style={{ padding: '12px' }}>
      <div style={{ fontSize: '9px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ display: 'inline-flex' }}>{icon}</span> {label}
      </div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: '#f1f1f1' }}>{value}</div>
    </div>
  )
}

function BugCard({ bug, projectName, projectColor, onDragStart, onOpen, onDelete }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, bug.id)}
      onClick={() => onOpen(bug)}
      style={{
        background: '#101010', border: '1px solid #2a2a2a',
        borderRadius: '4px', padding: '10px', marginBottom: '8px', cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ff6b6b' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a2a' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '12px', color: '#eee', fontWeight: 600, minWidth: 0 }}>
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
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen(bug) }}
            title="Edit"
            style={{ background: 'transparent', border: 0, color: '#555', cursor: 'pointer', padding: '2px', display: 'inline-flex', borderRadius: '3px' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.background = '#1a1a1a' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = 'transparent' }}
          ><Pencil size={11} /></button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(bug) }}
            title="Delete"
            style={{ background: 'transparent', border: 0, color: '#555', cursor: 'pointer', padding: '2px', display: 'inline-flex', borderRadius: '3px' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ff4040'; e.currentTarget.style.background = '#1a1a1a' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = 'transparent' }}
          ><Trash2 size={11} /></button>
        </div>
      </div>

      {bug.description && (
        <div style={{
          color: '#777', fontSize: '10px', marginTop: '5px',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {bug.description}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        <span style={{ fontSize: '9px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="dot" style={{ background: projectColor || '#6e61ff', width: 6, height: 6 }} />
          {projectName || 'Project'}
        </span>
        <span style={{ fontSize: '9px', color: '#555' }}>
          {new Date(bug.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}

export default function Bugs({ subPage }) {
  const ws = getCurrentWorkspace()
  const tab = subPage === 'stages' ? 'stages' : 'all'
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
  const [projectFilter, setProjectFilter] = useState('all')

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

  function handleDrop(stageName) {
    const id = dragId.current
    dragId.current = null
    if (!id) return
    const bug = bugs.find((b) => b.id === id)
    if (!bug || (bug.kanban_column || defaultStageName) === stageName) return

    setBugs((current) => current.map((b) => (b.id === id ? { ...b, kanban_column: stageName, status: stageName } : b)))
    updateBug(id, { kanban_column: stageName })
      .then((updated) => setBugs((cur) => cur.map((b) => (b.id === id ? { ...b, ...updated } : b))))
      .catch(() => setBugs((cur) => cur.map((b) => (b.id === id ? { ...b, kanban_column: bug.kanban_column, status: bug.status } : b))))
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

  async function handleDeleteBug() {
    if (!confirmDeleteBug) return
    setDeleting(true)
    try {
      await deleteBug(confirmDeleteBug.id)
      setBugs((cur) => cur.filter((b) => b.id !== confirmDeleteBug.id))
      setConfirmDeleteBug(null)
      if (preview?.id === confirmDeleteBug.id) setPreview(null)
    } catch (err) {
      window.alert(err.message || 'Could not delete bug')
    } finally {
      setDeleting(false)
    }
  }

  const counts = {}
  for (const b of bugs) {
    const key = b.kanban_column || stages[0]?.name || 'New'
    counts[key] = (counts[key] || 0) + 1
  }

  const defaultStageName = stages[0]?.name || 'New'

  // Board filters (stat cards above always show workspace-wide totals)
  const q = query.trim().toLowerCase()
  const visibleBugs = bugs.filter((b) => {
    if (priorityFilter !== 'all' && (b.priority || 'medium') !== priorityFilter) return false
    if (projectFilter !== 'all' && b.project_id !== projectFilter) return false
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

        <button className="btn primary" onClick={() => setShowReport(true)} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <Plus size={13} /> Report a Bug
        </button>
      </div>

      {/* 3 stat cards */}
      <div className="stat-grid">
        <StatCard icon={<CircleDot size={12} />} label={defaultStageName} value={counts[defaultStageName] || 0} />
        <StatCard icon={<BugIcon size={12} />} label="Total bug" value={bugs.length} />
        <StatCard icon={<Columns3 size={12} />} label="Total stage" value={stages.length} />
      </div>

      {loading ? (
        <div className="card"><div className="description" style={{ margin: 0 }}>Loading bugs…</div></div>
      ) : projects.length === 0 ? (
        <div className="card">
          <div className="description" style={{ margin: 0 }}>
            Create a project first — bugs live inside projects.
          </div>
        </div>
      ) : (
        <>
          {tab === 'all' && (
            <ListToolbar
              query={query} onQuery={setQuery}
              priority={priorityFilter} onPriority={setPriorityFilter}
              project={projectFilter} onProject={setProjectFilter}
              projects={projects}
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
                      background: '#121212', border: '1px solid #292929', borderRadius: '5px',
                      padding: '9px', minHeight: '120px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '9px', padding: '0 2px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: stage.color || '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {stage.name}
                      </span>
                      <span style={{ fontSize: '10px', color: '#555' }}>{columnBugs.length}</span>
                    </div>

                    {columnBugs.map((bug) => (
                      <BugCard
                        key={bug.id}
                        bug={bug}
                        projectName={projects.find((p) => p.id === bug.project_id)?.name}
                        projectColor={projects.find((p) => p.id === bug.project_id)?.color}
                        onDragStart={(e, id) => { dragId.current = id; e.dataTransfer.effectAllowed = 'move' }}
                        onOpen={setPreview}
                        onDelete={setConfirmDeleteBug}
                      />
                    ))}

                    {columnBugs.length === 0 && (
                      <div style={{
                        border: '1px dashed #2a2a2a', borderRadius: '4px', padding: '14px',
                        textAlign: 'center', color: '#444', fontSize: '10px',
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
          projects={projects}
          workspaceId={ws?.id}
          stages={stages}
          defaultStageName={defaultStageName}
          onCreated={(bug) => {
            setBugs((current) => [bug, ...current])
            setShowReport(false)
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
