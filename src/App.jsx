import './App.css'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './features/dashboard/Dashboard'

export default function App() {
  return (
    <AppLayout title="Dashboard" subtitle="Overview" actions={<></>}>
      <Dashboard />
    </AppLayout>
  )
}
