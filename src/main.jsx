import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { openDatabase } from './db/db.js'
import '@fontsource-variable/open-sans/wght.css'
import './index.css'
import { watchForStaleChunks } from './lib/staleChunks.js'
import { routes } from './router.jsx'
import { applyTheme, useUiStore, watchSystemTheme } from './stores/useUiStore.js'

applyTheme(useUiStore.getState().theme)
watchSystemTheme()
watchForStaleChunks()

openDatabase().then((ok) => {
  if (!ok) useUiStore.setState({ storageError: true })
})

// Hash routing: GitHub Pages has no server-side rewrites, so deep links must live after "#".
const router = createHashRouter(routes)

createRoot(/** @type {HTMLElement} */ (document.getElementById('root'))).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
