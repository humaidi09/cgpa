import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Each app is a standalone SPA served under the portfolio at /<app>/.
// `base` must match that subpath; the router reads it back via BASE_URL.
// >>> Per app: set base to '/<app>/' (e.g. '/banking/').
export default defineConfig({
  base: '/cgpa/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
