import React from 'react'
import { getProjects } from '../dashboard.service'

export default function ProjectOverview(){
  const projects = getProjects()
  return (
    <section className="card">
      <div className="card-head">
        <div className="name">Projects</div>
      </div>

      <div style={{display:'grid',gap:12,marginTop:10}}>
        {projects.map(p => (
          <div key={p.id} style={{display:'grid',gridTemplateColumns:'1fr 80px',alignItems:'center',gap:8}}>
            <div>
              <div style={{fontWeight:700}}>{p.name}</div>
              <div style={{fontSize:12,color:'#777'}}>{p.description}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:12,color:'#777'}}>{p.percent}%</div>
              <div style={{height:6,background:'#292929',borderRadius:4,overflow:'hidden',marginTop:6}}>
                <div style={{width:`${p.percent}%`,height:'100%',background:p.color}} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
