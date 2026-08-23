import { useEffect, useState } from 'react'
import {
  PROJECT_STATUSES,
  PROJECT_PRIORITIES,
  getProject,
  getProjectBugs,
} from '../projects.service.js'
import { getTasks, TASK_STAGES, getMilestones, getWorkspaceMembers } from '../../tasks/tasks.service.js'

const TABS = ['Overview', 'Team', 'Milestone', 'Task', 'Bugs', 'Attachments', 'Activity', 'Notes']

const labelStyle = {
  display: 'block',
  marginBottom: '5px',
  fontSize: '10px',
  fontWeight: '700',
  color: '#777',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

function fmtDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

function StatCard({ icon, label, value }) {
  return (
    <div className="card" style={{ padding: '12px' }}>
      <div style={{ fontSize: '9px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: '#f1f1f1' }}>{value}</div>
    </div>
  )
}

export default function ProjectDetail({ projectId, onClose }) {
  const [tab, setTab] = useState('Overview')
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [bugs, setBugs] = useState([])
  const [members, setMembers] = useState([])
  const [milestones, setMilestones] = useState([])

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const p = await getProject(projectId)
        if (!alive) return
        setProject(p)

        const [t, b, m, ms] = await Promise.all([
          getTasks(p.workspace_id),
          getProjectBugs(projectId),
          getWorkspaceMembers(p.workspace_id),
          getMilestones(projectId).catch(() => []),
        ])
        if (!alive) return
        setTasks(t.filter((x) => x.project_id === projectId))
        setBugs(b)
        setMembers(m)
        setMilestones(ms)
      } catch {
        /* leave states empty */
      }
    }

    load()
    return () => { alive = false }
  }, [projectId])

  if (!project) {
    return (
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050,
      }}>
        <div className="card" style={{ padding: '20px', fontSize: '12px', color: '#777' }} onClick={(e) => e.stopPropagation()}>
          Loading project…
        </div>
      </div>
    )
  }

  const statusMeta = PROJECT_STATUSES.find((s) => s.value === project.status)
  const priorityMeta = PROJECT_PRIORITIES.find((p) => p.value === project.priority)
  const stats = project.stats || {}
  const totalTasks = Number(stats.total_tasks) || 0
  const doneTasks = Number(stats.completed_tasks) || 0
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const overdue =
    project.deadline && !['completed', 'cancelled'].includes(project.status) &&
    new Date(project.deadline) < new Date()

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '20px',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#151515', border: '1px solid #292929', borderRadius: '6px',
        width: '100%', maxWidth: '820px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 25px rgba(0,0,0,0.4)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
          <div>
            <h2 style={{ margin: '0 0 5px', fontSize: '17px', fontWeight: 700, color: '#f1f1f1' }}>{project.name}</h2>
            <div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
              <span className="badge" style={{
                color: statusMeta?.color || '#777', background: 'transparent',
                border: `1px solid ${statusMeta?.color || '#777'}55`,
              }}>{statusMeta?.label || project.status}</span>
              <span className="badge" style={{
                color: priorityMeta?.color || '#777', background: 'transparent',
                border: `1px solid ${priorityMeta?.color || '#777'}55`,
              }}>{priorityMeta?.label || project.priority || 'Medium'} priority</span>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            background: 'transparent', border: 0, color: '#666', cursor: 'pointer',
            fontSize: '16px', lineHeight: 1,
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 20px 20px', overflowY: 'auto' }}>
          {/* 4 stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '9px', marginBottom: '12px' }}>
            <StatCard icon="👥" label="Team members" value={project.members_count ?? 0} />
            <StatCard icon="⏰" label="Deadline" value={fmtDate(project.deadline)} />
            <StatCard icon="✅" label="Task done" value={`${doneTasks}/${totalTasks}`} />
            <StatCard icon="🐞" label="Bugs" value={Number(stats.total_bugs) || 0} />
          </div>

          {/* Overall progress */}
          <div className="card" style={{ padding: '12px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#888', marginBottom: '6px' }}>
              <span>Overall progress</span>
              <span>{progress}%</span>
            </div>
            <div className="progress"><span style={{ width: `${progress}%` }} /></div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #292929', marginBottom: '13px', flexWrap: 'wrap' }}>
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '7px 11px', fontSize: '11px', fontWeight: 600, fontFamily: 'inherit',
                  background: 'transparent', border: 0, cursor: 'pointer',
                  color: tab === t ? '#fff' : '#777',
                  borderBottom: tab === t ? '2px solid #695df0' : '2px solid transparent',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'Overview' && (
            <div>
              <label style={labelStyle}>Description</label>
              <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#bbb', lineHeight: 1.55 }}>
                {project.description || 'No description yet.'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Start date</label>
                  <div style={{ fontSize: '12px', color: '#ddd' }}>{fmtDate(project.start_date)}</div>
                </div>
                <div>
                  <label style={labelStyle}>Deadline</label>
                  <div style={{ fontSize: '12px', color: overdue ? '#ff4040' : '#ddd' }}>
                    {fmtDate(project.deadline)}{overdue ? ' (overdue)' : ''}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <div style={{ fontSize: '12px', color: '#ddd' }}>{statusMeta?.label || project.status}</div>
                </div>
                <div>
                  <label style={labelStyle}>Priority</label>
                  <div style={{ fontSize: '12px', color: priorityMeta?.color || '#ddd' }}>
                    {priorityMeta?.label || project.priority}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'Team' && (
            members.length === 0 ? <Empty text="No team members in this workspace yet." /> : (
              members.map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 0', borderBottom: '1px solid #222' }}>
                  <span className="avatar">{(m.full_name || m.username || '?').slice(0, 2).toUpperCase()}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: '#ddd', fontWeight: 600 }}>{m.full_name || m.username}</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>{m.email}</div>
                  </div>
                  {m.role && <span className="badge paused">{m.role}</span>}
                </div>
              ))
            )
          )}

          {tab === 'Milestone' && (
            milestones.length === 0 ? <Empty text="No milestones yet." /> : (
              milestones.map((ms) => (
                <div key={ms.id} className="card" style={{ marginBottom: '8px' }}>
                  <div className="name">{ms.name}</div>
                  {ms.description && <div className="description">{ms.description}</div>}
                  <div className="meta">
                    {ms.due_date && <div className="meta-item">⏰ Due {fmtDate(ms.due_date)}</div>}
                    <div className="meta-item">◈ {ms.status || 'planned'}</div>
                  </div>
                </div>
              ))
            )
          )}

          {tab === 'Task' && (
            tasks.length === 0 ? <Empty text="No tasks in this project yet." /> : (
              tasks.map((t) => {
                const stage = TASK_STAGES.find((s) => s.value === (t.status || 'todo'))
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 0', borderBottom: '1px solid #222' }}>
                    <span className="dot" style={{ background: stage?.color || '#555' }} />
                    <div style={{ flex: 1, fontSize: '12px', color: '#ddd' }}>{t.title}</div>
                    <span style={{ fontSize: '10px', color: '#666' }}>{stage?.label}</span>
                    <span style={{ fontSize: '10px', color: '#555' }}>{t.progress || 0}%</span>
                  </div>
                )
              })
            )
          )}

          {tab === 'Bugs' && (
            bugs.length === 0 ? <Empty text="No bugs reported for this project." /> : (
              bugs.map((b) => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 0', borderBottom: '1px solid #222' }}>
                  <div style={{ flex: 1, fontSize: '12px', color: '#ddd' }}>
                    {b.bug_id ? `${b.bug_id} — ` : ''}{b.title}
                  </div>
                  <span className="badge paused">{b.priority || 'medium'}</span>
                  <span className="badge paused">{b.status || 'new'}</span>
                </div>
              ))
            )
          )}

          {tab === 'Attachments' && <Empty text="File attachments coming soon." />}
          {tab === 'Activity' && <Empty text="No recent activity recorded." />}
          {tab === 'Notes' && <Empty text="No notes yet." />}
        </div>
      </div>
    </div>
  )
}

function Empty({ text }) {
  return (
    <div style={{
      border: '1px dashed #2a2a2a', borderRadius: '4px', padding: '22px',
      textAlign: 'center', color: '#555', fontSize: '11px',
    }}>
      {text}
    </div>
  )
}
