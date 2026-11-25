import { useState } from 'react'
import DescriptionPreview from '../../../components/DescriptionPreview.jsx'

const PREVIEW_LIMIT = 16

export default function ProjectOverview({ projects = [], tasks = [], bugs = [], loading }) {
  const [showAll, setShowAll] = useState(false)

  function navigate(path) {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const statusMeta = (status) => {
    const s = String(status || 'active').toLowerCase()
    if (s === 'completed') return { label: 'Completed', cls: 'dash-pill dash-pill-complete' }
    if (s === 'on_hold') return { label: 'On Hold', cls: 'dash-pill dash-pill-hold' }
    if (s === 'planning') return { label: 'Planning', cls: 'dash-pill dash-pill-planning' }
    if (s === 'cancelled') return { label: 'Cancelled', cls: 'dash-pill dash-pill-cancelled' }
    return { label: 'In Progress', cls: 'dash-pill dash-pill-active' }
  }

  const openBugStages = ['fixed', 'closed', 'archived']
  const visibleProjects = showAll ? projects : projects.slice(0, PREVIEW_LIMIT)
  const hiddenCount = Math.max(0, projects.length - PREVIEW_LIMIT)

  return (
    <section className="card dash-panel">
      <div className="dash-panel-head">
        <div className="dash-panel-title">
          <span>Projects</span>
          <span className="dash-count">{projects.length}</span>
        </div>
        <button type="button" className="dash-action" onClick={() => navigate('/projects')}>
          + New Project
        </button>
      </div>

                {loading ? (
            <div className="dash-empty">Loading projects…</div>
          ) : projects.length === 0 ? (
            <div className="dash-empty">No projects yet — create one from the Projects page.</div>
          ) : (
            <>
              <div className="dash-project-list">
                {visibleProjects.map((p) => {
                  const pt = tasks.filter((t) => t.project_id === p.id)
                  const done = pt.filter((t) => String(t.status || '').toLowerCase() === 'done').length
                  const percent = pt.length > 0 ? Math.round((done / pt.length) * 100) : 0
                  const pb = bugs.filter((b) => b.project_id === p.id)
                  const openBugs = pb.filter((b) => !openBugStages.includes((b.kanban_column || b.status || '').toLowerCase())).length
                  const sm = statusMeta(p.status)
                  const allDone = pt.length > 0 && done === pt.length
                  return (
                    <div key={p.id} className="dash-project-row" onClick={() => navigate(`/projects/${p.id}`)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/projects/${p.id}`) }}>
                      <div className="dash-project-info">
                        <div className="dash-project-title-line">
                          <span className="dash-project-name">{p.name}</span>
                          <span className={sm.cls}>{sm.label}</span>
                        </div>
                        <DescriptionPreview
                          text={p.description || ''}
                          maxChars={16}
                          className="dash-project-desc md-rendered"
                          emptyText="No description yet."
                        />
                        <div className="dash-project-meta">
                          <span>{pt.length > 0 ? `${done}/${pt.length} Tasks${allDone ? ' Done' : ''}` : '0 Tasks'}</span>
                          <span>•</span>
                          <span>{openBugs} Open Bug{openBugs === 1 ? '' : 's'}</span>
                        </div>
                      </div>
                      <div className="dash-project-progress">
                        <span className="dash-progress-pct">{percent}%</span>
                        <div className="dash-progress-track">
                          <div className={`dash-progress-fill ${percent === 100 ? 'is-done' : ''}`} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {hiddenCount > 0 && (
                <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    className="dash-action"
                    onClick={() => setShowAll((v) => !v)}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {showAll ? 'Show less' : `Show ${hiddenCount} more`}
                  </button>
                </div>
              )}
            </>
          )}
    </section>
  )
}
