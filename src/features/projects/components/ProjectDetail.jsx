import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Users, Clock, CheckCircle2, Bug as BugIcon, ListChecks, CircleDashed, CircleDot, XCircle, ArrowLeft } from 'lucide-react'
import {
  PROJECT_STATUSES,
  PROJECT_PRIORITIES,
  getProject,
  getProjectBugs,
} from '../projects.service.js'
import { getTasks, TASK_STAGES, getMilestones, getWorkspaceMembers, priorityStyle } from '../../tasks/tasks.service.js'
import { deleteMilestone } from '../../milestones/milestones.service.js'
import { getActivity, describeActivity, actorName } from '../../activity/activity.service.js'
import CreateMilestoneModal from './CreateMilestoneModal.jsx'
import AttachmentsTab from './AttachmentsTab.jsx'
import ListToolbar from '../../../components/ListToolbar.jsx'
import ConfirmModal from '../../../components/ConfirmModal.jsx'

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
      <div style={{ fontSize: '9px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ display: 'inline-flex' }}>{icon}</span> {label}
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
  const [activities, setActivities] = useState([])
  const [showNewMilestone, setShowNewMilestone] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState(null)
  const [confirmDeleteMs, setConfirmDeleteMs] = useState(null)
  const [deletingMs, setDeletingMs] = useState(false)
  const [activityQuery, setActivityQuery] = useState('')
  const [activityFilter, setActivityFilter] = useState('all')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const p = await getProject(projectId)
        if (!alive) return
        setProject(p)

        const [t, b, m, ms, acts] = await Promise.all([
          getTasks(p.workspace_id),
          getProjectBugs(projectId),
          getWorkspaceMembers(p.workspace_id),
          getMilestones(projectId).catch(() => []),
          getActivity({ projectId }).catch(() => []),
        ])
        if (!alive) return
        setTasks(t.filter((x) => x.project_id === projectId))
        setBugs(b)
        setMembers(m)
        setMilestones(ms)
        setActivities(acts)
      } catch {
        /* leave states empty */
      }
    }

    load()
    return () => { alive = false }
  }, [projectId, reloadKey])

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
            style={{ width: '27px', height: '27px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          ><ArrowLeft size={13} /></button>
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
        <StatCard icon={<Users size={12} />} label="Team members" value={project.members_count ?? 0} />
        <StatCard icon={<Clock size={12} />} label="Deadline" value={fmtDate(project.deadline)} />
        <StatCard icon={<CheckCircle2 size={12} />} label="Task done" value={`${doneTasks}/${totalTasks}`} />
        <StatCard icon={<BugIcon size={12} />} label="Bugs" value={Number(stats.total_bugs) || 0} />
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
        <>
          <div className="stat-grid">
            <StatCard icon={<ListChecks size={12} />} label="Total Task" value={tasks.length} />
            <StatCard icon={<CheckCircle2 size={12} />} label="Total Completed Task" value={tasks.filter((t) => t.status === 'Done').length} />
            <StatCard icon={<BugIcon size={12} />} label="Open Bugs" value={bugs.filter((b) => !['Fixed', 'Closed', 'Archived'].includes(b.kanban_column)).length} />
            <StatCard icon={<XCircle size={12} />} label="Close Bugs" value={bugs.filter((b) => ['Fixed', 'Closed', 'Archived'].includes(b.kanban_column)).length} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <button className="btn primary" onClick={() => setShowNewMilestone(true)} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Plus size={11} /> New Milestone
            </button>
          </div>

          {milestones.length === 0 ? (
            <Empty text="No milestones yet. Create the first one." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {milestones.map((ms) => {
                const checklist = ms.meta?.checklist || []
                const doneCount = checklist.filter((c) => c.done).length
                const statusColors = { planned: '#5f74ff', in_progress: '#ff7918', completed: '#20d96b', on_hold: '#ffb018' }
                const msTasks = tasks.filter((t) => t.milestone_id === ms.id)
                const msDoneTasks = msTasks.filter((t) => t.status === 'Done').length
                const openBugsCount = bugs.filter((b) => !['Fixed', 'Closed', 'Archived'].includes(b.kanban_column)).length
                const closedBugsCount = bugs.filter((b) => ['Fixed', 'Closed', 'Archived'].includes(b.kanban_column)).length
                return (
                  <div key={ms.id} className="card" style={{ padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Title left · status hard right */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ flex: 1, minWidth: 0, fontSize: '13px', fontWeight: 700, color: '#eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ms.name}
                      </span>
                      <button
                        className="icon-btn"
                        title="Edit milestone"
                        onClick={() => setEditingMilestone(ms)}
                        style={{ display: 'inline-flex', alignItems: 'center' }}
                      ><Pencil size={12} /></button>
                      <button
                        className="icon-btn"
                        title="Delete milestone"
                        onClick={() => setConfirmDeleteMs(ms)}
                        style={{ color: '#ff6b6b', display: 'inline-flex', alignItems: 'center' }}
                      ><Trash2 size={12} /></button>
                      <span className="badge" style={{ background: `${statusColors[ms.status] || '#5f74ff'}1a`, color: statusColors[ms.status] || '#5f74ff', fontSize: '9px', textTransform: 'capitalize', minWidth: '74px', textAlign: 'center' }}>
                        {(ms.status || 'planned').replace('_', ' ')}
                      </span>
                    </div>

                    {ms.description && (
                      <div style={{ fontSize: '11px', color: '#777', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {ms.description}
                      </div>
                    )}

                    {/* Start / due dates */}
                    <div style={{ display: 'flex', gap: '14px', fontSize: '10.5px', color: '#666', flexWrap: 'wrap' }}>
                      <span>Start: <span style={{ color: '#999' }}>{fmtDate(ms.start_date)}</span></span>
                      <span>Due: <span style={{ color: '#999' }}>{fmtDate(ms.due_date)}</span></span>
                      {checklist.length > 0 && <span>Checklist: <span style={{ color: '#999' }}>{doneCount}/{checklist.length}</span></span>}
                    </div>

                    {/* Full-row progress bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <div className="progress" style={{ width: '100%' }}>
                        <span style={{ width: `${Number(ms.progress) || 0}%` }} />
                      </div>
                      <span style={{ fontSize: '10px', color: '#666', flexShrink: 0 }}>{Number(ms.progress) || 0}%</span>
                    </div>

                    {/* 4 stat cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '4px' }}>
                      <div style={{ padding: '8px 10px', background: '#101010', border: '1px solid #232323', borderRadius: '4px' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Total Task</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f1f1' }}>{msTasks.length}</div>
                      </div>
                      <div style={{ padding: '8px 10px', background: '#101010', border: '1px solid #232323', borderRadius: '4px' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Completed Task</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#20d96b' }}>{msDoneTasks}</div>
                      </div>
                      <div style={{ padding: '8px 10px', background: '#101010', border: '1px solid #232323', borderRadius: '4px' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Open Bugs</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#ff7918' }}>{openBugsCount}</div>
                      </div>
                      <div style={{ padding: '8px 10px', background: '#101010', border: '1px solid #232323', borderRadius: '4px' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Closed Bugs</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#777' }}>{closedBugsCount}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {(showNewMilestone || editingMilestone) && (
            <CreateMilestoneModal
              projectId={projectId}
              milestone={editingMilestone}
              onClose={() => { setShowNewMilestone(false); setEditingMilestone(null) }}
              onSaved={() => { setShowNewMilestone(false); setEditingMilestone(null); setReloadKey((k) => k + 1) }}
            />
          )}

          {confirmDeleteMs && (
            <ConfirmModal
              title={`Delete milestone "${confirmDeleteMs.name}"?`}
              message="Tasks linked to it will keep working, but the milestone itself will be gone."
              note="* This cannot be undone."
              confirmLabel="Delete milestone"
              busy={deletingMs}
              onConfirm={async () => {
                setDeletingMs(true)
                try {
                  await deleteMilestone(confirmDeleteMs.id)
                  setConfirmDeleteMs(null)
                  setReloadKey((k) => k + 1)
                } catch { /* modal closes anyway */ }
                setDeletingMs(false)
              }}
              onCancel={() => setConfirmDeleteMs(null)}
            />
          )}
        </>
      )}

      {tab === 'Task' && (
        <>
          <div className="stat-grid">
            <StatCard icon={<ListChecks size={12} />} label="Total Current Task" value={tasks.length} />
            <StatCard icon={<CircleDot size={12} />} label="Total Current In Progress" value={tasks.filter((t) => t.status === 'In Progress').length} />
            <StatCard icon={<CircleDashed size={12} />} label="Total Current Pending" value={tasks.filter((t) => !t.status || t.status === 'To Do').length} />
            <StatCard icon={<CheckCircle2 size={12} />} label="Total Current Done" value={tasks.filter((t) => t.status === 'Done').length} />
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
        <>
          <div className="stat-grid">
            <StatCard icon={<BugIcon size={12} />} label="Total Current Bugs" value={bugs.length} />
            <StatCard icon={<CircleDot size={12} />} label="Total Current In Progress" value={bugs.filter((b) => b.kanban_column === 'In Progress').length} />
            <StatCard icon={<CircleDashed size={12} />} label="Total Current Pending" value={bugs.filter((b) => !b.kanban_column || b.kanban_column === 'New').length} />
            <StatCard icon={<CheckCircle2 size={12} />} label="Total Current Done" value={bugs.filter((b) => ['Fixed', 'Closed', 'Archived'].includes(b.kanban_column)).length} />
          </div>

          {bugs.length === 0 ? <Empty text="No bugs reported for this project." /> : (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Title</th>
                    <th>Priority</th>
                    <th>Stage</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {bugs.map((b) => (
                    <tr key={b.id}>
                      <td style={{ color: '#888', fontFamily: 'monospace', fontSize: '10.5px' }}>{b.bug_id || '—'}</td>
                      <td style={{ color: '#ddd', fontWeight: 600 }}>{b.title}</td>
                      <td>
                        <span className="badge" style={{ ...priorityStyle(b.priority), background: 'transparent', fontSize: '9px' }}>
                          {b.priority || 'medium'}
                        </span>
                      </td>
                      <td>{b.kanban_column || b.status || 'New'}</td>
                      <td>{fmtDate(b.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'Attachments' && <AttachmentsTab project={project} onUpdateProject={setProject} />}
      {tab === 'Activity' && (() => {
        const q = activityQuery.trim().toLowerCase()
        const filtered = activities.filter((a) => {
          if (activityFilter !== 'all' && a.action !== activityFilter) return false
          if (!q) return true
          const c = a.changes || {}
          const hay = [
            c.task_code, c.bug_id, c.title, describeActivity(a), actorName(a), a.entity_type,
          ].filter(Boolean).join(' ').toLowerCase()
          return hay.includes(q)
        })
        return (
          <>
            <ListToolbar
              query={activityQuery} onQuery={setActivityQuery}
              placeholder="Search activity…"
              filterValue={activityFilter}
              onFilter={setActivityFilter}
              options={[
                { value: 'all', label: 'All actions' },
                { value: 'created', label: 'Created' },
                { value: 'status_changed', label: 'Status changed' },
              ]}
            />

            {filtered.length === 0 ? <Empty text="No recent activity recorded." /> : (
              <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Activity</th>
                      <th>User</th>
                      <th>Date &amp; Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => (
                      <tr key={a.id}>
                        <td style={{ color: '#ddd' }}>
                          {describeActivity(a)}
                          {a.action === 'status_changed' && (
                            <span className="badge" style={{ marginLeft: '7px', fontSize: '9px', background: 'transparent' }}>status</span>
                          )}
                        </td>
                        <td style={{ color: '#888' }}>{actorName(a)}</td>
                        <td style={{ color: '#666', whiteSpace: 'nowrap', fontSize: '11px' }}>
                          {new Date(a.created_at).toLocaleDateString()} · {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )
      })()}
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
