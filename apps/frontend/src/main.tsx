import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './globals.css'

// Router-Instanz erstellen
const router = createRouter({ routeTree })

// Type-Safety für Router
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// App rendern
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found. Ensure there is a <div id="root"></div> in index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
