import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import DocsView from './components/DocsView.jsx'
import { initAnalytics } from './utils/analytics'

initAnalytics()

const isDocsPath = typeof window !== 'undefined'
  && window.location.pathname.startsWith('/docs')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isDocsPath ? <DocsView /> : <App />}
  </StrictMode>,
)
