const STATUS_COLORS = {
  planning: '#5f74ff',
  active: '#20d86b',
  on_hold: '#ff7918',
  completed: '#7165ff',
  cancelled: '#ff4040',
}

const STATUS_LABELS = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

function formatDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString()
}

export default function ProjectCard({ project }) {
  const statusColor = STATUS_COLORS[project.status] || '#777'
  const statusLabel = STATUS_LABELS[project.status] || project.status || 'Active'
  const start = formatDate(project.start_date)
  const deadline = formatDate(project.deadline)
  const overdue =
    deadline && project.status !== 'completed' && project.status !== 'cancelled' &&
    new Date(project.deadline) < new Date()

  return (
    <div className="card" style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
         onMouseEnter={(e) => e.currentTarget.style.borderColor = '#6e61ff'}
         onMouseLeave={(e) => e.currentTarget.style.borderColor = '#292929'}>
      <div className="card-head">
        <div className="name">
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: project.color || statusColor }}></span>
          {project.name}
        </div>
        <span className="badge" style={{
          color: statusColor,
          background: 'transparent',
          border: `1px solid ${statusColor}55`,
        }}>{statusLabel}</span>
      </div>

      {project.description && (
        <div className="description">{project.description}</div>
      )}

      {(start || deadline) && (
        <div className="meta" style={{ marginTop: project.description ? 0 : '10px', paddingTop: 0 }}>
          {start && (
            <div className="meta-item">
              <span className="meta-icon">▶</span> {start}
            </div>
          )}
          {deadline && (
            <div className="meta-item" style={overdue ? { color: '#ff4040' } : undefined}>
              <span className="meta-icon">⏰</span> {deadline}{overdue ? ' (overdue)' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
