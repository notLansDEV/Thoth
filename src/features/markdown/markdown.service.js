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

export async function getPages(workspaceId, projectId) {
  if (!workspaceId) return []
  const q = new URLSearchParams({ workspace_id: workspaceId })
  if (projectId) q.set('project_id', projectId)
  return apiRequest(`/md-pages?${q.toString()}`)
}

export async function getPageByDate(workspaceId, date, projectId) {
  if (!workspaceId) return null
  const q = new URLSearchParams({ workspace_id: workspaceId, type: 'journal', page_date: date })
  if (projectId) q.set('project_id', projectId)
  const rows = await apiRequest(`/md-pages?${q.toString()}`)
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

export async function createPage(workspaceId, { title, content, page_type, page_date, attachments, project_id }) {
  return apiRequest('/md-pages', {
    method: 'POST',
    body: JSON.stringify({ workspace_id: workspaceId, title, content, page_type, page_date, attachments, project_id }),
  })
}

export async function updatePage(pageId, data) {
  return apiRequest(`/md-pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deletePage(pageId) {
  return apiRequest(`/md-pages/${pageId}`, { method: 'DELETE' })
}
