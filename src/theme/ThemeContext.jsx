import { createContext, useCallback, useContext, useEffect, useState } from 'react'

// Runtime dark/light toggle. The pre-paint script in index.html sets the initial
// class on <html> from localStorage('theme') (default dark); this keeps the class,
// storage, and browser chrome colour in sync when the user toggles. Matches the
// portfolio's ThemeContext exactly, so every app themes identically.

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} })

function readInitialTheme() {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.classList.contains('light') ? 'light' : 'dark'
}

// Both map to the true page background of each theme (black / warm paper).
const META_COLORS = { dark: '#000000', light: '#f4f2ea' }

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    try {
      localStorage.setItem('theme', theme)
    } catch {
      /* storage unavailable — session-only, fine */
    }
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', META_COLORS[theme])
  }, [theme])

  const toggleTheme = useCallback(
    () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    [],
  )

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeContext)
}
