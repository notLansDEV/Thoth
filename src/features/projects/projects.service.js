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

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const PROJECT_STATUSES = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const PROJECT_PRIORITIES = [
  { value: 'low', label: 'Low', color: '#20d96b' },
  { value: 'medium', label: 'Medium', color: '#e8c547' },
  { value: 'high', label: 'High', color: '#ff7918' },
  { value: 'critical', label: 'Critical', color: '#ff4040' },
]

export async function getProjects(workspaceId) {
  if (!workspaceId) return []
  return apiRequest(`/projects?workspace_id=${encodeURIComponent(workspaceId)}`)
}

export async function getProject(projectId) {
  return apiRequest(`/projects/${encodeURIComponent(projectId)}`)
}

export async function updateProject(projectId, data) {
  return apiRequest(`/projects/${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteProject(projectId) {
  return apiRequest(`/projects/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
  })
}

export async function getProjectBugs(projectId) {
  if (!projectId) return []
  return apiRequest(`/bugs?project_id=${encodeURIComponent(projectId)}`)
}

export async function addProject(workspaceId, { name, description, status, start_date, deadline }) {
  if (!workspaceId) {
    throw new Error('workspaceId is required to create a project')
  }

  return apiRequest('/projects', {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: workspaceId,
      name,
      description,
      slug: slugify(name),
      status: status || 'planning',
      start_date: start_date || null,
      deadline: deadline || null,
    }),
  })
}

export async function getProjectMembers(projectId) {
  if (!projectId) return []
  return apiRequest(`/projects/${encodeURIComponent(projectId)}/members`)
}

export async function setProjectMembers(projectId, memberIdsOrEntries) {
  const isEntryArray = Array.isArray(memberIdsOrEntries) && memberIdsOrEntries.some(v => v && typeof v === 'object')
  return apiRequest(`/projects/${encodeURIComponent(projectId)}/members`, {
    method: 'PUT',
    body: JSON.stringify(isEntryArray ? { members: memberIdsOrEntries } : { member_ids: memberIdsOrEntries }),
  })
}

export async function getWorkspaceProjectMemberships(workspaceId) {
  if (!workspaceId) return []
  return apiRequest(`/workspaces/${encodeURIComponent(workspaceId)}/project-memberships`)
}

export async function setUserProjectMemberships(workspaceId, userId, assignments) {
  return apiRequest(`/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}/project-memberships`, {
    method: 'PUT',
    body: JSON.stringify({ assignments }),
  })
}
