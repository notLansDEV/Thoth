import { useEffect, useState } from 'react'
import {
  ChevronLeft, ChevronRight, ListTodo, Bug, CalendarDays, CalendarRange, CalendarClock, Search, SlidersHorizontal, X,
} from 'lucide-react'
import { getCurrentWorkspace } from

  '../features/workspaces/workspaces.service.js'
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
  const [dayDrawer, setDayDrawer] = useState(null) // { key, date }
  const [dayDrawerClosing, setDayDrawerClosing] = useState(false)

  function openDayDrawer(date, key) {
    setDayDrawerClosing(false)
    setDayDrawer({ date, key })
  }

  function closeDayDrawer(onClosed) {
    if (!dayDrawer || dayDrawerClosing) {
      if (typeof onClosed === 'function') onClosed()
      return
    }
    setDayDrawerClosing(true)
    setTimeout(() => {
      setDayDrawer(null)
      setDayDrawerClosing(false)
      if (typeof onClosed === 'function') onClosed()
    }, 220)
  }

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

  function renderPills(items, max, onMore, large = false) {
    const shown = max ? items.slice(0, max) : items
    const rest = max && items.length > max ? items.length - max : 0
    const iconSize = large ? 13 : 9
    return (
      <>
        {shown.map((item) => (
          <button
            key={`${item.kind}-${item.id}`}
            type="button"
            className={`cal-pill${large ? ' cal-pill-lg' : ''}`}
            style={{ background: `${item.color}1f`, color: item.color, borderColor: `${item.color}55` }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${item.color}33` }}
            onMouseLeave={(e) => { e.currentTarget.style.background = `${item.color}1f` }}
            onClick={() => setSelected({ kind: item.kind, raw: item.raw })}
            title={`${item.kind === 'task' ? 'Task' : 'Bug'}: ${item.title}`}
          >
            {item.kind === 'task' ? <ListTodo size={iconSize} /> : <Bug size={iconSize} />}
            <span>{item.title}</span>
          </button>
        ))}
        {rest > 0 && (
          onMore ? (
            <button type="button" className="cal-more cal-more-btn" onClick={onMore} title={`View ${rest} more items`}>
              +{rest} more
            </button>
          ) : (
            <div className="cal-more">+{rest} more</div>
          )
        )}
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
          {view !== 'month' && (
            <>
              <button type="button" className="cal-nav-btn" title="Previous"
                onClick={() => setAnchor(addDays(anchor, view === 'week' ? -7 : -1))}>
                <ChevronLeft size={12} />
              </button>
              <button type="button" className="cal-nav-btn" title="Next"
                onClick={() => setAnchor(addDays(anchor, view === 'week' ? 7 : 1))}>
                <ChevronRight size={12} />
              </button>
            </>
          )}
          <button type="button" className="cal-today-btn" onClick={goToday}>Today</button>
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
              <div className="dropdown-menu" style={{ top: 'calc(100% + 8px)', left: 'auto', right: 0, minWidth: '170px', padding: '10px' }}>
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
                      <div className="cal-pills">{renderPills(items, 3, () => openDayDrawer(new Date(date), key))}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className={`cal-list-wrap${view === 'day' ? ' day-view' : ''}`} style={{ ['--cal-cols']: gridDays.length }}>
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
                        <div className="cal-pills col">{renderPills(items, undefined, undefined, view === 'day')}</div>
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

      {dayDrawer && (() => {
        const items = dayItems(dayDrawer.date)
        const label = dayDrawer.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
        const isToday = dayDrawer.key === today
        return (
          <>
            <div className={`day-drawer-overlay${dayDrawerClosing ? ' closing' : ''}`} onClick={() => closeDayDrawer()} />
            <aside className={`day-drawer${dayDrawerClosing ? ' closing' : ''}`} role="dialog" aria-label={`Items for ${label}`}>
              <div className="day-drawer-head">
                <div>
                  <div className="day-drawer-title">
                    {label}
                    {isToday && <span className="day-drawer-today">Today</span>}
                  </div>
                  <div className="day-drawer-sub">{items.length} item{items.length === 1 ? '' : 's'}</div>
                </div>
                <button type="button" className="icon-btn" onClick={() => closeDayDrawer()} aria-label="Close drawer">
                  <X size={14} />
                </button>
              </div>
              <div className="day-drawer-body">
                {items.length === 0 ? (
                  <div className="cal-empty" style={{ padding: '20px 0' }}>No tasks or bugs for this day.</div>
                ) : (
                  <div className="day-drawer-list">
                    {items.map((item) => (
                      <button
                        key={`${item.kind}-${item.id}`}
                        type="button"
                        className="day-drawer-item"
                        onClick={() => closeDayDrawer(() => setSelected({ kind: item.kind, raw: item.raw }))}
                      >
                        <span className="day-drawer-icon" style={{ color: item.color, background: `${item.color}1f`, borderColor: `${item.color}55` }}>
                          {item.kind === 'task' ? <ListTodo size={12} /> : <Bug size={12} />}
                        </span>
                        <span className="day-drawer-item-main">
                          <span className="day-drawer-item-title">{item.title}</span>
                          <span className="day-drawer-item-meta">
                            <span className="day-drawer-kind" style={{ color: item.color }}>{item.kind === 'task' ? 'Task' : 'Bug'}</span>
                            {item.raw?.status ? <span>· {item.raw.status}</span> : null}
                            {item.raw?.priority ? <span>· {item.raw.priority}</span> : null}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </>
        )
      })()}
    </section>
  )
}
