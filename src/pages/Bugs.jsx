import { useEffect, useState } from 'react'
import {
  BUG_STAGES,
  getBugs,
  getStages,
  createStage,
  updateStage as updateStageApi,
  deleteStage as deleteStageApi,
  reorderStages,
} from '../features/bugs/bugs.service.js'
import { priorityStyle } from '../features/tasks/tasks.service.js'
import { getProjects } from '../features/projects/projects.service.js'
import { getCurrentWorkspace } from '../features/workspaces/workspaces.service.js'
import StageBoard from '../components/StageBoard.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import ReportBugModal from '../features/bugs/components/ReportBugModal.jsx'

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

function navigateTo(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function Bugs({ subPage }) {
  const ws = getCurrentWorkspace()
  const tab = subPage === 'stages' ? 'stages' : 'all'
  const [bugs, setBugs] = useState([])
  const [projects, setProjects] = useState([])
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showReport, setShowReport] = useState(false)

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
  for (const b of bugs) {
    const key = b.kanban_column || stages[0]?.name || 'New'
    counts[key] = (counts[key] || 0) + 1
  }

  const defaultStageName = stages[0]?.name || 'New'

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Bugs</h1>
          <p className="page-subtitle">Track and squash bugs across your projects</p>
        </div>

        <button className="btn primary" onClick={() => setShowReport(true)} style={{ cursor: 'pointer' }}>
          🐞 Report a Bug
        </button>
      </div>

      {/* Sub-module tabs */}
      <div className="tab-row">
        {[{ key: 'all', label: 'All Bugs' }, { key: 'stages', label: 'Bug Stages' }].map((t) => (
          <button
            key={t.key}
            className={`tab-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => navigateTo(`/Thoth/${ws?.slug || 'ws'}/bugs/${t.key}`)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 3 stat cards */}
      <div className="stat-grid">
        <StatCard icon="◉" label={defaultStageName} value={counts[defaultStageName] || 0} />
        <StatCard icon="🐞" label="Total bug" value={bugs.length} />
        <StatCard icon="◈" label="Total stage" value={stages.length} />
      </div>

      {loading ? (
        <div className="card"><div className="description" style={{ margin: 0 }}>Loading bugs…</div></div>
      ) : tab === 'all' ? (
        bugs.length === 0 ? (
          <div style={{
            border: '1px dashed #2a2a2a', borderRadius: '4px', padding: '40px',
            textAlign: 'center', color: '#555', fontSize: '12px',
          }}>
            No bugs reported — your projects are healthy.
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Bug</th>
                  <th>Title</th>
                  <th>Project</th>
                  <th>Priority</th>
                  <th>Stage</th>
                </tr>
              </thead>
              <tbody>
                {bugs.map((b) => (
                  <tr key={b.id}>
                    <td style={{ color: '#888', fontFamily: 'monospace', fontSize: '10.5px' }}>{b.bug_id || '—'}</td>
                    <td style={{ color: '#ddd', fontWeight: 600 }}>{b.title}</td>
                    <td>{projects.find((p) => p.id === b.project_id)?.name || '—'}</td>
                    <td>
                      <span className="badge" style={{ ...priorityStyle(b.priority), background: 'transparent', fontSize: '9px' }}>
                        {b.priority || 'medium'}
                      </span>
                    </td>
                    <td>{b.kanban_column || b.status || 'New'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
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

      {showReport && (
        <ReportBugModal
          projects={projects}
          stages={stages}
          defaultStageName={defaultStageName}
          onCreated={(bug) => {
            setBugs((current) => [bug, ...current])
            setShowReport(false)
          }}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  )
}
