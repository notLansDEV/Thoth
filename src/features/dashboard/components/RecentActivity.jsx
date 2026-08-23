import React from 'react'
import { getRecentActivity } from '../dashboard.service'

export default function RecentActivity(){
  const items = getRecentActivity()
  return (
    <div className="card">
      <div className="card-head"><div className="name">Recent activity</div></div>
      <ul style={{marginTop:10,listStyle:'none',paddingLeft:0}}>
        {items.map(i => (
          <li key={i.id} style={{padding:8,borderBottom:'1px solid #232323'}}>
            <div style={{fontSize:13}}>{i.text}</div>
            <div style={{fontSize:11,color:'#666'}}>{i.when}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
