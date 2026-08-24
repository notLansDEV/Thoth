import { useEffect, useState } from 'react'
import { FolderKanban, CircleDot, CircleCheckBig, PauseCircle, TriangleAlert, Eye, Pencil, ArrowLeft } from 'lucide-react'
import {
  getProjects,
  PROJECT_STATUSES,
} from '../features/projects/projects.service.js'
import {
  getTasks,
  getMilestones,
  getWorkspaceMembers,
  getStages,
  TASK_PRIORITIES,
} from '../features/tasks/tasks.service.js'
import { getCurrentWorkspace } from '../features/workspaces/workspaces.service.js'
import EditProjectModal from '../features/projects/components/EditProjectModal.jsx'

function fmtDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

function StatBlock({ icon, label, value, color = '#f1f1f1' }) {
  return (
    <div style={{ flex: '1 1 120px', textAlign: 'center', padding: '4px 8px', borderRight: '1px solid #242424', minWidth: '110px' }}>
      <div style={{ fontSize: '9px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
        <span style={{ display: 'inline-flex' }}>{icon}</span> {label}
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

/* Semi-circular SVG gauge */
function ArcGauge({ percent, label }) {
  const r = 70
  const cx = 90
  const cy = 92
  const len = Math.PI * r
  const p = Math.max(0, Math.min(100, percent)) / 100
  return (
    <svg viewBox="0 0 180 108" style={{ width: '170px', display: 'block', margin: '0 auto' }}>
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#292929" strokeWidth="14" strokeLinecap="round"
      />
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#a14cff" strokeWidth="14" strokeLinecap="round"
        strokeDasharray={`${p * len} ${len}`}
      />
      <text x={cx} y={cy - 8} textAnchor="middle" fill="#f1f1f1" fontSize="20" fontWeight="700">
        {Math.round(percent)}%
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#666" fontSize="9">
        {label}
      </text>
    </svg>
  )
}

/* Donut chart */
function Donut({ segments, total, size = 150, stroke = 24 }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const arcs = []
  let acc = 0
  for (const s of segments) {
    if (s.value <= 0) continue
    const lenV = Math.max((s.value / total) * c - 1.5, 0.5)
    arcs.push({ label: s.label, color: s.color, lenV, offset: acc })
    acc += lenV
  }
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#222" strokeWidth={stroke} />
      {arcs.map((a) => (
        <circle
          key={a.label}
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={a.color} strokeWidth={stroke}
          strokeDasharray={`${a.lenV} ${c - a.lenV}`}
          strokeDashoffset={-a.offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ))}
    </svg>
  )
}

export default function Reports() {
  const ws = getCurrentWorkspace()
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [membersCount, setMembersCount] = useState(0)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [p, t] = await Promise.all([
          getProjects(ws?.id),
          getTasks(ws?.id).catch(() => []),
        ])
        if (!alive) return
        setProjects(p)
        setTasks(t)
        getWorkspaceMembers(ws?.id)
          .then((m) => { if (alive) setMembersCount(m.length) })
          .catch(() => {})
      } catch {
        /* noop */
      }
    }
    load()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (selected) {
    return (
      <ReportDetail
        key={refreshKey}
        project={projects.find((p) => p.id === selected) || selected}
        tasksAll={tasks}
        membersCount={membersCount}
        onBack={() => setSelected(null)}
      />
    )
  }

  const filtered = projects.filter((p) =>
    !search.trim() ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const statusCount = (s) => projects.filter((p) => p.status === s).length
  const highPriority = projects.filter((p) => p.priority === 'high').length

  function progressOf(project) {
    const pt = tasks.filter((t) => t.project_id === project.id)
    if (pt.length === 0) return 0
    return Math.round((pt.filter((t) => t.status === 'Done').length / pt.length) * 100)
  }

  function membersOf(project) {
    const names = new Set()
    for (const t of tasks) {
      if (t.project_id === project.id && t.assignee_name) names.add(t.assignee_name)
    }
    return Array.from(names)
  }

  async function handleUpdated() {
    setEditing(null)
    setRefreshKey((k) => k + 1)
    try {
      const fresh = await getProjects(ws?.id)
      setProjects(fresh)
    } catch { /* keep old */ }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Project Reports</h1>
          <p className="page-subtitle">Overview of all projects in this workspace</p>
        </div>
      </div>

      {/* Summary card */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '10px', padding: '12px 6px' }}>
        <StatBlock icon={<FolderKanban size={12} />} label="Total projects" value={projects.length} />
        <StatBlock icon={<CircleDot size={12} />} label="Active" value={statusCount('active')} color="#20d96b" />
        <StatBlock icon={<CircleCheckBig size={12} />} label="Completed" value={statusCount('completed')} color="#7165ff" />
        <StatBlock icon={<PauseCircle size={12} />} label="On hold" value={statusCount('on_hold')} color="#ff7918" />
        <StatBlock icon={<TriangleAlert size={12} />} label="High priority" value={highPriority} color="#ff4040" style={{ borderRight: 0 }} />
      </div>

      {/* Search */}
      <input
        type="text"
        className="search-input"
        placeholder="Search projects…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: '10px' }}
      />

      {/* Projects table */}
      {filtered.length === 0 ? (
        <div style={{
          border: '1px dashed #2a2a2a', borderRadius: '4px', padding: '36px',
          textAlign: 'center', color: '#555', fontSize: '11px',
        }}>
          {projects.length === 0 ? 'No projects yet.' : 'No projects match your search.'}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Start date</th>
                <th>Due date</th>
                <th>Members</th>
                <th style={{ minWidth: '110px' }}>Progress</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => {
                const mems = membersOf(project)
                const prog = progressOf(project)
                const isActive = project.status === 'active'
                const statusMeta = PROJECT_STATUSES.find((s) => s.value === project.status)
                return (
                  <tr key={project.id}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span className="dot" style={{ background: project.color || '#6e61ff' }} />
                        <span style={{ color: '#eee', fontWeight: 600 }}>{project.name}</span>
                      </span>
                    </td>
                    <td>{fmtDate(project.start_date)}</td>
                    <td>{fmtDate(project.deadline)}</td>
                    <td>
                      {mems.length === 0 ? (
                        <span style={{ color: '#555' }}>—</span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          {mems.slice(0, 3).map((n, i) => (
                            <span
                              key={n}
                              className="avatar"
                              title={n}
                              style={{ width: '21px', height: '21px', fontSize: '8px', marginLeft: i > 0 ? '-6px' : 0, border: '1px solid #151515' }}
                            >
                              {n.slice(0, 2).toUpperCase()}
                            </span>
                          ))}
                          {mems.length > 3 && (
                            <span style={{ fontSize: '9px', color: '#777', marginLeft: '4px' }}>+{mems.length - 3}</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div className="progress" style={{ flex: 1 }}>
                          <span style={{ width: `${prog}%` }} />
                        </div>
                        <span style={{ fontSize: '9.5px', color: '#777', width: '28px' }}>{prog}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge${isActive ? '' : ' paused'}`}>
                        {isActive ? 'Active' : (statusMeta?.label || project.status)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="icon-btn" title="View report" onClick={() => setSelected(project.id)}><Eye size={12} /></button>{' '}
                      <button className="icon-btn" title="Edit project" onClick={() => setEditing(project)} style={{ marginLeft: '4px' }}><Pencil size={12} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditProjectModal
          project={editing}
          onSaved={handleUpdated}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

/* ---------------- Detail screen ---------------- */

function ReportDetail({ project, tasksAll, membersCount, onBack }) {
  const [milestones, setMilestones] = useState([])
  const [stages, setStages] = useState([])

  const tasks = tasksAll.filter((t) => t.project_id === project.id)

  useEffect(() => {
    let alive = true
    getMilestones(project.id)
      .then((ms) => { if (alive) setMilestones(ms) })
      .catch(() => {})
    getStages(getCurrentWorkspace()?.id)
      .then((s) => {
        if (!alive) return
        setStages(s.length > 0 ? s : [
          { name: 'To Do', color: '#6e61ff' },
          { name: 'In Progress', color: '#ff7918' },
          { name: 'Review', color: '#a14cff' },
          { name: 'Done', color: '#20d96b' },
        ])
      })
      .catch(() => {})
    return () => { alive = false }
  }, [project.id])

  const done = tasks.filter((t) => t.status === 'Done').length
  const progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0

  // Per-user rows
  const userRows = []
  const seen = new Set()
  for (const t of tasks) {
    if (!t.assignee_name || seen.has(t.assignee_name)) continue
    seen.add(t.assignee_name)
    userRows.push({
      name: t.assignee_name,
      assigned: tasks.filter((x) => x.assignee_name === t.assignee_name).length,
      done: tasks.filter((x) => x.assignee_name === t.assignee_name && x.status === 'Done').length,
    })
  }

  // Milestone avg progress
  const avgMilestone = milestones.length > 0
    ? Math.round(milestones.reduce((sum, m) => sum + (Number(m.progress) || 0), 0) / milestones.length)
    : null

  // Priority distribution
  const prioCounts = TASK_PRIORITIES.map((p) => ({
    ...p,
    count: tasks.filter((t) => (t.priority || 'medium') === p.value).length,
  }))
  const maxPrio = Math.max(...prioCounts.map((p) => p.count), 1)

  // Stage pie
  const stageSegments = stages.map((s) => ({
    label: s.name,
    color: s.color,
    value: tasks.filter((t) => (t.status || '') === s.name).length,
  }))
  const stagedTotal = stageSegments.reduce((sum, s) => sum + s.value, 0)
  const unstaged = tasks.length - stagedTotal
  if (unstaged > 0) stageSegments.push({ label: 'Other', color: '#444', value: unstaged })

  const statusMeta = PROJECT_STATUSES.find((s) => s.value === project.status)

  return (
    <div>
      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="collapse-btn" onClick={onBack} title="Back to reports" style={{ width: '27px', height: '27px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={13} /></button>
          <div>
            <h1 className="page-title">{project.name} — Report</h1>
            <span className={`badge${project.status === 'active' ? '' : ' paused'}`}>
              {project.status === 'active' ? 'Active' : (statusMeta?.label || project.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Row 1: three cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card">
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '9px' }}>Overview</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#eee', marginBottom: '7px' }}>{project.name}</div>
          <Row k="Status" v={statusMeta?.label || project.status} />
          <Row k="Start — Due" v={`${fmtDate(project.start_date)} — ${fmtDate(project.deadline)}`} />
          <Row k="Total members" v={membersCount} />
        </div>

        <div className="card">
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Milestones</div>
          {avgMilestone === null ? (
            <div style={{ textAlign: 'center', color: '#555', fontSize: '11px', padding: '18px 0' }}>
              No milestones yet
            </div>
          ) : (
            <>
              <ArcGauge percent={avgMilestone} label={`${milestones.length} milestone${milestones.length === 1 ? '' : 's'}`} />
              <div style={{ fontSize: '9.5px', color: '#777', textAlign: 'center', marginTop: '2px' }}>
                Average milestone completion
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '9px' }}>Task priority</div>
          {prioCounts.map((p) => (
            <div key={p.value} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
              <span style={{ fontSize: '10px', color: p.color, width: '48px', fontWeight: 600 }}>{p.label}</span>
              <div className="progress" style={{ flex: 1 }}>
                <span style={{ width: `${(p.count / maxPrio) * 100}%`, background: p.color }} />
              </div>
              <span style={{ fontSize: '10px', color: '#999', width: '16px', textAlign: 'right' }}>{p.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: pie */}
      <div className="card" style={{ marginTop: '10px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '9px' }}>
          Task status
        </div>
        {tasks.length === 0 ? (
          <div style={{ color: '#555', fontSize: '11px', padding: '10px 0' }}>No tasks in this project.</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
            <Donut segments={stageSegments} total={tasks.length} />
            <div>
              {stageSegments.map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                  <span className="dot" style={{ background: s.color }} />
                  <span style={{ fontSize: '11px', color: '#bbb' }}>{s.label}</span>
                  <span style={{ fontSize: '11px', color: '#666' }}>
                    ({tasks.length > 0 ? Math.round((s.value / tasks.length) * 100) : 0}%)
                  </span>
                </div>
              ))}
              <div style={{ fontSize: '10px', color: '#666', marginTop: '7px' }}>
                Overall progress: <strong style={{ color: '#ddd' }}>{progress}%</strong> ({done}/{tasks.length} done)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Row 3: users left, milestones right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', margin: '10px 0' }}>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '11px 12px 0', fontSize: '10px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Users
          </div>
          {userRows.length === 0 ? (
            <div style={{ padding: '14px 12px', color: '#555', fontSize: '11px' }}>No assigned tasks yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Assigned</th><th>Done</th></tr>
              </thead>
              <tbody>
                {userRows.map((u) => (
                  <tr key={u.name}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                        <span className="avatar" style={{ width: '20px', height: '20px', fontSize: '8px' }}>
                          {u.name.slice(0, 2).toUpperCase()}
                        </span>
                        {u.name}
                      </span>
                    </td>
                    <td>{u.assigned}</td>
                    <td>{u.done}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '11px 12px 0', fontSize: '10px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Milestones
          </div>
          {milestones.length === 0 ? (
            <div style={{ padding: '14px 12px', color: '#555', fontSize: '11px' }}>No milestones yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Name</th><th style={{ minWidth: '80px' }}>Progress</th><th>Status</th><th>Due</th></tr>
              </thead>
              <tbody>
                {milestones.map((m) => (
                  <tr key={m.id}>
                    <td style={{ color: '#ddd', fontWeight: 600 }}>{m.name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div className="progress"><span style={{ width: `${Number(m.progress) || 0}%` }} /></div>
                        <span style={{ fontSize: '9px', color: '#777' }}>{Number(m.progress) || 0}%</span>
                      </div>
                    </td>
                    <td><span className="badge paused">{m.status || 'planned'}</span></td>
                    <td>{fmtDate(m.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Row 4: task list */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '11px 12px 0', fontSize: '10px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Task list
        </div>
        {tasks.length === 0 ? (
          <div style={{ padding: '14px 12px', color: '#555', fontSize: '11px' }}>No tasks in this project.</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Title</th><th>Assignee</th><th>Stage</th><th>Priority</th><th>Due</th><th style={{ minWidth: '90px' }}>Progress</th></tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const stageMeta = stages.find((s) => s.name === t.status)
                return (
                  <tr key={t.id}>
                    <td style={{ color: '#ddd', fontWeight: 600 }}>{t.title}</td>
                    <td>{t.assignee_name || '—'}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span className="dot" style={{ background: stageMeta?.color || '#555', width: 6, height: 6 }} />
                        {t.status || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'transparent', fontSize: '9px', color: '#999', border: '1px solid #333' }}>
                        {t.priority || 'medium'}
                      </span>
                    </td>
                    <td>{fmtDate(t.due_date)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div className="progress"><span style={{ width: `${Number(t.progress) || 0}%` }} /></div>
                        <span style={{ fontSize: '9px', color: '#777' }}>{Number(t.progress) || 0}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '11px', padding: '3px 0' }}>
      <span style={{ color: '#666' }}>{k}</span>
      <span style={{ color: '#ccc', textAlign: 'right' }}>{v}</span>
    </div>
  )
}
