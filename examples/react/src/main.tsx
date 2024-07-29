// import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

import './index.css'
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import HandSignMultilingual from './components/HandSignMultiligual'
import { Home } from "./pages/Home.tsx";


const router = createBrowserRouter([
  {
    path: "/handsign-multilingual/",
    element: <App />,
    children: [
      {
        path: "/handsign-multilingual/",
        element: <Home />,
      },
      {
        path: "/handsign-multilingual/demo",
        element: <HandSignMultilingual />,
      },
    ],
  },
]);
const root = document.getElementById('root')
if (root) {
  ReactDOM.createRoot(root).render(
    // <React.StrictMode>
    <RouterProvider router={router} />
    // </React.StrictMode>,
  )
}
