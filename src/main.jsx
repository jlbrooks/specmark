import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import CliView from './components/CliView.jsx'
import { initAnalytics } from './utils/analytics'

initAnalytics()

const isCliPath = typeof window !== 'undefined'
  && window.location.pathname.startsWith('/cli')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isCliPath ? <CliView /> : <App />}
  </StrictMode>,
)
