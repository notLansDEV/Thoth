const API_URL = '/api'

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(typeof document !== 'undefined' && document.cookie.match(/(?:^|; )thoth_csrf=([^;]+)/) ? { 'X-CSRF-Token': decodeURIComponent(document.cookie.match(/(?:^|; )thoth_csrf=([^;]+)/)[1]) } : {}),
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

export async function getMilestones(projectId) {
  return apiRequest(`/milestones?project_id=${encodeURIComponent(projectId)}`)
}

export async function createMilestone(data) {
  return apiRequest('/milestones', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateMilestone(id, data) {
  return apiRequest(`/milestones/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteMilestone(id) {
  return apiRequest(`/milestones/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
