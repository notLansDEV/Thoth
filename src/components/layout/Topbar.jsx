
export default function Topbar() {
  return (
    <header className="topbar">
      <div className="top-left">
        <div className="brand"><span className="brand-icon">T</span>Thoth Dev</div>
        <span className="breadcrumb">/ &nbsp;Projects</span>
      </div>
      <div className="top-right">
        <input className="search" placeholder="⌕  Search..." aria-label="Search" />
        <button className="btn primary">+ New</button>
        <button className="btn">🔔</button>
        <button className="btn">○</button>
        <span className="avatar">AC</span>
        <span className="user">Aria</span>
      </div>
    </header>
  )
}
