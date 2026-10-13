import { StrictMode, Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import Alphabet from './pages/Alphabet.tsx'
import Home from './pages/Home.tsx'

import './index.css'

// The pages with the camera load TensorFlow.js and MediaPipe: only when they are opened
const Demo = lazy(() => import('./pages/Demo.tsx'))
const Train = lazy(() => import('./pages/Train.tsx'))
const Practice = lazy(() => import('./pages/Practice.tsx'))

const loading = <p className="py-12 text-center text-slate-500" role="status">…</p>

// The demo lives under /handsign-multilingual/ (GitHub Pages, and `base` in vite.config.ts)
const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        { index: true, element: <Home /> },
        { path: 'demo', element: <Suspense fallback={loading}><Demo /></Suspense> },
        { path: 'alphabet', element: <Alphabet /> },
        { path: 'train', element: <Suspense fallback={loading}><Train /></Suspense> },
        { path: 'practice', element: <Suspense fallback={loading}><Practice /></Suspense> },
        { path: '*', element: <Navigate to="/" replace /> }
      ]
    }
  ],
  { basename: '/handsign-multilingual' }
)

const root = document.getElementById('root')
if (root) {
  ReactDOM.createRoot(root).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  )
}
