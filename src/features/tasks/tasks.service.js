const API_URL = '/api'

export const TASK_STAGES = [
  { value: 'To Do', label: 'To Do', color: '#6e61ff' },
  { value: 'In Progress', label: 'In Progress', color: '#ff7918' },
  { value: 'Review', label: 'Review', color: '#a14cff' },
  { value: 'Done', label: 'Done', color: '#20d96b' },
]

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Low', color: '#20d96b' },
  { value: 'medium', label: 'Medium', color: '#e8c547' },
  { value: 'high', label: 'High', color: '#ff7918' },
  { value: 'critical', label: 'Critical', color: '#ff4040' },
]

export function priorityStyle(value) {
  const p = TASK_PRIORITIES.find((x) => x.value === value)
  return {
    color: p ? p.color : '#777',
    border: `1px solid ${p ? p.color : '#777'}55`,
  }
}

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

export async function getTasks(workspaceId) {
  if (!workspaceId) return []
  return apiRequest(`/tasks?workspace_id=${encodeURIComponent(workspaceId)}`)
}

export async function createTask(data) {
  return apiRequest('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateTask(taskId, data) {
  return apiRequest(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function getWorkspaceMembers(workspaceId) {
  if (!workspaceId) return []
  return apiRequest(`/workspaces/${encodeURIComponent(workspaceId)}/members`)
}

export async function getMilestones(projectId) {
  if (!projectId) return []
  return apiRequest(`/milestones?project_id=${encodeURIComponent(projectId)}`)
}

export async function getStages(workspaceId) {
  if (!workspaceId) return []
  const rows = await apiRequest(`/task-stages?workspace_id=${encodeURIComponent(workspaceId)}`)
  return Array.isArray(rows) ? rows : []
}

export async function createStage(workspaceId, name, color) {
  return apiRequest('/task-stages', {
    method: 'POST',
    body: JSON.stringify({ workspace_id: workspaceId, name, color }),
  })
}

export async function updateStage(stageId, data) {
  return apiRequest(`/task-stages/${encodeURIComponent(stageId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteStage(stageId) {
  return apiRequest(`/task-stages/${encodeURIComponent(stageId)}`, {
    method: 'DELETE',
  })
}

export async function deleteTask(taskId) {
  return apiRequest(`/tasks/${taskId}`, { method: 'DELETE' })
}

export async function reorderStages(order) {
  return apiRequest('/task-stages/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ order }),
  })
}
