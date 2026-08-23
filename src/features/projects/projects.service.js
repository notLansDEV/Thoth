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

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function getProjects(workspaceId) {
  if (!workspaceId) return []
  return apiRequest(`/projects?workspace_id=${encodeURIComponent(workspaceId)}`)
}

export async function addProject(workspaceId, name, description) {
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
    }),
  })
}
