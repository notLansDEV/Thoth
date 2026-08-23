import React from 'react'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import Breadcrumb from './Breadcrumb'

export default function AppLayout({ children, title, subtitle }) {
  return (
    <div className="app">
      <Topbar />
      <div className="layout">
        <Sidebar />
        <main className="content">
          {(title || subtitle) && (
            <div className="page-head">
              <div>
                {title && <h1 className="page-title">{title}</h1>}
                {subtitle && <div className="page-subtitle">{subtitle}</div>}
              </div>
              <div />
            </div>
          )}

          <Breadcrumb />

          {children}
        </main>
      </div>
    </div>
  )
}
