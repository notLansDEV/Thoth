import { getCurrentWorkspace } from '../features/workspaces/workspaces.service.js'

export function deepLinkPath(page, id, code) {
  const ws = getCurrentWorkspace()
  const slug = ws?.slug || 'default'
  const segment = code || id
  return `/Thoth/${slug}/${page}/${segment}`
}

export function deepLinkUrl(page, id, code) {
  return window.location.origin + deepLinkPath(page, id, code)
}

export async function copyDeepLink(page, id, code) {
  const text = deepLinkUrl(page, id, code)
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    } catch {
      /* clipboard unavailable */
    }
  }
  return text
}