import Topbar from './Topbar'
import Sidebar from './Sidebar'
import Breadcrumb from './Breadcrumb'

function AppLayout({ children, title, subtitle, actions, className = '' }) {
  return (
    <div className={`app ${className}`}>
      <Topbar />
      <div className="layout">
        <Sidebar />
        <main className="content" role="main">
          <div className="page-head" aria-hidden={!(title || subtitle || actions)}>
            <div>
              {title && <h1 className="page-title">{title}</h1>}
              {subtitle && <div className="page-subtitle">{subtitle}</div>}
            </div>
            {actions ? <div className="page-actions">{actions}</div> : <div />}
          </div>

          <Breadcrumb />

          <div className="page-body">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout
