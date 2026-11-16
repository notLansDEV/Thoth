import { describeActivity, actorName } from '../../activity/activity.service.js'
import { ArrowRightLeft, Bug } from 'lucide-react'

function relTime(value) {
  if (!value) return ''
  const diff = Date.now() - new Date(value).getTime()
  if (Number.isNaN(diff)) return ''
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(value).toLocaleDateString()
}

function renderSentence(a) {
  const c = a.changes || {}
  const actor = actorName(a)
  const code = c.task_code || c.bug_id || null
  if (a.action === 'status_changed' && code) {
    return (
      <>
        <span className="dash-tl-actor">{actor}</span>
        <span> moved </span>
        <span className="dash-tl-code">{code}</span>
        <span className="dash-tl-transition">{String(c.from || '—')} → {String(c.to || '—')}</span>
      </>
    )
  }
  if (a.entity_type === 'bug' && a.action === 'created' && code) {
    return (
      <>
        <span className="dash-tl-actor">{actor}</span>
        <span> reported </span>
        <span className="dash-tl-code">{code}</span>
        {c.title ? <span className="dash-tl-extra">“{c.title}”</span> : null}
      </>
    )
  }
  return (
    <>
      <span className="dash-tl-actor">{actor}</span>
      <span className="dash-tl-extra">{describeActivity(a)}</span>
    </>
  )
}

export default function RecentActivity({ activities = [] }) {
  const items = activities.slice(0, 8)
  return (
    <section className="card dash-panel">
      <div className="dash-panel-head">
        <div className="dash-panel-title">
          <span>Recent activity</span>
          <span className="dash-count">{activities.length}</span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="dash-empty">Nothing has happened yet.</div>
      ) : (
        <div className="dash-timeline">
          <ul className="dash-timeline-list">
            {items.map((a) => {
              const isBug = a.entity_type === 'bug'
              return (
                <li key={a.id} className="dash-timeline-item">
                  <div className={`dash-timeline-dot ${isBug ? 'is-bug' : 'is-task'}`}>
                    {isBug ? <Bug size={10} /> : <ArrowRightLeft size={10} />}
                  </div>
                  <div className="dash-timeline-content">
                    <div className="dash-timeline-line">{renderSentence(a)}</div>
                    <div className="dash-timeline-time">{relTime(a.created_at)}</div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
