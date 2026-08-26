import { useRef, useState } from 'react'
import {
  Paperclip, FileImage, FileText, FileArchive, FileType2, FileSpreadsheet,
  MessageSquare, Trash2, Upload,
} from 'lucide-react'
import { updateProject } from '../projects.service.js'
import ConfirmModal from '../../../components/ConfirmModal.jsx'

const inputStyle = {
  width: '100%',
  padding: '8px 9px',
  border: '1px solid #2a2a2a',
  background: '#101010',
  color: '#ddd',
  borderRadius: '4px',
  fontSize: '12px',
  boxSizing: 'border-box',
  outline: 'none',
}

const labelStyle = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '10px',
  fontWeight: '700',
  color: '#777',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const MAX_FILE_BYTES = 2 * 1024 * 1024

function fileIcon(name) {
  if (!name) return <Paperclip size={22} />
  const ext = name.split('.').pop().toLowerCase()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return <FileImage size={22} />
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) return <FileText size={22} />
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FileArchive size={22} />
  if (['ts', 'tsx', 'js', 'jsx', 'json'].includes(ext)) return <FileType2 size={22} />
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet size={22} />
  return <Paperclip size={22} />
}

function formatSize(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function currentUser() {
  try {
    const u = JSON.parse(localStorage.getItem('thoth_user') || 'null')
    if (!u) return 'Unknown'
    return u.full_name || u.username || 'Unknown'
  } catch {
    return 'Unknown'
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

export default function AttachmentsTab({ project, onUpdateProject }) {
  const attachments = project.meta?.attachments || []
  const [showUpload, setShowUpload] = useState(false)
  const [previewAtt, setPreviewAtt] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function persist(next) {
    const updated = await updateProject(project.id, { meta: { attachments: next } })
    onUpdateProject(updated)
    return updated
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await persist(attachments.filter((a) => a.id !== confirmDelete.id))
      setConfirmDelete(null)
      setPreviewAtt(null)
    } catch (err) {
      window.alert(err.message || 'Could not delete attachment')
    } finally {
      setDeleting(false)
    }
  }

  async function handleAddComment(attId, text) {
    const next = attachments.map((a) => (
      a.id === attId
        ? { ...a, comments: [...(a.comments || []), { text, author: currentUser(), at: new Date().toISOString() }] }
        : a
    ))
    await persist(next)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', color: '#777' }}>
          {attachments.length} attachment{attachments.length === 1 ? '' : 's'}
        </span>
        <button className="btn primary" onClick={() => setShowUpload(true)} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <Upload size={12} /> Upload Attachments
        </button>
      </div>

      {attachments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#666' }}>
          <div style={{ fontSize: '13px', marginBottom: '8px' }}>No attachments yet</div>
          <div style={{ fontSize: '11px', color: '#555' }}>Upload files to share them with the team</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '10px' }}>
          {attachments.map((att) => {
            const commentCount = (att.comments || []).length
            return (
              <div
                key={att.id}
                onClick={() => setPreviewAtt(att)}
                style={{
                  background: '#121212', border: '1px solid #292929', borderRadius: '5px',
                  overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6e61ff' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#292929' }}
              >
                {/* Thumbnail */}
                <div style={{
                  height: '110px', background: '#0d0d0d', borderBottom: '1px solid #242424',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555',
                  overflow: 'hidden',
                }}>
                  {att.dataUrl && (att.type || '').startsWith('image/') ? (
                    <img src={att.dataUrl} alt={att.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    fileIcon(att.name)
                  )}
                </div>

                <div style={{ padding: '10px 11px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {att.title}
                  </div>
                  {att.description && (
                    <div style={{
                      fontSize: '10.5px', color: '#777', marginTop: '4px', lineHeight: 1.45,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {att.description}
                    </div>
                  )}
                  <div style={{ fontSize: '9.5px', color: '#555', marginTop: '7px' }}>
                    {att.uploaded_at ? new Date(att.uploaded_at).toLocaleDateString() : '—'} · {att.uploaded_by || 'Unknown'}
                    {formatSize(att.size) ? ` · ${formatSize(att.size)}` : ''}
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: commentCount > 0 ? '#999' : '#555' }}>
                    <MessageSquare size={11} /> {commentCount} comment{commentCount === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showUpload && (
        <UploadAttachmentModal
          onClose={() => setShowUpload(false)}
          onSubmit={async ({ title, description, fileMeta, dataUrl }) => {
            setShowUpload(false)
            await persist([...attachments, {
              id: crypto.randomUUID(),
              title,
              description,
              ...(fileMeta || {}),
              ...(dataUrl ? { dataUrl } : {}),
              uploaded_at: new Date().toISOString(),
              uploaded_by: currentUser(),
              comments: [],
            }])
          }}
        />
      )}

      {previewAtt && (
        <AttachmentPreviewModal
          att={attachments.find((a) => a.id === previewAtt.id) || previewAtt}
          onAddComment={(text) => handleAddComment(previewAtt.id, text)}
          onDelete={() => setConfirmDelete(previewAtt)}
          onClose={() => setPreviewAtt(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title={`Delete "${confirmDelete.title}"?`}
          message="This attachment and its comments will be removed."
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

function UploadAttachmentModal({ onSubmit, onClose }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef(null)

  function pickFile(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > MAX_FILE_BYTES) {
      setError('File is too large (max 2 MB).')
      return
    }
    setError(null)
    setFile(f)
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) return setError('Please choose a file.')
    if (!title.trim()) return setError('Please enter a title.')
    setLoading(true)
    setError(null)
    try {
      let dataUrl = null
      if ((file.type || '').startsWith('image/')) {
        dataUrl = await readFileAsDataUrl(file)
      }
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        fileMeta: { name: file.name, size: file.size, type: file.type },
        dataUrl,
      })
    } catch (err) {
      setError(err.message || 'Could not upload attachment')
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#151515', border: '1px solid #292929', borderRadius: '6px',
        padding: '24px', width: '100%', maxWidth: '420px', maxHeight: '90vh',
        overflowY: 'auto', boxShadow: '0 20px 25px rgba(0,0,0,0.3)',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700' }}>Upload Attachment</h2>
          <p style={{ margin: 0, color: '#777', fontSize: '12px' }}>Attach a file to this project</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div style={{
              marginBottom: '14px', padding: '8px 11px',
              border: '1px solid rgba(255,64,64,0.35)', borderRadius: '4px',
              background: 'rgba(255,64,64,0.07)', color: '#ff8a8a', fontSize: '11px',
            }} role="alert">{error}</div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>File</label>
            <input ref={fileRef} type="file" onChange={pickFile} style={{ display: 'none' }} />
            <button
              type="button" className="btn" onClick={() => fileRef.current?.click()}
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Paperclip size={12} /> Choose file
            </button>
            {file && (
              <div style={{ fontSize: '10.5px', color: '#888', marginTop: '6px' }}>
                {file.name} · {formatSize(file.size)}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Title</label>
            <input
              type="text" value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Wireframes v2"
              style={inputStyle} autoFocus
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this file about?"
              style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose} style={{ cursor: 'pointer' }}>Cancel</button>
            <button type="submit" className="btn primary" disabled={loading} style={{ cursor: 'pointer' }}>
              {loading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AttachmentPreviewModal({ att, onAddComment, onDelete, onClose }) {
  const [commentText, setCommentText] = useState('')
  const me = currentUser()

  async function postComment(e) {
    e.preventDefault()
    if (!commentText.trim()) return
    await onAddComment(commentText.trim())
    setCommentText('')
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.65)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#151515', border: '1px solid #292929', borderRadius: '6px',
        width: '100%', maxWidth: '560px', maxHeight: '88vh', overflowY: 'auto',
        boxShadow: '0 20px 25px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '18px 20px 0' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f1f1f1' }}>{att.title}</h2>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
              Uploaded {att.uploaded_at ? new Date(att.uploaded_at).toLocaleString() : '—'} · {att.uploaded_by}
              {att.name ? ` · ${att.name}` : ''}
              {formatSize(att.size) ? ` · ${formatSize(att.size)}` : ''}
            </div>
          </div>
          <button className="icon-btn" title="Delete attachment" style={{ color: '#ff6b6b' }} onClick={onDelete}><Trash2 size={12} /></button>
          <button className="icon-btn" title="Close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '14px 20px 20px' }}>
          {att.dataUrl && (att.type || '').startsWith('image/') && (
            <img
              src={att.dataUrl} alt={att.title}
              style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', borderRadius: '5px', border: '1px solid #242424', background: '#0d0d0d', marginBottom: '14px' }}
            />
          )}

          {att.description && (
            <div style={{ marginBottom: '14px' }}>
              <div style={labelStyle}>Description</div>
              <div style={{ fontSize: '12px', color: '#bbb', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{att.description}</div>
            </div>
          )}

          {!att.description && !att.dataUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '12px', background: '#101010', border: '1px solid #232323', borderRadius: '4px', color: '#888', marginBottom: '14px' }}>
              {fileIcon(att.name)}<span style={{ fontSize: '12px' }}>{att.name}</span>
            </div>
          )}

          {/* Comments */}
          <div style={{ borderTop: '1px solid #292929', paddingTop: '13px' }}>
            <div style={labelStyle}>Comments ({(att.comments || []).length})</div>

            {(att.comments || []).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '11px' }}>
                {att.comments.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
                    <span className="avatar">{(c.author || '?').slice(0, 2).toUpperCase()}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#ddd' }}>{c.author}</span>
                        <span style={{ fontSize: '9.5px', color: '#666' }}>
                          {new Date(c.at).toLocaleDateString()} · {new Date(c.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#bbb', whiteSpace: 'pre-wrap', marginTop: '2px' }}>{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={postComment} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="avatar">{me.slice(0, 2).toUpperCase()}</span>
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment…"
                className="search"
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn primary" disabled={!commentText.trim()} style={{ cursor: 'pointer' }}>Send</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
