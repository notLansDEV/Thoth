export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))
}

export function createRateLimiter({ windowMs, max }) {
  const hits = new Map()
  return (req, res, next) => {
    const now = Date.now()
    const key = `${req.ip}:${req.path}`
    const entry = hits.get(key)
    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }
    entry.count += 1
    if (entry.count > max) {
      const retrySec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
      res.set('Retry-After', String(retrySec))
      return res.status(429).json({ error: 'Too many requests. Please try again later.' })
    }
    return next()
  }
}

export function validateAttachments(input, { maxCount = 20, maxBytes = 5 * 1024 * 1024 } = {}) {
  const arr = Array.isArray(input) ? input : []
  if (arr.length > maxCount) return `Too many attachments (max ${maxCount})`
  for (const a of arr) {
    const dataUrl = typeof a?.dataUrl === 'string' ? a.dataUrl : ''
    if (dataUrl.startsWith('data:')) {
      const b64 = dataUrl.split(',')[1] || ''
      const bytes = Math.floor((b64.length * 3) / 4)
      if (bytes > maxBytes) return `Attachment exceeds ${Math.round(maxBytes / 1024 / 1024)}MB limit`
    }
  }
  return null
}
