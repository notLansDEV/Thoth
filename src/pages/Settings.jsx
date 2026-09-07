import { useEffect, useState } from 'react'
import {
  Settings2, Palette, Users, Bell, Database, Info, Monitor, Moon, Sun, Save,
  User, LogOut, Trash2, UserPlus, Check, X,
} from 'lucide-react'
import { getSettings, saveSettings } from '../features/settings/settings.service.js'
import {
  getCurrentWorkspace,
  setCurrentWorkspace,
  updateWorkspace,
  getMembers,
  addMember,
  updateMemberRole,
  removeMember,
} from '../features/workspaces/workspaces.service.js'
import {
  changePassword,
  deleteAccount,
  getAccountUser,
  clearSession,
} from '../features/auth/account.service.js'

const FONTS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Source Sans 3', 'JetBrains Mono']
const ROLES = ['owner', 'admin', 'member']

const NAV = [
  {
    group: 'Configuration',
    items: [
      { key: 'account', label: 'Account', Icon: User },
      { key: 'general', label: 'General', Icon: Settings2 },
      { key: 'appearance', label: 'Appearance', Icon: Palette },
    ],
  },
  {
    group: 'Workspace',
    items: [
      { key: 'team', label: 'Team & Members', Icon: Users },
      { key: 'notifications', label: 'Notifications', Icon: Bell },
    ],
  },
  {
    group: 'System',
    items: [
      { key: 'storage', label: 'Data & Storage', Icon: Database },
      { key: 'about', label: 'About Thoth', Icon: Info },
    ],
  },
]

function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" role="presentation" aria-hidden="true" />
      <span style={{ position: 'absolute', left: '-9999px' }}>{label}</span>
    </label>
  )
}

function msgStyle(type) {
  return {
    marginBottom: '10px', padding: '7px 10px', borderRadius: '4px', fontSize: '11px',
    border: `1px solid ${type === 'ok' ? 'rgba(32,217,107,0.35)' : 'rgba(255,64,64,0.35)'}`,
    background: type === 'ok' ? 'rgba(32,217,107,0.07)' : 'rgba(255,64,64,0.07)',
    color: type === 'ok' ? '#20d96b' : '#ff8a8a',
  }
}

