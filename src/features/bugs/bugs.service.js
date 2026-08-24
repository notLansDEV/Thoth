const API_URL = '/api'

export const BUG_STAGES = [
  { value: 'New', label: 'New', color: '#5f74ff' },
  { value: 'In Progress', label: 'In Progress', color: '#ff7918' },
  { value: 'Fixed', label: 'Fixed', color: '#20d96b' },
  { value: 'Closed', label: 'Closed', color: '#777777' },
]

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

export async function getBugs({ workspaceId, projectId } = {}) {
  if (projectId) {
    return apiRequest(`/bugs?project_id=${encodeURIComponent(projectId)}`)
  }
  if (!workspaceId) return []
  return apiRequest(`/bugs?workspace_id=${encodeURIComponent(workspaceId)}`)
}

export async function createBug(data) {
  return apiRequest('/bugs', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateBug(id, data) {
  return apiRequest(`/bugs/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function getStages(workspaceId) {
  if (!workspaceId) return []
  const rows = await apiRequest(`/bug-stages?workspace_id=${encodeURIComponent(workspaceId)}`)
  return Array.isArray(rows) ? rows : []
}

export async function createStage(workspaceId, name, color) {
  return apiRequest('/bug-stages', {
    method: 'POST',
    body: JSON.stringify({ workspace_id: workspaceId, name, color }),
  })
}

export async function updateStage(stageId, data) {
  return apiRequest(`/bug-stages/${encodeURIComponent(stageId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteStage(stageId) {
  return apiRequest(`/bug-stages/${encodeURIComponent(stageId)}`, {
    method: 'DELETE',
  })
}

export async function reorderStages(order) {
  return apiRequest('/bug-stages/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ order }),
  })
}
