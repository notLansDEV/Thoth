import React from 'react'

export default function Breadcrumb({ items }){
  if(!items){
    const parts = window.location.pathname.split('/').filter(Boolean)
    if(parts[0] && parts[0].toLowerCase() === 'thoth'){
      items = ['Thoth', parts[1] || 'default', parts[2] || 'dashboard']
    } else {
      items = ['Thoth', parts[0] || 'default', parts[1] || 'dashboard']
    }
  }
  return (
    <div className="breadcrumb-row">
      <div className="breadcrumb">{items.join(' / ')}</div>
    </div>
  )
}
