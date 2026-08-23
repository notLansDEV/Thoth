import React from 'react'

export default function Breadcrumb({ items = ['Projects'] }) {
  return (
    <div className="breadcrumb-row">
      <div className="breadcrumb">{items.join(' / ')}</div>
    </div>
  )
}
