const API_URL = '/api'

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`)
  }
  return data
}

export async function getActivity({ projectId, workspaceId } = {}) {
  if (projectId) {
    return apiRequest(`/activity?project_id=${encodeURIComponent(projectId)}`)
  }
  if (!workspaceId) return []
  return apiRequest(`/activity?workspace_id=${encodeURIComponent(workspaceId)}`)
}

const STAGE_LABELS = { todo: 'To Do', fixed: 'Fixed', closed: 'Closed' }
const stageLabel = (v) => STAGE_LABELS[String(v || '').toLowerCase()] || v

/**
 * Human-readable sentence for an activity row, e.g.
 * "Task-01 was change status To Do → In Progress"
 */
export function describeActivity(a) {
  const c = a.changes || {}
  const label = c.task_code || c.bug_id || (c.title ? `"${c.title}"` : '')
  switch (`${a.entity_type}:${a.action}`) {
    case 'task:created':
      return `${c.task_code || 'Task'} "${c.title || ''}" was created`
    case 'task:status_changed':
      return `${c.task_code || 'Task'} was change status ${stageLabel(c.from)} → ${stageLabel(c.to)}`
    case 'task:updated':
      return `${label || 'Task'} was updated`
    case 'bug:created':
      return `${c.bug_id || 'Bug'} "${c.title || ''}" was reported`
    case 'bug:status_changed':
      return `${c.bug_id || 'Bug'} was change status ${stageLabel(c.from)} → ${stageLabel(c.to)}`
    case 'project:created':
      return `Project "${c.title || ''}" was created`
    case 'milestone:created':
      return `Milestone "${c.title || ''}" was created`
    default:
      return `${a.entity_type || 'Item'} ${a.action || 'changed'}${label ? ` · ${label}` : ''}`
  }
}

export function actorName(a) {
  return a.actor_full_name || a.actor_name || 'Unknown'
}