export default function Settings() {
  const [ws, setWs] = useState(() => getCurrentWorkspace())
  const user = getAccountUser()
  const [tab, setTab] = useState('general')
  const [settings, setSettings] = useState(getSettings())

  // General
  const [wsName, setWsName] = useState(ws?.name || '')
  const [wsSaved, setWsSaved] = useState(false)
  const [wsError, setWsError] = useState(null)
  const [savingWs, setSavingWs] = useState(false)

  // Team & Members
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [teamBusy, setTeamBusy] = useState(false)
  const [teamMsg, setTeamMsg] = useState(null)
  const [editingRole, setEditingRole] = useState(null)

  // Notifications
  const [notifs, setNotifs] = useState({ assigned: true, comments: true, dueSoon: true, weekly: false })

  // Account
  const [pwdCurrent, setPwdCurrent] = useState('')
  const [pwdNext, setPwdNext] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [pwdBusy, setPwdBusy] = useState(false)
  const [pwdMsg, setPwdMsg] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState(null)

  function save(patch) {
    const next = saveSettings(patch)
    setSettings(next)
  }

  const isSelf = (id) => user && id === user.id

  async function handleSaveGeneral() {
    if (!ws || !wsName.trim()) return
    setSavingWs(true)
    setWsError(null)
    try {
      const updated = await updateWorkspace(ws.id, { name: wsName.trim() })
      const nextWs = { ...ws, ...updated }
      setWs(nextWs)
      setCurrentWorkspace(nextWs)
      setWsName(updated.name || wsName.trim())
      setWsSaved(true)
      setTimeout(() => setWsSaved(false), 1500)
    } catch (err) {
      setWsError(err.message || 'Could not save workspace name')
    } finally {
      setSavingWs(false)
    }
  }

  async function loadMembers() {
    if (!ws) return
    setMembersLoading(true)
    setTeamMsg(null)
    try {
      const rows = await getMembers(ws.id)
      setMembers(Array.isArray(rows) ? rows : [])
    } catch (err) {
      setTeamMsg({ type: 'error', text: err.message || 'Could not load members' })
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'team') loadMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function handleInvite(e) {
    e.preventDefault()
    if (!ws || !inviteEmail.trim()) return
    setTeamBusy(true)
    setTeamMsg(null)
    try {
      await addMember(ws.id, inviteEmail.trim())
      setInviteEmail('')
      setTeamMsg({ type: 'ok', text: 'Member added to workspace' })
      await loadMembers()
    } catch (err) {
      setTeamMsg({ type: 'error', text: err.message || 'Could not add member' })
    } finally {
      setTeamBusy(false)
    }
  }

  async function handleRoleSave() {
    if (!ws || !editingRole) return
    setTeamBusy(true)
    setTeamMsg(null)
    try {
      await updateMemberRole(ws.id, editingRole.userId, editingRole.role)
      setEditingRole(null)
      await loadMembers()
    } catch (err) {
      setTeamMsg({ type: 'error', text: err.message || 'Could not update role' })
    } finally {
      setTeamBusy(false)
    }
  }

  async function handleRemoveMember(m) {
    if (!ws || !window.confirm(`Remove ${m.full_name || m.username} from this workspace?`)) return
    setTeamBusy(true)
    setTeamMsg(null)
    try {
      await removeMember(ws.id, m.id)
      setTeamMsg({ type: 'ok', text: 'Member removed' })
      await loadMembers()
    } catch (err) {
      setTeamMsg({ type: 'error', text: err.message || 'Could not remove member' })
    } finally {
      setTeamBusy(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (!pwdCurrent || !pwdNext) {
      setPwdMsg({ type: 'error', text: 'Fill in both password fields' })
      return
    }
    if (pwdNext.length < 6) {
      setPwdMsg({ type: 'error', text: 'New password must be at least 6 characters' })
      return
    }
    if (pwdNext !== pwdConfirm) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match' })
      return
    }
    setPwdBusy(true)
    setPwdMsg(null)
    try {
      await changePassword(pwdCurrent, pwdNext)
      setPwdMsg({ type: 'ok', text: 'Password updated' })
      setPwdCurrent('')
      setPwdNext('')
      setPwdConfirm('')
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.message || 'Could not change password' })
    } finally {
      setPwdBusy(false)
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm('Delete your account permanently? This cannot be undone.')) return
    setDeleting(true)
    setDeleteMsg(null)
    try {
      await deleteAccount()
      clearSession()
    } catch (err) {
      setDeleteMsg(err.message || 'Could not delete account')
      setDeleting(false)
    }
  }

  return (
    <div className="settings-wrap">
      <aside className="settings-side">
        {NAV.map((group) => (
          <div key={group.group} className="settings-side-group">
            <div className="settings-side-head">{group.group}</div>
            {group.items.map((item) => {
              const Icon = item.Icon
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`settings-side-item${tab === item.key ? ' active' : ''}`}
                  onClick={() => setTab(item.key)}
                >
                  <Icon size={13} /> {item.label}
                </button>
              )
            })}
          </div>
        ))}
      </aside>

      <div className="settings-content">
        {tab === 'account' && (
          <>
            <div className="settings-card">
              <div className="settings-card-title">Account</div>
              <p className="settings-card-desc">Your sign-in details for Thoth.</p>
              <div className="settings-field" style={{ marginBottom: 0 }}>
                <label className="settings-label">Email used</label>
                <input className="settings-input" value={user?.email || ''} readOnly />
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-title">Password</div>
              <p className="settings-card-desc">Change the password you sign in with.</p>
              <form onSubmit={handleChangePassword}>
                <div className="settings-field">
                  <label className="settings-label">Current password</label>
                  <input className="settings-input" type="password" value={pwdCurrent} onChange={(e) => setPwdCurrent(e.target.value)} autoComplete="current-password" />
                </div>
                <div className="settings-field">
                  <label className="settings-label">New password</label>
                  <input className="settings-input" type="password" value={pwdNext} onChange={(e) => setPwdNext(e.target.value)} autoComplete="new-password" />
                </div>
                <div className="settings-field">
                  <label className="settings-label">Confirm new password</label>
                  <input className="settings-input" type="password" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} autoComplete="new-password" />
                </div>
                {pwdMsg && <div style={msgStyle(pwdMsg.type)}>{pwdMsg.text}</div>}
                <button type="submit" className="btn primary" disabled={pwdBusy} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {pwdBusy ? 'Saving…' : 'Change password'}
                </button>
              </form>
            </div>

            <div className="settings-card">
              <div className="settings-card-title">Sign out</div>
              <p className="settings-card-desc">End your current session on this device.</p>
              <button type="button" className="btn" onClick={clearSession} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <LogOut size={12} /> Log out
              </button>
            </div>

            <div className="settings-card" style={{ borderColor: 'rgba(255,64,64,0.35)' }}>
              <div className="settings-card-title" style={{ color: '#ff6b6b' }}>Delete account</div>
              <p className="settings-card-desc">Permanently delete your account and all associated data. This action cannot be undone.</p>
              {deleteMsg && <div style={msgStyle('error')}>{deleteMsg}</div>}
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{
                  background: 'rgba(255,64,64,0.12)', color: '#ff6b6b',
                  border: '1px solid rgba(255,64,64,0.45)', borderRadius: '4px',
                  padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px',
                }}
              >
                <Trash2 size={12} /> {deleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </>
        )}

        {tab === 'general' && (
          <div className="settings-card">
            <div className="settings-card-title">Workspace</div>
            <p className="settings-card-desc">Basic information about your current workspace.</p>
            <div className="settings-field">
              <label className="settings-label">Workspace name</label>
              <input className="settings-input" value={wsName} onChange={(e) => setWsName(e.target.value)} placeholder="My workspace" />
            </div>
            {wsError && <div style={msgStyle('error')}>{wsError}</div>}
            <button
              type="button"
              className="btn primary"
              onClick={handleSaveGeneral}
              disabled={savingWs}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={12} /> {savingWs ? 'Saving…' : wsSaved ? 'Saved' : 'Save changes'}
            </button>
          </div>
        )}

        {tab === 'appearance' && (
          <>
            <div className="settings-card">
              <div className="settings-card-title">Theme</div>
              <p className="settings-card-desc">Choose how Thoth looks across your devices.</p>
              <div className="settings-seg">
                <button type="button" className={`settings-seg-btn${settings.theme === 'light' ? ' active' : ''}`} onClick={() => save({ theme: 'light' })}>
                  <Sun size={13} /> Light
                </button>
                <button type="button" className={`settings-seg-btn${settings.theme === 'dark' ? ' active' : ''}`} onClick={() => save({ theme: 'dark' })}>
                  <Moon size={13} /> Dark
                </button>
                <button type="button" className={`settings-seg-btn${settings.theme === 'system' ? ' active' : ''}`} onClick={() => save({ theme: 'system' })}>
                  <Monitor size={13} /> System
                </button>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-title">Interface Font</div>
              <p className="settings-card-desc">Font used across the entire application.</p>
              <div className="settings-field" style={{ marginBottom: 0 }}>
                <select
                  className="settings-select"
                  value={settings.font}
                  onChange={(e) => save({ font: e.target.value })}
                  style={{ fontFamily: settings.font }}
                >
                  {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                </select>
                <div className="font-preview" style={{ fontFamily: settings.font }}>
                  The quick brown fox jumps over the lazy dog. 1234567890
                </div>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-title">Layout</div>
              <p className="settings-card-desc">Tune the density of the interface.</p>
              <div className="settings-row">
                <div className="settings-row-info">
                  <h4>Compact mode</h4>
                  <p>Reduce spacing and row heights to fit more on screen.</p>
                </div>
                <Toggle
                  label="Compact mode"
                  checked={settings.compact}
                  onChange={(v) => save({ compact: v })}
                />
              </div>
            </div>
          </>
        )}

        {tab === 'team' && (
          <div className="settings-card">
            <div className="settings-card-title">Team & Members</div>
            <p className="settings-card-desc">
              Manage who has access to the {ws?.name || 'current'} workspace.
            </p>
            {teamMsg && <div style={msgStyle(teamMsg.type)}>{teamMsg.text}</div>}

            <form onSubmit={handleInvite} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                className="settings-input"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="member@email.com"
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn primary" disabled={teamBusy} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                <UserPlus size={12} /> Add
              </button>
            </form>

            {membersLoading ? (
              <div style={{ color: 'var(--muted2)', fontSize: '11px' }}>Loading members…</div>
            ) : members.length === 0 ? (
              <div style={{ color: 'var(--muted2)', fontSize: '11px' }}>No members found.</div>
            ) : members.map((m) => {
              const editing = editingRole?.userId === m.id
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderTop: '1px solid var(--border-soft)' }}>
                  <span className="avatar">{(m.full_name || m.username || '?').slice(0, 2).toUpperCase()}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.full_name || m.username}{isSelf(m.id) && ' (you)'}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--muted2)' }}>{m.email}</div>
                  </div>
                  <select
                    className="settings-select"
                    style={{ width: '100px' }}
                    value={editing ? editingRole.role : m.role}
                    onChange={(e) => setEditingRole({ userId: m.id, role: e.target.value })}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {editing ? (
                    <span style={{ display: 'flex', gap: '4px' }}>
                      <button className="icon-btn" title="Save role" onClick={handleRoleSave}><Check size={12} /></button>
                      <button className="icon-btn" title="Cancel" onClick={() => setEditingRole(null)}><X size={12} /></button>
                    </span>
                  ) : (
                    <button
                      className="icon-btn"
                      title={isSelf(m.id) ? 'You cannot remove yourself' : 'Remove member'}
                      disabled={isSelf(m.id)}
                      onClick={() => handleRemoveMember(m)}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'notifications' && (
          <div className="settings-card">
            <div className="settings-card-title">Notifications</div>
            <p className="settings-card-desc">Choose which events trigger a notification.</p>
            {[
              { key: 'assigned', title: 'Task assigned to me', desc: 'When you are assigned to a task.' },
              { key: 'comments', title: 'New comments', desc: 'When someone comments on an item you follow.' },
              { key: 'dueSoon', title: 'Due soon', desc: 'Tasks and bugs approaching their due date.' },
              { key: 'weekly', title: 'Weekly digest', desc: 'A summary of the week’s activity every Monday.' },
            ].map((row) => (
              <div className="settings-row" key={row.key}>
                <div className="settings-row-info">
                  <h4>{row.title}</h4>
                  <p>{row.desc}</p>
                </div>
                <Toggle
                  label={row.title}
                  checked={notifs[row.key]}
                  onChange={(v) => setNotifs((cur) => ({ ...cur, [row.key]: v }))}
                />
              </div>
            ))}
          </div>
        )}

        {tab === 'storage' && (
          <div className="settings-card">
            <div className="settings-card-title">Data & Storage</div>
            <p className="settings-card-desc">Thoth is local-first. Your data lives in Postgres and stays on your machines.</p>
            <div className="settings-row">
              <div className="settings-row-info">
                <h4>Export workspace data</h4>
                <p>Download all tasks, bugs, notes and milestones as JSON.</p>
              </div>
              <button type="button" className="btn" onClick={() => window.alert('Export coming soon.')}>Export</button>
            </div>
            <div className="settings-row">
              <div className="settings-row-info">
                <h4>Clear local preferences</h4>
                <p>Reset theme, fonts and other stored settings to defaults.</p>
              </div>
              <button
                type="button"
                className="btn"
                style={{ color: '#ff6b6b', borderColor: 'rgba(255,64,64,.4)' }}
                onClick={() => {
                  saveSettings({ theme: 'dark', font: 'Inter', compact: false })
                  setSettings(getSettings())
                }}
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {tab === 'about' && (
          <div className="settings-card">
            <div className="settings-card-title">About Thoth</div>
            <p className="settings-card-desc">Thoth is a local-first project manager memory app backed by PostgreSQL.</p>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {[
                ['Version', '1.0.0'],
                ['Mode', 'Local-first'],
                ['Backend', 'PostgreSQL'],
                ['Frontend', 'React + Tailwind'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="settings-label" style={{ marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}