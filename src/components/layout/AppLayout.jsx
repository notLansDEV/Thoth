import { useState } from 'react'
import Topbar from './Topbar'
import Sidebar from './Sidebar'

function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="app">
      <Topbar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
      />
      <div className={`layout${collapsed ? ' collapsed' : ''}`}>
        <Sidebar collapsed={collapsed} />
        <main className="content" role="main">
          <div className="page-body">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout
