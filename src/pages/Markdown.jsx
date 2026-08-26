import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft, ChevronRight, CalendarDays, FileText, Plus, Trash2, Clock,
  Heading1, Heading2, Bold, Italic, Code, FileCode2, Minus, List, ListTodo,
  PencilLine, Eye, Columns2, ArrowLeft,
} from 'lucide-react'
import { getPages, getPageByDate, createPage, updatePage, deletePage } from '../features/markdown/markdown.service.js'
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
export default function Markdown({ workspace, subPage }) {
  const wsId = workspace?.id
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

  const recents = useMemo(
    () => [...pages].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 8),
    [pages]
  )

  const journalBusy = useRef(false)

  async function openOrCreateJournal(dateStr) {
    if (!wsId || journalBusy.current) return
    journalBusy.current = true
    setJDate(dateStr)
    try {
      let page = await getPageByDate(wsId, dateStr)
      if (!page) {
        page = await createPage(wsId, {
          title: prettyDate(dateStr),
          page_type: 'journal',
          page_date: dateStr,
          content: '',
        })
        setPages((prev) => [page, ...prev])
      }
      setOpenPage(page)
    } catch (err) {
      window.alert(err.message || 'Could not open journal')
    } finally {
      journalBusy.current = false
    }
  }

  // switching submodule resets the open editor
  useEffect(() => { setOpenPage(null); setShowRecents(false) }, [view])

  // journal view always shows an entry for the selected date (fetch-or-create)
  useEffect(() => {
    if (!loaded || view !== 'journal') return
    if (openPage && openPage.page_type === 'journal') return
    openOrCreateJournal(jDate)
  }, [loaded, view, jDate, openPage])

  // leaving the module clears the open editor
  useEffect(() => () => setOpenPage(null), [])

  async function handleNewPage(title) {
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

  function patchLocal(next) {
    setPages((prev) => prev.map((p) => (p.id === next.id ? { ...p, ...next } : p)))
    if (openPage?.id === next.id) setOpenPage((cur) => ({ ...cur, ...next }))
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
            {openPage ? (openPage.title || 'Untitled') : (view === 'pages' ? 'All Pages' : 'Journal')}
          </h1>
          {openPage?.page_type === 'journal' && (
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
      {openPage ? (
        <PageEditor page={openPage} onChange={(patch) => { patchLocal(patch); updatePage(openPage.id, patch).then((upd) => upd && patchLocal(upd)).catch(() => {}) }} onDelete={() => setConfirmDelete(openPage)} />
      ) : view === 'pages' ? (
        <AllPagesGrid pages={pages} loaded={loaded} onOpen={setOpenPage} onDelete={setConfirmDelete} />
      ) : (
        <JournalShell jDate={jDate} onShift={setJDate} />
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

function JournalShell({ jDate, onShift }) {
  const isToday = jDate === fmtLocalDate(new Date())
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
      <button className="icon-btn" title="Previous day" onClick={() => onShift(shiftDate(jDate, -1))}><ChevronLeft size={14} /></button>
      <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#ccc', cursor: 'pointer' }}>
        <CalendarDays size={13} style={{ color: '#8b7ff5' }} />
        <span>{prettyDate(jDate)}</span>
        <input type="date" value={jDate} onChange={(e) => e.target.value && onShift(e.target.value)}
          style={{ background: 'transparent', border: 0, color: 'transparent', width: '16px', cursor: 'pointer', padding: 0 }} title="Pick a date" />
      </label>
      {!isToday && (
        <button className="btn" onClick={() => onShift(fmtLocalDate(new Date()))} style={{ cursor: 'pointer', fontSize: '10px', padding: '4px 9px' }}>Today</button>
      )}
      <button className="icon-btn" title="Next day" onClick={() => onShift(shiftDate(jDate, 1))}><ChevronRight size={14} /></button>
    </div>
  )
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
