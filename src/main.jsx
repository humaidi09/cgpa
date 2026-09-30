import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { applyRemoteData } from './engine/cgpa'
import { readCache, indexBySlug, fetchRemoteData, signature } from './lib/remoteData'

// The app is served under a subpath (e.g. /cgpa/). Vite injects that as
// BASE_URL; strip the trailing slash so it's a valid router basename, so every
// <Link to="/x"> resolves to /<app>/x and deep links work under the subpath.
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '')

// Grading scales and the honours ladder are owner-editable from the portfolio
// admin. Apply the last cached payload synchronously so the first paint already
// reflects edits; with no cache the engine's bundled defaults show. `applied`
// tracks what we've rendered so the background revalidate only remounts when the
// data genuinely changed — the common case never does.
let applied = null
const cached = readCache()
if (cached) {
  applyRemoteData(indexBySlug(cached))
  applied = signature(cached)
}

const root = createRoot(document.getElementById('root'))

function render() {
  // Keying <App> on the data signature makes a change remount the tree, so any
  // component-local snapshot (a selected scale, a useMemo) re-reads fresh data.
  root.render(
    <StrictMode>
      <BrowserRouter basename={basename}>
        <App key={applied ?? 'bundled'} />
      </BrowserRouter>
    </StrictMode>,
  )
}

render()

// Best-effort background revalidate. Never blocks paint; on failure we keep the
// cached/bundled data.
fetchRemoteData().then((datasets) => {
  if (!datasets) return
  const next = signature(datasets)
  if (next === applied) return
  applyRemoteData(indexBySlug(datasets))
  applied = next
  render()
})
