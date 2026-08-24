import { useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'

/**
 * Search bar + Search button + Filter dropdown used by the Task and Bug boards.
 * props:
 *  - query/onQuery: applied text search value
 *  - priority/onPriority: 'all' | 'high' | 'medium' | 'low'
 *  - project/onProject: 'all' | project id
 *  - projects: [{id,name}] for the project filter
 *  - placeholder: input placeholder text
 * Generic single-filter mode (used by Activity):
 *  - filterValue/onFilter: current filter value + setter
 *  - options: [{value,label}] choices for the dropdown select
 */
export default function ListToolbar({
  query, onQuery,
  priority, onPriority,
  project, onProject,
  projects = [],
  placeholder = 'Search…',
  filterValue,
  onFilter,
  options = null,
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(query)
  const active = options ? (filterValue !== options[0]?.value) : (priority !== 'all' || project !== 'all')

  function apply(e) {
    if (e) e.preventDefault()
    onQuery(text)
  }

  function clearFilters() {
    if (options) onFilter(options[0]?.value ?? 'all')
    else { onPriority('all'); onProject('all') }
  }

  return (
    <form onSubmit={apply} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
      <div style={{ position: 'relative', width: '50%', minWidth: '180px', maxWidth: '340px' }}>
        <Search size={12} style={{
          position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)',
          color: '#666', pointerEvents: 'none',
        }} />
        <input
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={text}
          onChange={(e) => { setText(e.target.value); onQuery(e.target.value) }}
          style={{ width: '100%', paddingLeft: '27px' }}
        />
      </div>

      <button type="submit" className="btn primary" style={{ cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
        <Search size={11} /> Search
      </button>

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className={`btn${active ? ' primary' : ''}`}
          onClick={() => setOpen((o) => !o)}
          style={{ cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
        >
          <SlidersHorizontal size={11} /> Filter{active ? ' •' : ''}
        </button>

        {open && (
          <div
            className="dropdown-menu"
            style={{
              top: 'calc(100% + 6px)', right: 0, minWidth: '200px',
              padding: '10px', display: 'flex', flexDirection: 'column', gap: '9px', zIndex: 900,
            }}
          >
            {options ? (
              <>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#777', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Action
                </label>
                <select
                  value={filterValue}
                  onChange={(e) => onFilter(e.target.value)}
                  style={{ background: '#101010', border: '1px solid #2a2a2a', color: '#ddd', borderRadius: '4px', fontSize: '11px', padding: '5px 7px', width: '100%' }}
                >
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#777', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => onPriority(e.target.value)}
                  style={{ background: '#101010', border: '1px solid #2a2a2a', color: '#ddd', borderRadius: '4px', fontSize: '11px', padding: '5px 7px', width: '100%' }}
                >
                  <option value="all">All priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#777', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Project
                </label>
                <select
                  value={project}
                  onChange={(e) => onProject(e.target.value)}
                  style={{ background: '#101010', border: '1px solid #2a2a2a', color: '#ddd', borderRadius: '4px', fontSize: '11px', padding: '5px 7px', width: '100%' }}
                >
                  <option value="all">All projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </>
            )}

            {active && (
              <button
                type="button"
                className="btn"
                onClick={clearFilters}
                style={{ cursor: 'pointer' }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </form>
  )
}
