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

export async function changePassword(currentPassword, newPassword) {
  return apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
}

export async function deleteAccount() {
  return apiRequest('/auth/account', { method: 'DELETE' })
}

export function getAccountUser() {
  try {
    return JSON.parse(localStorage.getItem('thoth_user') || 'null')
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem('token')
  localStorage.removeItem('thoth_user')
  localStorage.removeItem('thoth_workspace')
  window.location.href = '/login'
}