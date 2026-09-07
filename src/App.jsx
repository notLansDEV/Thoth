import { useEffect } from 'react'
import './App.css'
import AppRouter from './routes/AppRouter'
import { applySettings } from './features/settings/settings.service.js'

export default function App() {
  useEffect(() => {
    applySettings()
  }, [])
  return <AppRouter />
}
