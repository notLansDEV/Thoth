import { Users, UserCheck, CheckCircle2, Bug } from 'lucide-react'

export default function StatsCards({ tasks = [], bugs = [], members = [] }) {
  const doneTasks = tasks.filter((t) => String(t.status || '').toLowerCase() === 'done')
  const openStages = ['fixed', 'closed', 'archived']
  const openBugs = bugs.filter(
    (b) => !openStages.includes((b.kanban_column || b.status || '').toLowerCase())
  )
  const lowBugs = openBugs.filter((b) => (b.priority || 'medium').toLowerCase() === 'low')
  const mediumBugs = openBugs.filter((b) => (b.priority || 'medium').toLowerCase() === 'medium')
  const highBugs = openBugs.filter((b) => (b.priority || '').toLowerCase() === 'high')
  const criticalBugs = openBugs.filter((b) => (b.priority || '').toLowerCase() === 'critical')
  const busyUsers = new Set(
    tasks.filter((t) => String(t.status || '').toLowerCase() !== 'done' && t.assignee_name).map((t) => t.assignee_name)
  )
  const donePct = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0

  const stats = [
    { id: 'users', label: 'Total Users', value: members.length, note: 'workspace members', Icon: Users, tone: 'indigo' },
    { id: 'active', label: 'Active Users', value: busyUsers.size, note: 'with assigned work', Icon: UserCheck, tone: 'blue' },
    { id: 'tasks', label: 'Tasks Completed', value: doneTasks.length, note: `${doneTasks.length} of ${tasks.length} total (${donePct}%)`, Icon: CheckCircle2, tone: 'green' },
    {
      id: 'bugs',
      label: 'Open Bugs',
      value: openBugs.length,
      note: (
        <>
          <span className={`dash-kpi-sev ${lowBugs.length > 0 ? 'is-low' : ''}`}>Low: {lowBugs.length}</span>
          <span className={`dash-kpi-sev ${mediumBugs.length > 0 ? 'is-medium' : ''}`}>Medium: {mediumBugs.length}</span>
          <span className={`dash-kpi-sev ${highBugs.length > 0 ? 'is-high' : ''}`}>High: {highBugs.length}</span>
          <span className={`dash-kpi-sev ${criticalBugs.length > 0 ? 'is-critical' : ''}`}>Critical: {criticalBugs.length}</span>
        </>
      ),
      noteStack: true,
      Icon: Bug,
      tone: 'red',
    },
  ]

  return (
    <div className="dash-kpi-grid">
      {stats.map((s) => (
        <div key={s.id} className="dash-kpi-card">
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">{s.label}</span>
            <span className={`dash-kpi-icon dash-kpi-icon-${s.tone}`}><s.Icon size={13} /></span>
          </div>
          <div className="dash-kpi-value">{s.value}</div>
          <div className={`dash-kpi-sub ${s.noteStack ? 'dash-kpi-sub-stack' : ''}`}>{s.note}</div>
        </div>
      ))}
    </div>
  )
}
