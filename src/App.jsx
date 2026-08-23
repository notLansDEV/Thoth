import './App.css'
import AppLayout from './components/layout/AppLayout'
import AppRouter from './routes/AppRouter'

export default function App() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  if(!token){
    // Show auth routes (login/signup) without full app chrome
    return <AppRouter />
  }

  return (
    <AppLayout>
      <AppRouter />
    </AppLayout>
  )
}
