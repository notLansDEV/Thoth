import { useEffect, useState } from 'react'
import {
  ChevronLeft, ChevronRight, ListTodo, Bug, CalendarDays, CalendarRange, CalendarClock, Search, SlidersHorizontal,
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
import TaskPreviewModal from '../features/tasks/components/TaskPreviewModal.jsx'
import BugPreviewModal from '../features/bugs/components/BugPreviewModal.jsx'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0]

const VIEWS = [
  { key: 'month', label: 'Month', Icon: CalendarDays },
  { key: 'week', label: 'Week', Icon: CalendarRange },
  { key: 'day', label: 'Day', Icon: CalendarClock },
]

export default function Calendar({ workspace }) {
  const ws = getCurrentWorkspace()
  const [view, setView] = useState('month')
  const [anchor, setAnchor] = useState(() => new Date())
  const [byDay, setByDay] = useState({})
  const [loading, setLoading] = useState(true)
  const [calOpen, setCalOpen] = useState(false)
  const [calMonth, setCalMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)

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

  const weekStart = startOfWeek(anchor)
  const weekEnd = addDays(weekStart, 6)
  const weekStartLabel = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const weekEndLabel = weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  const title = (
    view === 'month'
      ? monthLabel(anchor)
      : `${weekStartLabel} – ${weekEndLabel}`
  )

  const calYear = calMonth.getFullYear()
  const calMon = calMonth.getMonth()
  const calLabel = calMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const calFirstDay = new Date(calYear, calMon, 1).getDay()
  const calDaysInMonth = new Date(calYear, calMon + 1, 0).getDate()
  const calDays = []
  for (let i = 0; i < calFirstDay; i++) calDays.push(null)
  for (let d = 1; d <= calDaysInMonth; d++) calDays.push(d)

  function pickCalDay(day) {
    if (!day) return
    setAnchor(new Date(calYear, calMon, day))
    setCalOpen(false)
  }

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
    const q = query.trim().toLowerCase()
    return (byDay[toDateKey(date)] || []).filter((item) => {
      if (typeFilter !== 'all' && item.kind !== typeFilter) return false
      if (q && !item.title.toLowerCase().includes(q)) return false
      return true
    })
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
            onClick={() => setSelected({ kind: item.kind, raw: item.raw })}
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
          <div style={{ position: 'relative' }}>
            <button type="button" className="cal-title-btn" onClick={() => setCalOpen((v) => !v)}>
              {title}
            </button>
            {calOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setCalOpen(false)} />
                <div className="md-cal cal-mini">
                  <div className="md-cal-head">
                    <button className="icon-btn" onClick={() => setCalMonth(new Date(calYear, calMon - 1, 1))}><ChevronLeft size={12} /></button>
                    <span className="md-cal-title">{calLabel}</span>
                    <button className="icon-btn" onClick={() => setCalMonth(new Date(calYear, calMon + 1, 1))}><ChevronRight size={12} /></button>
                  </div>
                  <div className="md-cal-week">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <span key={d}>{d}</span>)}
                  </div>
                  <div className="md-cal-grid">
                    {calDays.map((day, i) => {
                      if (day === null) return <span key={`e${i}`} />
                      const ds = toDateKey(new Date(calYear, calMon, day))
                      const isToday = ds === today
                      return (
                        <button
                          key={ds}
                          type="button"
                          className={`md-cal-day${isToday ? ' today' : ''}`}
                          onClick={() => pickCalDay(day)}
                        >
                          {day}
                          {(byDay[ds] || []).length > 0 && <span className="md-cal-dot" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
          <button type="button" className="cal-today-btn" onClick={goToday}>Today</button>
        </div>
        <div className="cal-toolbar-right">
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted2)', pointerEvents: 'none' }} />
            <input
              type="text"
              className="search-input"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ height: '26px', width: '140px', paddingLeft: '25px', fontSize: '11px' }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={`btn${typeFilter !== 'all' ? ' primary' : ''}`}
              onClick={() => setFilterOpen((o) => !o)}
              style={{ height: '26px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}
            >
              <SlidersHorizontal size={11} /> Filter{typeFilter !== 'all' ? ' •' : ''}
            </button>
            {filterOpen && (
              <div className="dropdown-menu" style={{ top: 'calc(100% + 6px)', right: 0, minWidth: '170px', padding: '10px' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value); setFilterOpen(false) }}
                  style={{ width: '100%', background: 'var(--panel3)', border: '1px solid var(--border)', color: 'var(--text-soft)', borderRadius: '4px', fontSize: '11px', padding: '5px 7px' }}
                >
                  <option value="all">All types</option>
                  <option value="task">Tasks only</option>
                  <option value="bug">Bugs only</option>
                </select>
                {typeFilter !== 'all' && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => { setTypeFilter('all'); setFilterOpen(false) }}
                    style={{ width: '100%', marginTop: '8px', height: '24px', fontSize: '11px' }}
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}
          </div>

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

      {selected && selected.kind === 'task' && (
        <TaskPreviewModal
          task={selected.raw}
          workspaceId={ws?.id}
          onUpdated={(updated) => setSelected({ kind: 'task', raw: updated })}
          onClose={() => setSelected(null)}
        />
      )}

      {selected && selected.kind === 'bug' && (
        <BugPreviewModal
          bug={selected.raw}
          workspaceId={ws?.id}
          onUpdated={(updated) => setSelected({ kind: 'bug', raw: updated })}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  )
}
