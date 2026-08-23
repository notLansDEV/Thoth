import React from 'react'
import { getRecentBugs } from '../dashboard.service'

export default function RecentBugs(){
  const bugs = getRecentBugs()
  return (
    <div className="card">
      <div className="card-head"><div className="name">Recent bugs</div></div>
      <ul style={{marginTop:10,listStyle:'none',paddingLeft:0}}>
        {bugs.map(b => (
          <li key={b.id} style={{padding:8,borderBottom:'1px solid #232323',display:'flex',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:13,fontWeight:700}}>{b.title}</div>
              <div style={{fontSize:11,color:'#666'}}>{b.project} • {b.priority}</div>
            </div>
            <div style={{fontSize:12,color:'#999'}}>{b.status}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
