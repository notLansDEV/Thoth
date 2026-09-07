export default function ProjectOverview({ projects = [], tasks = [], loading }) {
  return (
    <section className="card">
      <div className="card-head">
        <div className="name">Projects</div>
      </div>

      {!loading && projects.length === 0 ? (
        <div style={{ padding: '14px 0 4px', fontSize: 12, color: 'var(--muted2)' }}>
          No projects yet — create one from the Projects page.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
          {projects.map((p) => {
            const pt = tasks.filter((t) => t.project_id === p.id)
            const done = pt.filter((t) => t.status === 'Done').length
            const percent = pt.length > 0 ? Math.round((done / pt.length) * 100) : 0
            return (
              <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px', alignItems: 'center', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-strong)' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.description || 'No description yet.'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{percent}%</div>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
                    <div style={{ width: `${percent}%`, height: '100%', background: p.color || '#6e61ff' }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
