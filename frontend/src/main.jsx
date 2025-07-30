import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initSentry } from './sentry'

// Initialize Sentry
initSentry()

// Add error handling
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error)
})

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason)
})

const root = document.getElementById('root')
if (!root) {
  console.error('Root element not found!')
  const errorDiv = document.createElement('div')
  errorDiv.style.cssText = 'background: red; color: white; padding: 20px; font-size: 24px;'
  errorDiv.textContent = 'ROOT ELEMENT NOT FOUND!'
  document.body.appendChild(errorDiv)
} else {
  console.log('Mounting React app...')
  try {
    const rootElement = createRoot(root)
    console.log('Root element created:', rootElement)
    rootElement.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    console.log('React app mounted successfully')
  } catch (error) {
    console.error('Failed to mount React app:', error)
    const errorDiv = document.createElement('div')
    errorDiv.style.cssText = 'color: red; padding: 20px;'
    errorDiv.textContent = 'Failed to mount React app: ' + error.message
    document.body.appendChild(errorDiv)
  }
}
