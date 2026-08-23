export default function ProjectCard({ project }) {
  return (
    <div className="card" style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
         onMouseEnter={(e) => e.currentTarget.style.borderColor = '#6e61ff'}
         onMouseLeave={(e) => e.currentTarget.style.borderColor = '#292929'}>
      <div className="card-head">
        <div className="name">
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: project.color }}></span>
          {project.name}
        </div>
      </div>
      
      <div className="description">{project.description}</div>
      
      <div className="progress-row">
        <div className="progress">
          <span style={{ background: project.color, width: `${project.percent}%` }}></span>
        </div>
        <div className="percent">{project.percent}%</div>
      </div>
      
      <div className="meta">
        <div className="meta-item">
          <span className="meta-icon">◈</span> Active
        </div>
        <div className="meta-item">
          <span className="meta-icon">◈</span> 4 tasks
        </div>
      </div>
    </div>
  )
}
