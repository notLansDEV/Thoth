import './App.css'
import AppLayout from './components/layout/AppLayout'

export default function App() {
  return (
    <AppLayout title="Projects" subtitle="4 projects in this workspace" actions={<button className="new-project">+ New Project</button>}>
      <section className="grid">
        <article className="card">
          <div className="card-head">
            <div className="name"><span className="dot purple"></span>Thoth Core</div>
            <span className="badge">active</span>
          </div>
          <div className="description">Core application engine and data layer</div>
          <div className="progress-row">
            <div className="progress"><span style={{width:'68%'}} /></div><div className="percent">68%</div>
          </div>
          <div className="meta">
            <span className="meta-item">☑ 34 tasks</span>
            <span className="meta-item">⊗ 7 bugs</span>
            <span className="meta-item">◇ 3 milestones</span>
          </div>
        </article>

        <article className="card">
          <div className="card-head">
            <div className="name"><span className="dot green"></span>API Gateway</div>
            <span className="badge">active</span>
          </div>
          <div className="description">RESTful and GraphQL API gateway service</div>
          <div className="progress-row">
            <div className="progress green"><span style={{width:'82%'}} /></div><div className="percent">82%</div>
          </div>
          <div className="meta">
            <span className="meta-item">☑ 21 tasks</span>
            <span className="meta-item">⊗ 3 bugs</span>
            <span className="meta-item">◇ 2 milestones</span>
          </div>
        </article>

        <article className="card">
          <div className="card-head">
            <div className="name"><span className="dot orange"></span>Data Pipeline</div>
            <span className="badge paused">paused</span>
          </div>
          <div className="description">ETL pipeline and analytics infrastructure</div>
          <div className="progress-row">
            <div className="progress orange"><span style={{width:'45%'}} /></div><div className="percent">45%</div>
          </div>
          <div className="meta">
            <span className="meta-item">☑ 18 tasks</span>
            <span className="meta-item">⊗ 11 bugs</span>
            <span className="meta-item">◇ 4 milestones</span>
          </div>
        </article>

        <article className="card">
          <div className="card-head">
            <div className="name"><span className="dot violet"></span>Mobile Client</div>
            <span className="badge">active</span>
          </div>
          <div className="description">React Native mobile app for iOS and Android</div>
          <div className="progress-row">
            <div className="progress violet"><span style={{width:'31%'}} /></div><div className="percent">31%</div>
          </div>
          <div className="meta">
            <span className="meta-item">☑ 29 tasks</span>
            <span className="meta-item">⊗ 14 bugs</span>
            <span className="meta-item">◇ 5 milestones</span>
          </div>
        </article>
      </section>
    </AppLayout>
  )
}
