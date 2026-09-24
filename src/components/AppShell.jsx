import { useEffect, useState } from 'react'
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Menu, Moon, Sun, X } from 'lucide-react'
import { useTheme } from '@/theme/ThemeContext'
import { cx } from '@/lib/cx'

// Shared app shell — the portfolio's visual language (floating glass bar, amber-
// family accent, dot-grid ground). A single "← Portfolio" link returns to the
// site root (full load, same origin). Configure per app via props:
//   title  — app name shown in the brand
//   nav    — [{ to, label, end? }] primary destinations
//   mark   — optional lucide icon component for the brand tile
const PORTFOLIO_URL = '/'

function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={cx(
        'relative grid h-9 w-9 place-items-center overflow-hidden rounded-lg border border-hair bg-fill text-muted transition-colors hover:border-neonCyan/40 hover:text-neonCyan',
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: -18, opacity: 0, rotate: -30 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 18, opacity: 0, rotate: 30 }}
          transition={{ duration: 0.2 }}
        >
          {isDark ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

function Brand({ title, mark: Mark, onClick }) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg font-mono text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neonCyan"
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-neonCyan to-neonPurple text-void shadow-[0_0_16px_-4px_rgba(139,132,255,0.55)]">
        {Mark ? <Mark className="h-[18px] w-[18px]" /> : <span className="h-2.5 w-2.5 rounded-[3px] bg-void" />}
      </span>
      <span className="text-ink">{title}</span>
    </Link>
  )
}

const linkBase = 'relative rounded-lg px-3 py-2 text-sm transition-colors'

export function AppShell({ title = 'App', nav = [], mark }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  const isActive = (n) =>
    n.end ? location.pathname === n.to : location.pathname === n.to || location.pathname.startsWith(n.to + '/')

  // Lock scroll + close on Escape while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const portfolioLink =
    'inline-flex items-center gap-1.5 rounded-lg border border-hair bg-fill px-3 py-2 text-sm text-muted transition-colors hover:border-neonCyan/40 hover:text-neonCyan'

  return (
    <div className="relative min-h-dvh">
      {/* Ambient dot-grid ground — same texture the portfolio uses. */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-dot-grid opacity-60 mask-radial-fade" aria-hidden="true" />

      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
        <nav className="glass-strong mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl border border-hair px-4 py-2.5 shadow-lg shadow-black/20 backdrop-blur-xl sm:px-5">
          <Brand title={title} mark={mark} />

          {nav.length > 0 && (
            <ul className="hidden items-center gap-0.5 lg:flex">
              {nav.map((n) => {
                const active = isActive(n)
                return (
                  <li key={n.to}>
                    <NavLink to={n.to} end={n.end} className={cx(linkBase, active ? 'text-ink' : 'text-muted hover:text-ink')}>
                      {active && (
                        <motion.span
                          layoutId="app-nav-active"
                          className="absolute inset-0 -z-10 rounded-lg border border-hair bg-fill"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      {n.label}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="hidden items-center gap-2 lg:flex">
            <ThemeToggle />
            <a href={PORTFOLIO_URL} className={portfolioLink}>
              <ArrowLeft className="h-4 w-4" />
              Portfolio
            </a>
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            {nav.length > 0 && (
              <button
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                aria-expanded={open}
                className="grid h-10 w-10 place-items-center rounded-lg border border-hair bg-fill text-ink"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm lg:hidden"
              aria-hidden="true"
            />
            <motion.aside
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="glass-strong fixed inset-y-0 right-0 z-[71] flex w-[82%] max-w-xs flex-col p-5 lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="flex items-center justify-between">
                <Brand title={title} mark={mark} onClick={() => setOpen(false)} />
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="grid h-10 w-10 place-items-center rounded-lg border border-hair bg-fill text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ul className="mt-6 flex flex-col gap-1">
                {nav.map((n) => (
                  <li key={n.to}>
                    <NavLink
                      to={n.to}
                      end={n.end}
                      onClick={() => setOpen(false)}
                      className={({ isActive: a }) =>
                        cx('block rounded-xl px-4 py-3 text-sm transition-colors', a ? 'bg-fill text-ink' : 'text-muted hover:bg-fill hover:text-ink')
                      }
                    >
                      {n.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
              <a href={PORTFOLIO_URL} className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-hair bg-fill px-4 py-3 text-sm font-medium text-muted transition-colors hover:text-ink">
                <ArrowLeft className="h-4 w-4" />
                Back to portfolio
              </a>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
        <Outlet />
      </main>
    </div>
  )
}
