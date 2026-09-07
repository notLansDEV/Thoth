export default function StatsCards({ tasks, bugs, members }) {
  const doneTasks = tasks.filter((t) => t.status === 'Done')
  const openStages = ['fixed', 'closed', 'archived']
  const openBugs = bugs.filter(
    (b) => !openStages.includes((b.kanban_column || b.status || '').toLowerCase())
  )
  const highBugs = openBugs.filter((b) => (b.priority || '').toLowerCase() === 'high')
  const busyUsers = new Set(
    tasks.filter((t) => t.status !== 'Done' && t.assignee_name).map((t) => t.assignee_name)
  )

  const stats = [
    { id: 'users', label: 'Total users', value: members.length, note: 'workspace members' },
    { id: 'active', label: 'Active users', value: busyUsers.size, note: 'with assigned work' },
    { id: 'tasks', label: 'Tasks completed', value: doneTasks.length, note: `${tasks.length} total` },
    { id: 'bugs', label: 'Open bugs', value: openBugs.length, note: `High: ${highBugs.length}` },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
      {stats.map((s) => (
        <div key={s.id} style={{ padding: 12, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6 }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{s.label}</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6, color: 'var(--text-strong)' }}>{s.value}</div>
          <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 6 }}>{s.note}</div>
        </div>
      ))}
    </div>
  )
}
