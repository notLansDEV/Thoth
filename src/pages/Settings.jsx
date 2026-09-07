import { useEffect, useState } from 'react'
import {
  Settings2, Palette, Users, Bell, Database, Info, Monitor, Moon, Sun, Save, Boxes,
} from 'lucide-react'
import { getSettings, saveSettings } from '../features/settings/settings.service.js'
import { getCurrentWorkspace } from '../features/workspaces/workspaces.service.js'

const FONTS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Source Sans 3', 'JetBrains Mono']

const NAV = [
  {
    group: 'Configuration',
    items: [
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

export default function Settings() {
  const ws = getCurrentWorkspace()
  const [tab, setTab] = useState('general')
  const [settings, setSettings] = useState(getSettings())

  // General
  const [wsName, setWsName] = useState(ws?.name || '')
  const [homepage, setHomepage] = useState('dashboard')
  const [saved, setSaved] = useState(false)

  // Notifications
  const [notifs, setNotifs] = useState({ assigned: true, comments: true, dueSoon: true, weekly: false })

  function save(patch) {
    const next = saveSettings(patch)
    setSettings(next)
  }

  function onSaveGeneral() {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
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
        {tab === 'general' && (
          <>
            <div className="settings-card">
              <div className="settings-card-title">Workspace</div>
              <p className="settings-card-desc">Basic information about your current workspace.</p>
              <div className="settings-field">
                <label className="settings-label">Workspace name</label>
                <input className="settings-input" value={wsName} onChange={(e) => setWsName(e.target.value)} placeholder="My workspace" />
              </div>
              <div className="settings-field">
                <label className="settings-label">Default homepage</label>
                <select className="settings-select" value={homepage} onChange={(e) => setHomepage(e.target.value)}>
                  <option value="dashboard">Dashboard</option>
                  <option value="tasks">Tasks</option>
                  <option value="bugs">Bugs</option>
                  <option value="calendar">Calendar</option>
                  <option value="markdown">Markdown</option>
                </select>
              </div>
              <button type="button" className="btn primary" onClick={onSaveGeneral} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Save size={12} /> {saved ? 'Saved' : 'Save changes'}
              </button>
            </div>
          </>
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
              Manage who has access to the {ws?.name || 'current'} workspace. Members, roles and permissions are configured from the Workspace page.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#777', fontSize: '11px' }}>
              <Boxes size={13} /> Open the Workspaces page to invite and manage members.
            </div>
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
                  <div style={{ fontSize: '12px', color: '#ddd' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
