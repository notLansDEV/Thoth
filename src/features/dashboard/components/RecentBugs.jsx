export default function RecentBugs({ bugs = [], projects = [] }) {
  function navigate(path) {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const recent = [...bugs]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 5)

  const sevClass = (p) => {
    const v = String(p || 'medium').toLowerCase()
    if (v === 'critical') return 'dash-sev dash-sev-critical'
    if (v === 'high') return 'dash-sev dash-sev-high'
    if (v === 'medium') return 'dash-sev dash-sev-medium'
    return 'dash-sev dash-sev-low'
  }

  const statusClass = (s) => {
    const v = String(s || 'new').toLowerCase()
    if (v === 'fixed' || v === 'closed' || v === 'archived') return 'dash-bug-status dash-bug-status-fixed'
    if (v === 'in progress') return 'dash-bug-status dash-bug-status-progress'
    return 'dash-bug-status dash-bug-status-new'
  }

  return (
    <section className="card dash-panel">
      <div className="dash-panel-head">
        <div className="dash-panel-title">
          <span>Recent bugs</span>
          <span className="dash-count">{bugs.length}</span>
        </div>
        <button type="button" className="dash-action" onClick={() => navigate('/bugs')}>
          All Bugs →
        </button>
      </div>

      {recent.length === 0 ? (
        <div className="dash-empty">No bugs reported — your projects are healthy.</div>
      ) : (
        <div className="dash-bug-list">
          {recent.map((b) => {
            const project = projects.find((p) => p.id === b.project_id)
            const stage = b.kanban_column || b.status || 'New'
            return (
              <div key={b.id} className="dash-bug-row">
                <div className="dash-bug-info">
                  <div className="dash-bug-title">{b.title || b.bug_id || 'Untitled bug'}</div>
                  <div className="dash-bug-meta">
                    <span>{project?.name || 'Project'}</span>
                    <span>•</span>
                    <span className={sevClass(b.priority)}>{String(b.priority || 'medium')}</span>
                  </div>
                </div>
                <span className={statusClass(stage)}>{stage}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
