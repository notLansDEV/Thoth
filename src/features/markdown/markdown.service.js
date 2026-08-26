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

export async function getPages(workspaceId) {
  if (!workspaceId) return []
  return apiRequest(`/md-pages?workspace_id=${encodeURIComponent(workspaceId)}`)
}

export async function getPageByDate(workspaceId, date) {
  if (!workspaceId) return null
  const rows = await apiRequest(
    `/md-pages?workspace_id=${encodeURIComponent(workspaceId)}&type=journal&page_date=${encodeURIComponent(date)}`
  )
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

export async function createPage(workspaceId, { title, content, page_type, page_date }) {
  return apiRequest('/md-pages', {
    method: 'POST',
    body: JSON.stringify({ workspace_id: workspaceId, title, content, page_type, page_date }),
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
