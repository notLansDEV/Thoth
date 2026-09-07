import { getTasks } from '../tasks/tasks.service.js'
import { getBugs } from '../bugs/bugs.service.js'

export function toDateKey(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayKey() {
  const now = new Date()
  return toDateKey(now)
}

export function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b)
}

export function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function startOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return addDays(d, diff)
}

export function monthLabel(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function isCurrentMonth(date, anchor) {
  return date.getFullYear() === anchor.getFullYear() && date.getMonth() === anchor.getMonth()
}

export async function loadWorkspaceEvents(workspaceId) {
  const [tasks, bugs] = await Promise.all([
    getTasks(workspaceId),
    getBugs({ workspaceId }),
  ])

  const items = []

  ;(Array.isArray(tasks) ? tasks : []).forEach((task) => {
    const key = toDateKey(task.due_date) || toDateKey(task.start_date) || toDateKey(task.created_at)
    if (!key) return
    items.push({
      kind: 'task',
      id: task.id,
      title: task.title,
      dateKey: key,
      date: key,
      raw: task,
      color: '#5f74ff',
    })
  })

  ;(Array.isArray(bugs) ? bugs : []).forEach((bug) => {
    const key = toDateKey(bug.due_date) || toDateKey(bug.start_date) || toDateKey(bug.created_at)
    if (!key) return
    items.push({
      kind: 'bug',
      id: bug.id,
      title: bug.title,
      dateKey: key,
      date: key,
      raw: bug,
      color: '#ff4040',
    })
  })

  const byDay = {}
  items.forEach((item) => {
    if (!byDay[item.dateKey]) byDay[item.dateKey] = []
    byDay[item.dateKey].push(item)
  })
  Object.keys(byDay).forEach((k) => {
    byDay[k].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'bug' ? -1 : 1))
  })

  return { items, byDay }
}
