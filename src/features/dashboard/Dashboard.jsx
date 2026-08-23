import StatsCards from './components/StatsCards'
import ProjectOverview from './components/ProjectOverview'
import RecentActivity from './components/RecentActivity'
import RecentBugs from './components/RecentBugs'

export default function Dashboard() {
  return (
    <div>
      <StatsCards />

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,marginTop:16}}>
        <ProjectOverview />
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <RecentActivity />
          <RecentBugs />
        </div>
      </div>
    </div>
  )
}
