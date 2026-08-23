import React from 'react'
import { getDashboardStats } from '../dashboard.service'

export default function StatsCards(){
  const stats = getDashboardStats()
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
      {stats.map(s => (
        <div key={s.id} style={{padding:12,background:'#121212',border:'1px solid #292929',borderRadius:6}}>
          <div style={{fontSize:12,color:'#9aa'}}>{s.label}</div>
          <div style={{fontSize:20,fontWeight:700,marginTop:6}}>{s.value}</div>
          <div style={{fontSize:12,color:'#777',marginTop:6}}>{s.note}</div>
        </div>
      ))}
    </div>
  )
}
