export default function RecentBugs({ bugs = [], projects = [] }) {
  const recent = [...bugs]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)

  return (
    <div className="card">
      <div className="card-head"><div className="name">Recent bugs</div></div>
      {recent.length === 0 ? (
        <div style={{ padding: '12px 0 4px', fontSize: 11, color: 'var(--muted2)' }}>No bugs reported — your projects are healthy.</div>
      ) : (
        <ul style={{ marginTop: 10, listStyle: 'none', paddingLeft: 0 }}>
          {recent.map((b) => {
            const project = projects.find((p) => p.id === b.project_id)
            return (
              <li key={b.id} style={{ padding: 8, borderBottom: '1px solid var(--hover)', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.title}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted2)' }}>
                    {project?.name || 'Project'} • {b.priority || 'medium'}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{b.kanban_column || b.status || 'New'}</div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
