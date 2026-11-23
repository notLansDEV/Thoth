function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inlineMd(raw) {
  let s = escapeHtml(raw)
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  s = s.replace(/!\[([^\]]*)\]\(((?:data:image\/[a-zA-Z0-9.+-]+;base64,|https?:\/\/)[^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:6px;margin:6px 0;display:block;" />')
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/)[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
  return s
}

export function renderMarkdown(src, { emptyHtml = '<div class="md-blank">Nothing here yet — start typing…</div>' } = {}) {
  if (!src || !src.trim()) return emptyHtml
  const lines = String(src).split('\n')
  let html = ''
  let inCode = false
  let codeBuf = []
  let listTag = null
  let para = []
  const closeList = () => { if (listTag) { html += `</${listTag}>`; listTag = null } }
  const flushPara = () => { if (para.length) { html += `<p>${para.map(inlineMd).join('<br>')}</p>`; para = [] } }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^```/.test(line)) {
      if (inCode) { html += `<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`; codeBuf = []; inCode = false }
      else { flushPara(); closeList(); inCode = true }
      continue
    }
    if (inCode) { codeBuf.push(line); continue }
    if (/^\s*$/.test(line)) { flushPara(); closeList(); continue }
    let m
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { flushPara(); closeList(); const lv = Math.min(m[1].length + 1, 5); html += `<h${lv}>${inlineMd(m[2])}</h${lv}>`; continue }
    if (/^(---+|\*\*\*+)\s*$/.test(line)) { flushPara(); closeList(); html += '<hr>'; continue }
    if ((m = line.match(/^&gt;\s?(.*)$/)) || (m = line.match(/^>\s?(.*)$/))) { flushPara(); closeList(); html += `<blockquote>${inlineMd(m[1])}</blockquote>`; continue }
    if ((m = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/))) { flushPara(); if (listTag !== 'ul') { closeList(); html += '<ul class="md-task">'; listTag = 'ul' } const done = m[1].toLowerCase() === 'x'; html += `<li class="md-task-item${done ? ' md-done' : ''}"><span class="md-box">${done ? '☑' : '☐'}</span>${inlineMd(m[2])}</li>`; continue }
    if ((m = line.match(/^[-*]\s+(.*)$/))) { flushPara(); if (listTag !== 'ul') { closeList(); html += '<ul>'; listTag = 'ul' } html += `<li>${inlineMd(m[1])}</li>`; continue }
    if ((m = line.match(/^\d+[.)]\s+(.*)$/))) { flushPara(); if (listTag !== 'ol') { closeList(); html += '<ol>'; listTag = 'ol' } html += `<li>${inlineMd(m[1])}</li>`; continue }
    para.push(line)
  }
  if (inCode && codeBuf.length) html += `<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`
  flushPara(); closeList()
  return html || emptyHtml
}

export default renderMarkdown
