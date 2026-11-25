import { useState } from 'react'
import { renderMarkdown } from '../utils/renderMarkdown.js'

export default function DescriptionPreview({ text = '', maxChars = 16, className = '', style = {}, emptyText = 'No description yet.' }) {
  const [expanded, setExpanded] = useState(false)
  const raw = String(text || '').trim()
  if (!raw) return <div className={className} style={style}><span style={{ color: 'var(--muted2)' }}>{emptyText}</span></div>

  const plain = raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>#-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const needsTruncate = plain.length > maxChars
  const preview = needsTruncate ? `${plain.slice(0, maxChars).trimEnd()}...` : plain

  if (!needsTruncate) {
    return (
      <div
        className={className}
        style={style}
        onClick={(e) => { if (e.target.closest('a')) e.stopPropagation() }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(raw, { emptyHtml: `<span style="color:var(--muted2)">${emptyText}</span>` }) }}
      />
    )
  }

  if (!expanded) {
    return (
      <div className={className} style={style}>
        <span>{preview}</span>{' '}
        <button
          type="button"
          className="desc-preview-toggle"
          onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', cursor: 'pointer', font: 'inherit', fontSize: 'inherit' }}
        >
          Show more
        </button>
      </div>
    )
  }

  return (
    <div className={className} style={style}>
      <div
        onClick={(e) => { if (e.target.closest('a')) e.stopPropagation() }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(raw, { emptyHtml: `<span style="color:var(--muted2)">${emptyText}</span>` }) }}
      />
      <button
        type="button"
        className="desc-preview-toggle"
        onClick={(e) => { e.stopPropagation(); setExpanded(false) }}
        style={{ background: 'none', border: 'none', padding: 0, marginTop: 4, color: 'var(--accent)', cursor: 'pointer', font: 'inherit', fontSize: 'inherit' }}
      >
        Show less
      </button>
    </div>
  )
}
