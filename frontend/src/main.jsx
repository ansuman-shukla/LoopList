import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Import CSS in the correct order
import 'react-calendar/dist/Calendar.css'
import './index.css'
import './App.css'
import './render-fixes.css' // Add specific fixes for Render deployment
import App from './App.jsx'

// Make sure the root element exists
const rootElement = document.getElementById('root')
if (!rootElement) {
  const rootDiv = document.createElement('div')
  rootDiv.id = 'root'
  rootDiv.className = 'min-h-screen w-full'
  document.body.appendChild(rootDiv)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
