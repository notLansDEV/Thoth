import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft, ChevronRight, ChevronDown, CalendarDays, FileText, Plus, Trash2, Clock,
  Heading1, Heading2, Bold, Italic, Code, FileCode2, Minus, List, ListTodo,
  PencilLine, Eye, Columns2, ArrowLeft, MoreHorizontal, Smile,
} from 'lucide-react'
import { getPages, createPage, updatePage, deletePage } from '../features/markdown/markdown.service.js'
import { getCurrentWorkspace } from '../features/workspaces/workspaces.service.js'
import { getWorkspaceMembers } from '../features/tasks/tasks.service.js'
import ConfirmModal from '../components/ConfirmModal.jsx'

function fmtLocalDate(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + days)
  return fmtLocalDate(d)
}

function prettyDate(dateStr) {
  try {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function relTime(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

function localDateStr(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function feedTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60000) return 'Just now'
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m} min${m === 1 ? '' : 's'} ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (localDateStr(d) === localDateStr(yesterday)) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const AVATAR_TINTS = [
  { bg: 'rgba(91,141,255,0.16)', fg: '#7ea6ff' },
  { bg: 'rgba(139,127,245,0.16)', fg: '#a99dff' },
  { bg: 'rgba(32,216,107,0.14)', fg: '#5ad48c' },
  { bg: 'rgba(255,170,64,0.15)', fg: '#ffb86b' },
  { bg: 'rgba(255,107,157,0.15)', fg: '#ff8ab5' },
  { bg: 'rgba(64,206,255,0.14)', fg: '#6fd3ff' },
]

function avatarTint(name) {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return AVATAR_TINTS[sum % AVATAR_TINTS.length]
}

const EMOJIS = ['💡', '🔥', '✅', '🐛', '❤️', '😂', '😮', '🎉', '🚀', '👀', '☕', '🧠', '📌', '👍', '⚡', '➕']

function toggleReaction(reactions, emoji, userId) {
  const rx = { ...(reactions || {}) }
  const arr = [...(rx[emoji] || [])]
  const i = arr.indexOf(userId)
  if (i >= 0) arr.splice(i, 1)
  else arr.push(userId)
  if (arr.length) rx[emoji] = arr
  else delete rx[emoji]
  return rx
}

// ---------- tiny markdown renderer ----------
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inlineMd(raw) {
  let s = escapeHtml(raw)
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
  return s
}

export function renderMarkdown(src) {
  if (!src || !src.trim()) return '<div class="md-blank">Nothing here yet — start typing…</div>'
  const lines = String(src).split('\n')
  let html = ''
  let inCode = false
  let codeBuf = []
  let listTag = null
  let para = []
  const closeList = () => {
    if (listTag) { html += `</${listTag}>`; listTag = null }
  }
  const flushPara = () => {
    if (para.length) { html += `<p>${para.map(inlineMd).join('<br>')}</p>`; para = [] }
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^```/.test(line)) {
      if (inCode) {
        html += `<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`
        codeBuf = []; inCode = false
      } else {
        flushPara(); closeList(); inCode = true
      }
      continue
    }
    if (inCode) { codeBuf.push(line); continue }
    if (/^\s*$/.test(line)) { flushPara(); closeList(); continue }
    let m
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      flushPara(); closeList()
      const lv = Math.min(m[1].length + 1, 5)
      html += `<h${lv}>${inlineMd(m[2])}</h${lv}>`
      continue
    }
    if (/^(---+|\*\*\*+)\s*$/.test(line)) { flushPara(); closeList(); html += '<hr>'; continue }
    if ((m = line.match(/^&gt;\s?(.*)$/)) || (m = line.match(/^>\s?(.*)$/))) {
      flushPara(); closeList()
      html += `<blockquote>${inlineMd(m[1])}</blockquote>`
      continue
    }
    if ((m = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/))) {
      flushPara()
      if (listTag !== 'ul') { closeList(); html += '<ul class="md-task">'; listTag = 'ul' }
      const done = m[1].toLowerCase() === 'x'
      html += `<li class="md-task-item${done ? ' md-done' : ''}"><span class="md-box">${done ? '☑' : '☐'}</span>${inlineMd(m[2])}</li>`
      continue
    }
    if ((m = line.match(/^[-*]\s+(.*)$/))) {
      flushPara()
      if (listTag !== 'ul') { closeList(); html += '<ul>'; listTag = 'ul' }
      html += `<li>${inlineMd(m[1])}</li>`
      continue
    }
    if ((m = line.match(/^\d+[.)]\s+(.*)$/))) {
      flushPara()
      if (listTag !== 'ol') { closeList(); html += '<ol>'; listTag = 'ol' }
      html += `<li>${inlineMd(m[1])}</li>`
      continue
    }
    para.push(line)
  }
  if (inCode && codeBuf.length) html += `<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`
  flushPara(); closeList()
  return html || '<div class="md-blank">Nothing here yet — start typing…</div>'
}

// ---------- main module ----------
export default function Markdown({ subPage }) {
  const ws = getCurrentWorkspace()
  const wsId = ws?.id
  const view = subPage === 'pages' ? 'pages' : 'journal'

  const [pages, setPages] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [jDate, setJDate] = useState(fmtLocalDate(new Date()))
  const [openPage, setOpenPage] = useState(null)
  const [showRecents, setShowRecents] = useState(false)
  const [showNewPage, setShowNewPage] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  async function refresh() {
    if (!wsId) return
    try {
      const rows = await getPages(wsId)
      setPages(Array.isArray(rows) ? rows : [])
    } catch {
      setPages([])
    } finally {
      setLoaded(true)
    }
  }

  useEffect(() => { refresh() }, [wsId])

  // author lookup for feed cards
  const [authors, setAuthors] = useState({})
  useEffect(() => {
    let alive = true
    if (!wsId) return undefined
    getWorkspaceMembers(wsId)
      .then((rows) => {
        if (!alive) return
        const map = {}
        for (const m of Array.isArray(rows) ? rows : []) {
          map[m.id] = m.full_name || m.username || 'Unknown'
        }
        setAuthors(map)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [wsId])

  let myId = null
  try { myId = JSON.parse(localStorage.getItem('thoth_user') || 'null')?.id || null } catch { myId = null }

  function handlePagePatch(pageId, patch) {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, ...patch } : p)))
    updatePage(pageId, patch)
      .then((upd) => upd && setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, ...upd } : p))))
      .catch(() => {})
  }

  function handleReact(page, emoji) {
    handlePagePatch(page.id, { reactions: toggleReaction(page.reactions, emoji, myId) })
  }

  const recents = useMemo(
    () => [...pages].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 8),
    [pages]
  )

  async function handleNewNote() {
    if (!wsId) {
      window.alert('No workspace selected — please pick a workspace first.')
      return
    }
    try {
      const page = await createPage(wsId, {
        title: prettyDate(jDate),
        page_type: 'journal',
        page_date: jDate,
        content: '',
      })
      setPages((prev) => [page, ...prev])
      setOpenPage(page)
    } catch (err) {
      window.alert(err.message || 'Could not create note')
    }
  }

  // switching submodule resets the open editor
  useEffect(() => { setOpenPage(null); setShowRecents(false) }, [view])

  // leaving the module clears the open editor
  useEffect(() => () => setOpenPage(null), [])

  async function handleNewPage(title) {
    if (!wsId) {
      window.alert('No workspace selected — please pick a workspace first.')
      setShowNewPage(false)
      return
    }
    try {
      const page = await createPage(wsId, { title: title || 'Untitled', page_type: 'page', content: '' })
      setPages((prev) => [page, ...prev])
      setOpenPage(page)
      setShowNewPage(false)
    } catch (err) {
      window.alert(err.message || 'Could not create page')
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    try {
      await deletePage(confirmDelete.id)
      setPages((prev) => prev.filter((p) => p.id !== confirmDelete.id))
      if (openPage?.id === confirmDelete.id) setOpenPage(null)
      setConfirmDelete(null)
    } catch (err) {
      window.alert(err.message || 'Could not delete page')
    }
  }

  return (
    <div>
      {/* Module head */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '13px', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          {openPage && (
            <button className="icon-btn" title="Back" onClick={() => setOpenPage(null)}><ArrowLeft size={14} /></button>
          )}
          <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
            {view === 'pages' ? (openPage ? (openPage.title || 'Untitled') : 'All Pages') : 'Journal'}
          </h1>
          {view === 'journal' && (
            <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.05em', color: '#8b7ff5', background: 'rgba(105,93,240,0.12)', border: '1px solid rgba(105,93,240,0.35)', padding: '3px 7px', borderRadius: '999px' }}>JOURNAL</span>
          )}
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div style={{ position: 'relative' }}>
            <button className="btn" onClick={() => { setShowRecents((v) => !v); setShowNewPage(false) }} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={12} /> Recents <ChevronRight size={11} style={{ transform: showRecents ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {showRecents && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowRecents(false)} />
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 5px)', width: '260px',
                  background: '#151515', border: '1px solid #292929', borderRadius: '6px',
                  boxShadow: '0 14px 22px rgba(0,0,0,0.45)', zIndex: 50, overflow: 'hidden',
                }}>
                  <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#666', letterSpacing: '0.07em', padding: '9px 12px 5px', borderBottom: '1px solid #242424' }}>RECENTLY EDITED</div>
                  {recents.length === 0 ? (
                    <div style={{ padding: '14px 12px', fontSize: '11px', color: '#555' }}>No pages yet</div>
                  ) : recents.map((p) => (
                    <button key={p.id} onClick={() => { setOpenPage(p); setShowRecents(false) }}
                      style={{
                        display: 'flex', width: '100%', textAlign: 'left', gap: '8px', alignItems: 'center',
                        background: 'transparent', border: 0, cursor: 'pointer', padding: '9px 12px',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#1c1c1c' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      {p.page_type === 'journal' ? <CalendarDays size={12} style={{ color: '#8b7ff5', flexShrink: 0 }} /> : <FileText size={12} style={{ color: '#777', flexShrink: 0 }} />}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '11.5px', color: '#ddd', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title || 'Untitled'}</span>
                        <span style={{ display: 'block', fontSize: '9.5px', color: '#666' }}>{relTime(p.updated_at)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button className="btn primary" onClick={() => { setShowNewPage(true); setShowRecents(false) }} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Plus size={12} /> New Page
          </button>
        </div>
      </div>

      {/* Content */}
      {view === 'pages' ? (
        openPage ? (
          <PageEditor
            page={openPage}
            onChange={(patch) => handlePagePatch(openPage.id, patch)}
            onDelete={() => setConfirmDelete(openPage)}
          />
        ) : (
          <AllPagesGrid pages={pages} loaded={loaded} onOpen={setOpenPage} onDelete={setConfirmDelete} />
        )
      ) : (
        <>
          {/* compact date pager above the feed */}
          <DatePager jDate={jDate} onShift={setJDate} />
          {openPage ? (
            <PageEditor
              page={openPage}
              onChange={(patch) => handlePagePatch(openPage.id, patch)}
              onDelete={() => setConfirmDelete(openPage)}
            />
          ) : (
            <JournalFeed
              entries={pages
                .filter((p) => p.page_type === 'journal' && p.page_date === jDate)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))}
              loaded={loaded}
              authors={authors}
              myId={myId}
              onEdit={setOpenPage}
              onDelete={setConfirmDelete}
              onCreate={handleNewNote}
              onReact={handleReact}
            />
          )}
        </>
      )}

      {showNewPage && <NewPageModal onSubmit={handleNewPage} onClose={() => setShowNewPage(false)} />}

      {confirmDelete && (
        <ConfirmModal
          title={`Delete "${confirmDelete.title || 'Untitled'}"?`}
          message={confirmDelete.page_type === 'journal' ? 'This journal entry will be permanently removed.' : 'This page will be permanently removed.'}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

function DatePager({ jDate, onShift }) {
  const todayStr = fmtLocalDate(new Date())
  const dt = new Date(`${jDate}T12:00:00`)
  const label = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
      <button className="icon-btn" title="Previous day" onClick={() => onShift(shiftDate(jDate, -1))}><ChevronLeft size={14} /></button>
      <label className="md-date-pill" title="Pick a date">
        <CalendarDays size={12} style={{ color: '#5b8dff', flexShrink: 0 }} />
        <span>{label}</span>
        <input
          type="date" value={jDate}
          onChange={(e) => e.target.value && onShift(e.target.value)}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
        />
      </label>
      <button className="icon-btn" title="Next day" onClick={() => onShift(shiftDate(jDate, 1))}><ChevronRight size={14} /></button>
      {jDate !== todayStr && (
        <button className="btn" onClick={() => onShift(todayStr)} style={{ cursor: 'pointer', fontSize: '10px', padding: '3px 9px' }}>Today</button>
      )}
    </div>
  )
}

function shortDate(dateStr) {
  try {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function AllPagesGrid({ pages, loaded, onOpen, onDelete }) {
  if (!loaded) return <div style={{ textAlign: 'center', padding: '48px', color: '#666', fontSize: '12px' }}>Loading pages…</div>
  if (pages.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px', color: '#666' }}>
        <div style={{ fontSize: '13px', marginBottom: '8px' }}>No pages yet</div>
        <div style={{ fontSize: '11px', color: '#555' }}>Create your first page with “New Page”</div>
      </div>
    )
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '10px' }}>
      {pages.map((p) => (
        <div key={p.id}
          onClick={() => onOpen(p)}
          style={{ background: '#121212', border: '1px solid #292929', borderRadius: '5px', padding: '12px', cursor: 'pointer', transition: 'border-color 0.15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6e61ff' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#292929' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
            {p.page_type === 'journal'
              ? <CalendarDays size={12} style={{ color: '#8b7ff5', flexShrink: 0 }} />
              : <FileText size={12} style={{ color: '#777', flexShrink: 0 }} />}
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.title || 'Untitled'}</span>
            <button
              className="icon-btn" title="Delete"
              onClick={(e) => { e.stopPropagation(); onDelete(p) }}
              style={{ color: '#ff6b6b' }}
            ><Trash2 size={11} /></button>
          </div>
          <div style={{ fontSize: '10.5px', color: '#777', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '31px' }}>
            {(p.content || '').replace(/[#*`>\-[\]]/g, '').trim().slice(0, 120) || 'Empty page'}
          </div>
          <div style={{ fontSize: '9.5px', color: '#555', marginTop: '7px' }}>Edited {relTime(p.updated_at)}</div>
        </div>
      ))}
    </div>
  )
}

function NewPageModal({ onSubmit, onClose }) {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); if (!loading) { setLoading(true); onSubmit(title.trim()) } }}
        style={{ background: '#151515', border: '1px solid #292929', borderRadius: '6px', padding: '24px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 25px rgba(0,0,0,0.3)' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700 }}>New Page</h2>
        <p style={{ margin: '0 0 14px', fontSize: '11.5px', color: '#777' }}>Give your page a title</p>
        <input
          type="text" value={title} autoFocus
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Meeting notes"
          className="search" style={{ width: '100%', marginBottom: '18px' }}
        />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose} style={{ cursor: 'pointer' }}>Cancel</button>
          <button type="submit" className="btn primary" disabled={loading} style={{ cursor: 'pointer' }}>{loading ? 'Creating…' : 'Create'}</button>
        </div>
      </form>
    </div>
  )
}

// ---------- notepad editor ----------
function PageEditor({ page, onChange, onDelete }) {
  const [content, setContent] = useState(page.content || '')
  const [title, setTitle] = useState(page.title || '')
  const [mode, setMode] = useState('editor') // editor | preview | split
  const taRef = useRef(null)

  useEffect(() => {
    setContent(page.content || '')
    setTitle(page.title || '')
  }, [page.id])

  const stats = useMemo(() => ({
    words: content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0,
    lines: content.split('\n').length,
  }), [content])

  // wrap or prefix insertion at the current selection
  const applyTool = useCallback((tool) => {
    const ta = taRef.current
    if (!ta) return
    const { selectionStart: s, selectionEnd: e, value } = ta
    const sel = value.slice(s, e)
    let next = value
    let caret = e
    const lineStart = value.lastIndexOf('\n', s - 1) + 1

    switch (tool) {
      case 'h1':
      case 'h2': {
        const prefix = tool === 'h1' ? '# ' : '## '
        const already = value.slice(lineStart, s).startsWith(prefix)
        if (already) {
          next = value.slice(0, lineStart) + value.slice(lineStart + prefix.length)
          caret = e - prefix.length
        } else {
          next = value.slice(0, lineStart) + prefix + value.slice(lineStart)
          caret = e + prefix.length
        }
        break
      }
      case 'bold': next = `${value.slice(0, s)}**${sel || 'bold text'}**${value.slice(e)}`; caret = s + 2 + (sel || 'bold text').length + 2; break
      case 'italic': next = `${value.slice(0, s)}*${sel || 'italic text'}*${value.slice(e)}`; caret = s + 1 + (sel || 'italic text').length + 1; break
      case 'code': next = `${value.slice(0, s)}\`${sel || 'code'}\`${value.slice(e)}`; caret = s + 1 + (sel || 'code').length + 1; break
      case 'fence': next = `${value.slice(0, s)}\`\`\`\n${sel}\n\`\`\`${value.slice(e)}`; caret = s + 4 + sel.length; break
      case 'hr': next = `${value.slice(0, s)}\n\n---\n\n${value.slice(e)}`; caret = s + 6; break
      case 'ul': next = `${value.slice(0, lineStart)}- ${value.slice(lineStart)}`; caret = e + 2; break
      case 'todo': next = `${value.slice(0, lineStart)}- [ ] ${value.slice(lineStart)}`; caret = e + 6; break
      default: break
    }
    setContent(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(caret, caret)
    })
  }, [])

  return (
    <div className="card md-card">
      {/* Title row */}
      <input
        className="md-title-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => { if (title.trim() && title !== page.title) onChange({ title: title.trim() }) }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
        placeholder="Untitled"
      />

      {/* Toolbar */}
      <div className="md-toolbar">
        <div className="md-tools-left">
          <ToolBtn label="H1" title="Heading 1" Icon={Heading1} onClick={() => applyTool('h1')} />
          <ToolBtn label="H2" title="Heading 2" Icon={Heading2} onClick={() => applyTool('h2')} />
          <span className="md-tsep" />
          <ToolBtn label="B" title="Bold" Icon={Bold} onClick={() => applyTool('bold')} b />
          <ToolBtn label="I" title="Italic" Icon={Italic} onClick={() => applyTool('italic')} i />
          <ToolBtn label="`" title="Inline code" Icon={Code} mono onClick={() => applyTool('code')} />
          <ToolBtn label="```" title="Code block" Icon={FileCode2} mono onClick={() => applyTool('fence')} />
          <span className="md-tsep" />
          <ToolBtn label="—" title="Divider" Icon={Minus} onClick={() => applyTool('hr')} />
          <ToolBtn label="-" title="Bullet list" Icon={List} onClick={() => applyTool('ul')} />
          <ToolBtn label="[ ]" title="Checkbox" Icon={ListTodo} onClick={() => applyTool('todo')} />
        </div>
        <div className="md-tools-right">
          <span className="md-stats">{stats.words}w · {stats.lines}L</span>
          <div className="md-seg">
            <SegBtn active={mode === 'editor'} onClick={() => setMode('editor')} Icon={PencilLine} title="Editor" />
            <SegBtn active={mode === 'preview'} onClick={() => setMode('preview')} Icon={Eye} title="Preview" />
            <SegBtn active={mode === 'split'} onClick={() => setMode('split')} Icon={Columns2} title="Split view" />
          </div>
          <button className="icon-btn" title="Delete this page" style={{ color: '#ff6b6b' }} onClick={onDelete}><Trash2 size={12} /></button>
        </div>
      </div>

      {/* Body */}
      {mode === 'preview' ? (
        <div className="md-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: mode === 'split' ? '1fr 1fr' : '1fr', gap: 0, height: 'calc(100vh - 320px)', minHeight: '300px' }}>
          <textarea
            ref={taRef}
            className="md-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={() => { if (content !== (page.content || '')) onChange({ content }) }}
            placeholder="# Start writing…&#10;&#10;- ideas&#10;- [ ] todos&#10;- **markdown** supported"
            spellCheck={false}
          />
          {mode === 'split' && (
            <div className="md-preview md-split" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
          )}
        </div>
      )}

      {(mode === 'editor' || mode === 'split') && (
        <div className="md-footnote">{stats.words} words · autosaves when you click away</div>
      )}
    </div>
  )
}

