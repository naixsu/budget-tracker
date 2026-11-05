import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import '@fontsource/archivo/latin-500.css'
import '@fontsource/archivo/latin-800.css'
import '@fontsource/archivo/latin-ext-500.css'
import '@fontsource/archivo/latin-ext-800.css'
import './index.css'
import { startAutoSync } from './sync/autoSync'

// iOS Safari only applies :active on touch when a touchstart listener exists.
document.addEventListener('touchstart', () => {}, { passive: true })

// Without this, iOS may clear IndexedDB when the device runs low on storage.
navigator.storage?.persist?.()

startAutoSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
