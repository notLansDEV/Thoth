import React from 'react'
import PropTypes from 'prop-types'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import Breadcrumb from './Breadcrumb'

function AppLayout({ children, title, subtitle, actions, className }) {
  return (
    <div className={`app ${className || ''}`}>
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

AppLayout.propTypes = {
  children: PropTypes.node,
  title: PropTypes.node,
  subtitle: PropTypes.node,
  actions: PropTypes.node,
  className: PropTypes.string,
}

AppLayout.defaultProps = {
  children: null,
  title: null,
  subtitle: null,
  actions: null,
  className: '',
}

export default AppLayout