function ToolBtn({ label, title, Icon, onClick, b, i, mono }) {
  return (
    <button type="button" className="md-tool-btn" title={title} onClick={onClick}>
      <Icon size={13} strokeWidth={2.2} />
      <span style={{ fontWeight: b ? 800 : undefined, fontStyle: i ? 'italic' : undefined, fontFamily: mono ? 'monospace' : undefined }}>{label}</span>
    </button>
  )
}

function SegBtn({ active, onClick, Icon, title }) {
  return (
    <button type="button" title={title} onClick={onClick} className={`md-seg-btn${active ? ' active' : ''}`}>
      <Icon size={12} />
    </button>
  )
}

// ---------- journal feed (social-style) ----------
const LONG_CHARS = 420
const LONG_LINES = 12

function JournalFeed({ entries, loaded, authors, myId, onEdit, onDelete, onCreate, onReact }) {
  if (!loaded) return <div style={{ textAlign: 'center', padding: '40px', color: '#666', fontSize: '12px' }}>Loading notes…</div>
  return (
    <div className="j-feed">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '9px' }}>
        <span style={{ fontSize: '10.5px', color: '#777' }}>
          {entries.length === 0 ? 'No notes for this day yet.' : `${entries.length} note${entries.length === 1 ? '' : 's'} · ${shortDate(entries[0].page_date || '')}`}
        </span>
        <button className="j-link-btn" onClick={onCreate}><Plus size={11} /> New note</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
        {entries.map((p) => (
          <NoteCard
            key={p.id}
            page={p}
            authorName={authors[p.created_by] || 'Unknown'}
            myId={myId}
            onEdit={() => onEdit(p)}
            onDelete={() => onDelete(p)}
            onReact={(emoji) => onReact(p, emoji)}
          />
        ))}
      </div>
    </div>
  )
}

function NoteCard({ page, authorName, myId, onEdit, onDelete, onReact }) {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reactOpen, setReactOpen] = useState(false)
  const html = useMemo(() => renderMarkdown(page.content), [page.content])
  const isLong = (page.content || '').length > LONG_CHARS || (page.content || '').split('\n').length > LONG_LINES
  const reactions = page.reactions || {}
  const tint = avatarTint(authorName)
  const initials = (authorName || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <article className="j-card">
      {/* header */}
      <header className="j-head">
        <span className="avatar" style={{ background: tint.bg, color: tint.fg, width: '26px', height: '26px', fontSize: '10px', flexShrink: 0 }}>{initials}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="j-author">{authorName}</div>
          <div className="j-time">{feedTime(page.created_at)}{page.updated_at && page.created_at && (new Date(page.updated_at) - new Date(page.created_at)) > 60000 ? ` · edited` : ''}</div>
        </div>
        <div style={{ position: 'relative' }}>
          <button className="icon-btn" title="More" onClick={() => { setMenuOpen((v) => !v); setReactOpen(false) }}><MoreHorizontal size={14} /></button>
          {menuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setMenuOpen(false)} />
              <div className="j-menu" role="menu">
                <button className="j-menu-item" onClick={() => { setMenuOpen(false); onEdit() }}><PencilLine size={11} /> Edit</button>
                <button className="j-menu-item danger" onClick={() => { setMenuOpen(false); onDelete() }}><Trash2 size={11} /> Delete</button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* title */}
      {page.title && page.title !== 'Untitled' && (
        <h3 className="j-title">{page.title}</h3>
      )}

      {/* body preview */}
      <div
        className={`md-preview j-body${expanded ? '' : ' j-clamp'}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* expand toggle */}
      {isLong && (
        <button type="button" className="j-more" onClick={() => setExpanded((v) => !v)}>
          {expanded ? <>Show less <ChevronDown size={11} style={{ transform: 'rotate(180deg)' }} /></> : <>Show more <ChevronDown size={11} /></>}
        </button>
      )}

      {/* reactions */}
      <footer className="j-react-row">
        <div style={{ position: 'relative' }}>
          <button className="j-react-add" title="Add reaction" onClick={() => { setReactOpen((v) => !v); setMenuOpen(false) }}><Smile size={12} /></button>
          {reactOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setReactOpen(false)} />
              <div className="j-emoji-pop" role="menu">
                {EMOJIS.map((e) => (
                  <button key={e} className="j-emoji" onClick={() => { setReactOpen(false); onReact(e) }}>{e}</button>
                ))}
              </div>
            </>
          )}
        </div>
        {Object.entries(reactions).map(([emoji, users]) => {
          const count = Array.isArray(users) ? users.length : 0
          if (!count) return null
          const mine = Array.isArray(users) && myId && users.includes(myId)
          return (
            <button key={emoji} className={`j-chip${mine ? ' mine' : ''}`} title={`${count} reaction${count === 1 ? '' : 's'}`} onClick={() => onReact(emoji)}>
              <span>{emoji}</span><span>{count}</span>
            </button>
          )
        })}
      </footer>
    </article>
  )
}
