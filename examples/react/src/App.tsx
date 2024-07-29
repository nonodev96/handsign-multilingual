import './App.css'
import { Link, Outlet } from "react-router-dom";

function App() {
  return (
    <>
      <nav>
        <Link to="/handsign-multilingual/" className='bg-gray-300 py-2 px-2 rounded-md'>Home</Link>
        <Link to="/handsign-multilingual/demo" className='ms-4 bg-gray-300 py-2 px-2 rounded-md'>Demo</Link>
      </nav>
      <hr className="h-px my-4 bg-gray-200 border-0 dark:bg-gray-700" />

      <Outlet />
    </>
  )
}

export default App
