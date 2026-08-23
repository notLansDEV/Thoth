import React from 'react'

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <button className="back">‹</button>
        <span>thoth</span>
      </div>

      <nav className="nav">
        <div className="nav-item">Dashboard</div>
        <div className="nav-item active">Projects</div>
        <div className="nav-item">Kanban</div>
        <div className="nav-item">Tasks</div>
        <div className="nav-item">Bugs</div>
        <div className="nav-item">Calendar</div>
      </nav>

      <div className="section-title">Projects</div>
      <div>
        <div className="project"><span className="dot purple" />Thoth Core</div>
        <div className="project"><span className="dot green" />API Gateway</div>
      </div>

      <div className="bottom">
        <div className="nav-item">Workspace</div>
        <div className="nav-item">Settings</div>
        <div className="status"><span className="status-dot" />SQLite connected</div>
      </div>
    </aside>
  )
}
