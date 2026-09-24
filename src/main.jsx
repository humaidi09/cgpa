import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// The app is served under a subpath (e.g. /banking/). Vite injects that as
// BASE_URL; strip the trailing slash so it's a valid router basename, so every
// <Link to="/x"> resolves to /<app>/x and deep links work under the subpath.
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
