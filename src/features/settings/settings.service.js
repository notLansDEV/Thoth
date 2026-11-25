const SETTINGS_KEY = 'thoth_settings'

const DEFAULTS = {
  theme: 'dark',
  font: 'JetBrains Mono',
  compact: false,
}

export function getSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null')
    return { ...DEFAULTS, ...(parsed || {}) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
  applySettings(next)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('thoth:settings-changed', { detail: next }))
  }
  return next
}

export function applySettings(settings = getSettings()) {
  const root = document.documentElement

  if (settings.theme === 'light') root.setAttribute('data-theme', 'light')
  else if (settings.theme === 'system') {
    const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    root.setAttribute('data-theme', dark ? 'dark' : 'light')
  } else {
    root.setAttribute('data-theme', 'dark')
  }

  const font = String(settings.font || 'JetBrains Mono')
  const fontValue = /\s/.test(font) ? `"${font}"` : font
  root.style.setProperty('--font-family', fontValue)

  if (settings.compact) root.classList.add('compact-mode')
  else root.classList.remove('compact-mode')

  return settings
}
