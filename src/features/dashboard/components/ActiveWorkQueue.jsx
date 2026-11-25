export default function ActiveWorkQueue({ tasks = [], projects = [], loading }) {
  function navigate(path) {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const doneStages = new Set(['done', 'completed', 'archived'])
  const openTasks = tasks
    .filter((t) => {
      const stage = String(t.status || t.stage || '').toLowerCase()
      return !doneStages.has(stage)
    })
    .sort((a, b) => {
      const pri = { critical: 0, high: 1, medium: 2, low: 3 }
      const pa = pri[String(a.priority || 'medium').toLowerCase()] ?? 2
      const pb = pri[String(b.priority || 'medium').toLowerCase()] ?? 2
      if (pa !== pb) return pa - pb
      return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    })
    .slice(0, 5)

  const stageClass = (stage) => {
    const s = String(stage || '').toLowerCase()
    if (s === 'review') return 'dash-stage dash-stage-review'
    if (s === 'in progress') return 'dash-stage dash-stage-progress'
    if (s === 'done' || s === 'completed') return 'dash-stage dash-stage-done'
    return 'dash-stage dash-stage-todo'
  }

  return (
    <section className="card dash-panel">
      <div className="dash-panel-head">
        <div className="dash-panel-title">
          <span>Active Work Queue</span>
          <span className="dash-count">{openTasks.length} remaining</span>
        </div>
        <button type="button" className="dash-action" onClick={() => navigate('/tasks')}>
          View Board →
        </button>
      </div>

      {loading ? (
        <div className="dash-empty">Loading tasks…</div>
      ) : openTasks.length === 0 ? (
        <div className="dash-empty">No open tasks — great job.</div>
      ) : (
        <div className="dash-list">
          {openTasks.map((t) => {
            const project = projects.find((p) => p.id === t.project_id)
            return (
              <div key={t.id} className="dash-task-row">
                <div className="dash-task-left">
                  <span className="dash-task-id">{t.task_code || 'Task'}</span>
                  <div className="dash-task-text">
                    <div className="dash-task-title">{t.title || 'Untitled task'}</div>
                    <div className="dash-task-sub">{project?.name || 'No project'}</div>
                  </div>
                </div>
                <span className={stageClass(t.status)}>{t.status || 'To Do'}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
