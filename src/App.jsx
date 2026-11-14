import { useEffect } from 'react'
import './App.css'
import { Toaster } from 'sonner'
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import AppRouter from './routes/AppRouter'
import { applySettings } from './features/settings/settings.service.js'

export default function App() {
  useEffect(() => {
    applySettings()
  }, [])
  return (
    <>
      <AppRouter />
      <Toaster
        position="top-right"
        closeButton
        icons={{
          success: <CheckCircle2 size={16} />,
          error: <AlertCircle size={16} />,
          warning: <AlertTriangle size={16} />,
          info: <Info size={16} />,
        }}
        toastOptions={{
          classNames: {
            toast: 'app-toast',
            success: 'app-toast-success',
            error: 'app-toast-error',
            warning: 'app-toast-warning',
            info: 'app-toast-info',
            closeButton: 'app-toast-close',
          },
        }}
      />
    </>
  )
}
