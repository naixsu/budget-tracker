import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import '@fontsource/archivo/latin-500.css'
import '@fontsource/archivo/latin-800.css'
import '@fontsource/archivo/latin-ext-500.css'
import '@fontsource/archivo/latin-ext-800.css'
import './index.css'

// Without this, iOS may clear IndexedDB when the device runs low on storage.
navigator.storage?.persist?.()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
