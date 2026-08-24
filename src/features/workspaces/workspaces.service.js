const API_URL = '/api'
const STORAGE_KEY = 'thoth_workspace'

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

export async function getWorkspaces() {
  return apiRequest('/workspaces')
}

export async function createWorkspace(name) {
  return apiRequest('/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function updateWorkspace(id, data) {
  return apiRequest(`/workspaces/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteWorkspace(id) {
  return apiRequest(`/workspaces/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function getMembers(workspaceId) {
  return apiRequest(`/workspaces/${encodeURIComponent(workspaceId)}/members`)
}

export async function addMember(workspaceId, email, role) {
  return apiRequest(`/workspaces/${encodeURIComponent(workspaceId)}/members`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  })
}

export async function updateMemberRole(workspaceId, userId, role) {
  return apiRequest(`/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
}

export async function removeMember(workspaceId, userId) {
  return apiRequest(`/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })
}

export function setCurrentWorkspace(workspace) {
  if (workspace) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function getCurrentWorkspace() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
