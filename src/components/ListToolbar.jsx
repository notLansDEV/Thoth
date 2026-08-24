import { useState } from 'react'

/**
 * Search input + filter dropdown used by the Task and Bug boards.
 * props:
 *  - query/onQuery: text search value
 *  - priority/onPriority: 'all' | 'high' | 'medium' | 'low'
 *  - project/onProject: 'all' | project id
 *  - projects: [{id,name}] for the project filter
 */
export default function ListToolbar({
  query, onQuery,
  priority, onPriority,
  project, onProject,
  projects = [],
}) {
  const [open, setOpen] = useState(false)
  const active = priority !== 'all' || project !== 'all'

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
      <input
        type="search"
        className="search-input"
        placeholder="Search by title or code…"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        style={{ flex: 1 }}
      />

      <div style={{ position: 'relative' }}>
        <button
          className={`btn${active ? ' primary' : ''}`}
          onClick={() => setOpen((o) => !o)}
          style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          ⚙ Filter{active ? ' •' : ''}
        </button>

        {open && (
          <div
            className="dropdown-menu"
            style={{
              top: 'calc(100% + 6px)', right: 0, minWidth: '200px',
              padding: '10px', display: 'flex', flexDirection: 'column', gap: '9px', zIndex: 900,
            }}
          >
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

            {active && (
              <button
                className="btn"
                onClick={() => { onPriority('all'); onProject('all') }}
                style={{ cursor: 'pointer' }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
