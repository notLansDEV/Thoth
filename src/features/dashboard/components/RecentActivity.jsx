import { describeActivity, actorName } from '../../activity/activity.service.js'
import { FolderPlus, ListChecks, Bug as BugIcon } from 'lucide-react'

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

const TYPE_ICONS = {
  project: FolderPlus,
  task: ListChecks,
  bug: BugIcon,
  milestone: FolderPlus,
}

export default function RecentActivity({ activities = [] }) {
  return (
    <div className="card">
      <div className="card-head"><div className="name">Recent activity</div></div>
      {activities.length === 0 ? (
        <div style={{ padding: '12px 0 4px', fontSize: 11, color: '#555' }}>Nothing has happened yet.</div>
      ) : (
        <ul style={{ marginTop: 10, listStyle: 'none', paddingLeft: 0 }}>
          {activities.slice(0, 8).map((a) => {
            const Icon = TYPE_ICONS[a.entity_type] || ListChecks
            return (
              <li key={a.id} style={{ padding: 8, borderBottom: '1px solid #232323', display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                {a.actor_avatar_url ? (
                  <img
                    src={a.actor_avatar_url}
                    alt={actorName(a)}
                    title={actorName(a)}
                    style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid #333' }}
                  />
                ) : (
                  <span className="avatar" title={actorName(a)} style={{ flexShrink: 0 }}>
                    {actorName(a).slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#ccc', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: '#ddd' }}>{actorName(a)}</span>
                    <span style={{
                      display: 'inline-flex', color: '#666',
                    }}><Icon size={11} /></span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{describeActivity(a)}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#666' }}>{relTime(a.created_at)}</div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
