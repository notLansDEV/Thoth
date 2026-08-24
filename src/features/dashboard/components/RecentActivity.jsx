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

export default function RecentActivity({ projects = [], tasks = [], bugs = [] }) {
  const feed = [
    ...projects.map((p) => ({
      id: `p-${p.id}`, when: p.created_at, icon: '📁',
      text: `Project created: ${p.name}`,
    })),
    ...tasks.map((t) => ({
      id: `t-${t.id}`, when: t.created_at, icon: '☑',
      text: `${t.task_code ? `${t.task_code} · ` : ''}Task "${t.title}" in ${t.project_name || 'a project'}`,
    })),
    ...bugs.map((b) => ({
      id: `b-${b.id}`, when: b.created_at, icon: '🐞',
      text: `Bug reported: "${b.title}"`,
    })),
  ]
    .filter((i) => i.when)
    .sort((a, b) => new Date(b.when) - new Date(a.when))
    .slice(0, 6)

  return (
    <div className="card">
      <div className="card-head"><div className="name">Recent activity</div></div>
      {feed.length === 0 ? (
        <div style={{ padding: '12px 0 4px', fontSize: 11, color: '#555' }}>Nothing has happened yet.</div>
      ) : (
        <ul style={{ marginTop: 10, listStyle: 'none', paddingLeft: 0 }}>
          {feed.map((i) => (
            <li key={i.id} style={{ padding: 8, borderBottom: '1px solid #232323', display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 12 }}>{i.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#ccc' }}>{i.text}</div>
                <div style={{ fontSize: 10, color: '#666' }}>{relTime(i.when)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
