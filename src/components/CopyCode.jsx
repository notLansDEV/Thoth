import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { copyDeepLink } from '../lib/deeplink.js'

export default function CopyCode({ page, id, code, style }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!id) return
    await copyDeepLink(page, id, code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Click to copy deep link"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        fontFamily: 'monospace', fontSize: '10px', fontWeight: 700,
        background: 'rgba(255,255,255,0.05)', color: copied ? 'var(--green)' : undefined,
        border: '1px solid var(--border-soft)', borderRadius: '3px',
        padding: '2px 6px', cursor: 'pointer', lineHeight: '1.4',
        ...(style || {}),
      }}
    >
      {code}
      {copied ? <Check size={10} /> : <Copy size={10} />}
    </button>
  )
}