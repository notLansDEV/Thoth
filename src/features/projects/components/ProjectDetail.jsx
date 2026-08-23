import { useEffect, useState } from 'react'
import {
  PROJECT_STATUSES,
  PROJECT_PRIORITIES,
  getProject,
  getProjectBugs,
} from '../projects.service.js'
import { getTasks, TASK_STAGES, getMilestones, getWorkspaceMembers, priorityStyle } from '../../tasks/tasks.service.js'

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

export default function ProjectDetail({ projectId, onBack }) {
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
      <div className="card" style={{ padding: '20px', fontSize: '12px', color: '#777' }}>
        Loading project…
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
    <div>
      {/* Screen header */}
      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="collapse-btn"
            onClick={onBack}
            title="Back to projects"
            aria-label="Back to projects"
            style={{ width: '27px', height: '27px', fontSize: '13px' }}
          >←</button>
          <div>
            <h1 className="page-title">{project.name}</h1>
            <div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
              <span className="badge" style={{
                color: statusMeta?.color || '#777', background: 'transparent',
                border: `1px solid ${statusMeta?.color || '#777'}55`,
              }}>{statusMeta?.label || project.status}</span>
              <span className="badge" style={{
                color: priorityMeta?.color || '#777', background: 'transparent',
                border: `1px solid ${priorityMeta?.color || '#777'}55`,
              }}>{priorityMeta?.label || project.priority || 'Medium'} priority</span>
              {overdue && <span className="badge" style={{ color: '#ff4040', background: 'transparent', border: '1px solid rgba(255,64,64,0.4)' }}>Overdue</span>}
            </div>
          </div>
        </div>
      </div>

      {/* 4 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '9px', marginBottom: '10px' }}>
        <StatCard icon="👥" label="Team members" value={project.members_count ?? 0} />
        <StatCard icon="⏰" label="Deadline" value={fmtDate(project.deadline)} />
        <StatCard icon="✅" label="Task done" value={`${doneTasks}/${totalTasks}`} />
        <StatCard icon="🐞" label="Bugs" value={Number(stats.total_bugs) || 0} />
      </div>

      {/* Overall progress */}
      <div className="card" style={{ padding: '12px', marginBottom: '10px' }}>
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
        <div className="card">
          <label style={labelStyle}>Description</label>
          <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#bbb', lineHeight: 1.55 }}>
            {project.description || 'No description yet.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
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
          <div className="card">
            {members.map((m) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 0', borderBottom: '1px solid #222' }}>
                <span className="avatar">{(m.full_name || m.username || '?').slice(0, 2).toUpperCase()}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#ddd', fontWeight: 600 }}>{m.full_name || m.username}</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>{m.email}</div>
                </div>
                {m.role && <span className="badge paused">{m.role}</span>}
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'Milestone' && (
        milestones.length === 0 ? <Empty text="No milestones yet." /> : (
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((ms) => (
                  <tr key={ms.id}>
                    <td style={{ color: '#ddd', fontWeight: 600 }}>{ms.name}</td>
                    <td style={{ color: '#888', maxWidth: '320px' }}>{ms.description || '—'}</td>
                    <td>{fmtDate(ms.due_date)}</td>
                    <td><span className="badge paused">{ms.status || 'planned'}</span></td>
                    <td style={{ minWidth: '110px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div className="progress" style={{ flex: 1 }}><span style={{ width: `${Number(ms.progress) || 0}%` }} /></div>
                        <span style={{ fontSize: '10px', color: '#666' }}>{Number(ms.progress) || 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'Task' && (
        <>
          <div className="stat-grid">
            <StatCard icon="☑" label="Total Current Task" value={tasks.length} />
            <StatCard icon="◐" label="Total Current In Progress" value={tasks.filter((t) => t.status === 'In Progress').length} />
            <StatCard icon="○" label="Total Current Pending" value={tasks.filter((t) => !t.status || t.status === 'To Do').length} />
            <StatCard icon="✔" label="Total Current Done" value={tasks.filter((t) => t.status === 'Done').length} />
          </div>

          {tasks.length === 0 ? <Empty text="No tasks in this project yet." /> : (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Title</th>
                    <th>Assignee</th>
                    <th>Stage</th>
                    <th>Priority</th>
                    <th>Due</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {[...tasks]
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .map((t) => {
                      const stage = TASK_STAGES.find((s) => s.value === (t.status || 'To Do'))
                      return (
                        <tr key={t.id}>
                          <td style={{ color: '#888', fontFamily: 'monospace', fontSize: '10.5px' }}>{t.task_code || '—'}</td>
                          <td style={{ color: '#ddd', fontWeight: 600 }}>{t.title}</td>
                          <td>{t.assignee_name || 'Unassigned'}</td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#ccc' }}>
                              <span className="dot" style={{ background: stage?.color || '#555' }} />
                              {t.status || 'To Do'}
                            </span>
                          </td>
                          <td>
                            <span className="badge" style={{ ...priorityStyle(t.priority), background: 'transparent', fontSize: '9px' }}>
                              {t.priority || 'medium'}
                            </span>
                          </td>
                          <td>{fmtDate(t.due_date)}</td>
                          <td style={{ minWidth: '90px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                              <div className="progress" style={{ flex: 1 }}><span style={{ width: `${Number(t.progress) || 0}%` }} /></div>
                              <span style={{ fontSize: '10px', color: '#666' }}>{Number(t.progress) || 0}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'Bugs' && (
        bugs.length === 0 ? <Empty text="No bugs reported for this project." /> : (
          <div className="card">
            {bugs.map((b) => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 0', borderBottom: '1px solid #222' }}>
                <div style={{ flex: 1, fontSize: '12px', color: '#ddd' }}>
                  {b.bug_id ? `${b.bug_id} — ` : ''}{b.title}
                </div>
                <span className="badge paused">{b.priority || 'medium'}</span>
                <span className="badge paused">{b.kanban_column || b.status || 'New'}</span>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'Attachments' && <Empty text="File attachments coming soon." />}
      {tab === 'Activity' && <Empty text="No recent activity recorded." />}
      {tab === 'Notes' && <Empty text="No notes yet." />}
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
