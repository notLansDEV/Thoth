import { useEffect, useState } from 'react'
import StatsCards from './components/StatsCards'
import ProjectOverview from './components/ProjectOverview'
import RecentActivity from './components/RecentActivity'
import RecentBugs from './components/RecentBugs'
import { getProjects } from '../projects/projects.service.js'
import { getTasks, getWorkspaceMembers } from '../tasks/tasks.service.js'
import { getBugs } from '../bugs/bugs.service.js'
import { getActivity } from '../activity/activity.service.js'
import { getCurrentWorkspace } from '../../features/workspaces/workspaces.service.js'

export default function Dashboard() {
  const ws = getCurrentWorkspace()
  const [data, setData] = useState({
    projects: [], tasks: [], bugs: [], members: [], activities: [], loading: true,
  })

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [p, t, b, m, acts] = await Promise.all([
          getProjects(ws?.id),
          getTasks(ws?.id),
          getBugs({ workspaceId: ws?.id }).catch(() => []),
          getWorkspaceMembers(ws?.id).catch(() => []),
          getActivity({ workspaceId: ws?.id }).catch(() => []),
        ])
        if (!alive) return
        setData({
          projects: Array.isArray(p) ? p : [],
          tasks: Array.isArray(t) ? t : [],
          bugs: Array.isArray(b) ? b : [],
          members: Array.isArray(m) ? m : [],
          activities: Array.isArray(acts) ? acts : [],
          loading: false,
        })
      } catch {
        if (alive) setData((cur) => ({ ...cur, loading: false }))
      }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <StatsCards {...data} />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 16 }}>
        <ProjectOverview {...data} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <RecentActivity {...data} />
          <RecentBugs {...data} />
        </div>
      </div>
    </div>
  )
}
