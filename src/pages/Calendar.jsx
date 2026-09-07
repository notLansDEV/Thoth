import { useEffect, useState } from 'react'
import {
  ChevronLeft, ChevronRight, ListTodo, Bug, CalendarDays, CalendarRange, CalendarClock,
} from 'lucide-react'
import { getCurrentWorkspace } from '../features/workspaces/workspaces.service.js'
import {
  loadWorkspaceEvents,
  toDateKey,
  todayKey,
  addDays,
  startOfWeek,
  monthLabel,
  isCurrentMonth,
} from '../features/calendar/calendar.service.js'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0]

const VIEWS = [
  { key: 'month', label: 'Month', Icon: CalendarDays },
  { key: 'week', label: 'Week', Icon: CalendarRange },
  { key: 'day', label: 'Day', Icon: CalendarClock },
]

function navigateTo(workspace, page, id) {
  let path = `/Thoth/${workspace}/${page}`
  if (id) path += `/${id}`
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function Calendar({ workspace }) {
  const ws = getCurrentWorkspace()
  const [view, setView] = useState('month')
  const [anchor, setAnchor] = useState(() => new Date())
  const [byDay, setByDay] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    loadWorkspaceEvents(ws?.id)
      .then((res) => { if (alive) setByDay(res.byDay || {}) })
      .catch(() => { if (alive) setByDay({}) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws?.id])

  const today = todayKey()

  function goToday() {
    setAnchor(new Date())
  }

  function shift(direction) {
    const step = view === 'month' ? 1 : view === 'week' ? 7 : 1
    setAnchor(addDays(anchor, step * direction))
  }

  const weekStart = startOfWeek(anchor)
  const weekEnd = addDays(weekStart, 6)
  const weekStartLabel = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const weekEndLabel = weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  const title = (
    view === 'month'
      ? monthLabel(anchor)
      : `${weekStartLabel} – ${weekEndLabel}`
  )

  let gridDays = []
  if (view === 'month') {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const start = startOfWeek(first)
    for (let i = 0; i < 42; i++) gridDays.push(addDays(start, i))
  } else if (view === 'week') {
    const start = startOfWeek(anchor)
    for (let i = 0; i < 7; i++) gridDays.push(addDays(start, i))
  } else {
    gridDays = [new Date(anchor)]
  }

  function dayItems(date) {
    return byDay[toDateKey(date)] || []
  }

  function renderPills(items, max) {
    const shown = max ? items.slice(0, max) : items
    const rest = max && items.length > max ? items.length - max : 0
    return (
      <>
        {shown.map((item) => (
          <button
            key={`${item.kind}-${item.id}`}
            type="button"
            className="cal-pill"
            style={{ background: `${item.color}1f`, color: item.color, borderColor: `${item.color}55` }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${item.color}33` }}
            onMouseLeave={(e) => { e.currentTarget.style.background = `${item.color}1f` }}
            onClick={() => navigateTo(ws?.id, item.kind === 'task' ? 'tasks' : 'bugs', item.id)}
            title={`${item.kind === 'task' ? 'Task' : 'Bug'}: ${item.title}`}
          >
            {item.kind === 'task' ? <ListTodo size={9} /> : <Bug size={9} />}
            <span>{item.title}</span>
          </button>
        ))}
        {rest > 0 && <div className="cal-more">+{rest} more</div>}
      </>
    )
  }

  return (
    <section className="card" style={{ padding: '0' }}>
      <div className="cal-toolbar">
        <div className="cal-toolbar-left">
          <button type="button" className="cal-nav-btn" onClick={() => shift(-1)} aria-label="Previous">
            <ChevronLeft size={14} />
          </button>
          <span className="cal-title">{title}</span>
          <button type="button" className="cal-nav-btn" onClick={() => shift(1)} aria-label="Next">
            <ChevronRight size={14} />
          </button>
          <button type="button" className="cal-today-btn" onClick={goToday}>Today</button>
        </div>

        <div className="cal-toolbar-right">
          {VIEWS.map((v) => {
            const Icon = v.Icon
            return (
              <button
                key={v.key}
                type="button"
                className={`cal-view-btn${view === v.key ? ' active' : ''}`}
                onClick={() => setView(v.key)}
              >
                <Icon size={12} /> {v.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="cal-legend">
        <span className="cal-legend-item"><span className="cal-dot" style={{ background: '#5f74ff' }} /> Tasks</span>
        <span className="cal-legend-item"><span className="cal-dot" style={{ background: '#ff4040' }} /> Bugs</span>
      </div>

      {loading ? (
        <div className="cal-empty">Loading…</div>
      ) : (
        <>
          {view === 'month' ? (
            <div className="cal-month">
              <div className="cal-head-row">
                {DAY_NAMES.map((d) => <div key={d} className="cal-head-cell">{d}</div>)}
              </div>
              <div className="cal-grid">
                {gridDays.map((date, i) => {
                  const key = toDateKey(date)
                  const items = dayItems(date)
                  const inMonth = isCurrentMonth(date, anchor)
                  const isToday = key === today
                  return (
                    <div
                      key={i}
                      className={`cal-cell${inMonth ? '' : ' outside'}`}
                      style={{ background: isToday ? 'rgba(95,116,255,0.08)' : undefined }}
                    >
                      <div className={`cal-day-num${isToday ? ' today' : ''}`}>{date.getDate()}</div>
                      <div className="cal-pills">{renderPills(items, 3)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="cal-list-wrap" style={{ ['--cal-cols']: gridDays.length }}>
              <div className="cal-list-head">
                {gridDays.map((date) => {
                  const key = toDateKey(date)
                  const isToday = key === today
                  return (
                    <div key={key} className="cal-list-day-head">
                      <div className="cal-list-day-name">{date.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                      <div className={`cal-day-num${isToday ? ' today' : ''}`}>{date.getDate()}</div>
                      <div className="cal-list-day-month">{date.toLocaleDateString(undefined, { month: 'short' })}</div>
                    </div>
                  )
                })}
              </div>
              <div className="cal-list-body">
                {gridDays.map((date) => {
                  const key = toDateKey(date)
                  const items = dayItems(date)
                  const isToday = key === today
                  return (
                    <div key={key} className={`cal-list-col${isToday ? ' today-col' : ''}`}>
                      {items.length === 0 ? (
                        <div className="cal-list-empty">—</div>
                      ) : (
                        <div className="cal-pills col">{renderPills(items)}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
