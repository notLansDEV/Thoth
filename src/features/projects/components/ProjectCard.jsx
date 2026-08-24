import { Eye, Pencil, Trash2, CalendarClock, Clock } from 'lucide-react'
import { PROJECT_PRIORITIES } from '../projects.service.js'

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

const iconBtn = {
  width: '24px',
  height: '24px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid #2a2a2a',
  background: '#111',
  color: '#999',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
  lineHeight: 1,
}

export default function ProjectCard({ project, onView, onEdit, onDelete }) {
  const statusColor = STATUS_COLORS[project.status] || '#777'
  const statusLabel = STATUS_LABELS[project.status] || project.status || 'Active'
  const priorityMeta = PROJECT_PRIORITIES.find((p) => p.value === project.priority)
  const start = formatDate(project.start_date)
  const deadline = formatDate(project.deadline)
  const overdue =
    deadline && !['completed', 'cancelled'].includes(project.status) &&
    new Date(project.deadline) < new Date()

  return (
    <div
      className="card"
      style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
      onClick={() => onView(project)}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6e61ff' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#292929' }}
    >
      <div className="card-head">
        <div className="name">
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: project.color || statusColor }}></span>
          {project.name}
        </div>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
          <button style={iconBtn} title="View" onClick={() => onView(project)}><Eye size={12} /></button>
          <button style={iconBtn} title="Edit" onClick={() => onEdit(project)}><Pencil size={12} /></button>
          <button
            style={{ ...iconBtn, color: '#ff6b6b' }}
            title="Delete"
            onClick={() => onDelete(project)}
          ><Trash2 size={12} /></button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
        <span className="badge" style={{
          color: statusColor,
          background: 'transparent',
          border: `1px solid ${statusColor}55`,
        }}>{statusLabel}</span>
        {priorityMeta && (
          <span className="badge" style={{
            color: priorityMeta.color,
            background: 'transparent',
            border: `1px solid ${priorityMeta.color}55`,
          }}>{priorityMeta.label}</span>
        )}
      </div>

      {project.description && (
        <div className="description">{project.description}</div>
      )}

      {(start || deadline) && (
        <div className="meta" style={{ paddingTop: 0 }}>
          {start && (
            <div className="meta-item">
              <span className="meta-icon"><CalendarClock size={11} /></span> {start}
            </div>
          )}
          {deadline && (
            <div className="meta-item" style={overdue ? { color: '#ff4040' } : undefined}>
              <span className="meta-icon"><Clock size={11} /></span> {deadline}{overdue ? ' (overdue)' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
