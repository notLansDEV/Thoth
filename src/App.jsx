import './App.css'
import AppLayout from './components/layout/AppLayout'
import AppRouter from './routes/AppRouter'

export default function App() {
  return (
    <AppLayout>
      <AppRouter />
    </AppLayout>
  )
}
