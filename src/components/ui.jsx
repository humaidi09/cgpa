import { cx } from '@/lib/cx'

// Shared UI primitives in the portfolio's language: black glass surfaces, warm
// hairlines, the amber-family accent (bg-neonCyan / text-neonCyan), Fraunces for
// headings (font-display), Inter for body, JetBrains Mono for labels (font-mono).
// Every app builds its screens from these so the whole ecosystem reads as one.

/* -------------------------------------------------------------- buttons ---- */

const BTN = {
  primary:
    'bg-neonCyan text-void hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
  outline:
    'border border-hair bg-fill text-ink hover:bg-fill-strong disabled:opacity-50 disabled:cursor-not-allowed',
  ghost: 'text-muted hover:text-ink hover:bg-fill disabled:opacity-50',
  danger: 'bg-red-500/90 text-white hover:bg-red-500 disabled:opacity-50',
}
const BTN_SIZE = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-5 text-sm', lg: 'h-12 px-6 text-base' }

export function Button({ variant = 'primary', size = 'md', className, as: As = 'button', ...props }) {
  return (
    <As
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neonCyan',
        BTN[variant],
        BTN_SIZE[size],
        className,
      )}
      {...props}
    />
  )
}

/* --------------------------------------------------------------- cards ----- */

export function Card({ className, glow = false, children, ...props }) {
  return (
    <div className={cx('glass rounded-2xl border border-hair', glow && 'glass-glow', className)} {...props}>
      {children}
    </div>
  )
}

export function Panel({ className, children, ...props }) {
  return (
    <div className={cx('rounded-2xl border border-hair bg-fill', className)} {...props}>
      {children}
    </div>
  )
}

/* -------------------------------------------------------------- headings --- */

export function SectionHeading({ eyebrow, title, sub, className }) {
  return (
    <div className={className}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h2>
      {sub && <p className="mt-2 max-w-2xl leading-relaxed text-muted">{sub}</p>}
    </div>
  )
}

export function Divider({ className }) {
  return <div className={cx('rule-gradient my-8', className)} aria-hidden="true" />
}

/* ------------------------------------------------------------- segmented --- */

// A pill-style segmented control (tabs). The active segment fills with the
// accent; text uses --color-void so it stays legible in both themes (void flips
// black↔paper as the accent flips light↔dark). Fully keyboard operable.
export function Segmented({ options, value, onChange, size = 'md', className, ariaLabel }) {
  const h = size === 'sm' ? 'h-8' : 'h-9'
  const text = size === 'sm' ? 'text-xs' : 'text-sm'
  return (
    <div role="tablist" aria-label={ariaLabel} className={cx('inline-flex rounded-xl border border-hair bg-fill p-1', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'relative rounded-lg px-3.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neonCyan',
              h,
              text,
              active ? 'text-void' : 'text-muted hover:text-ink',
            )}
          >
            {active && <span className="absolute inset-0 rounded-lg bg-neonCyan" aria-hidden="true" />}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* --------------------------------------------------------------- badges ---- */

const TONE = {
  neutral: 'border-hair bg-fill text-muted',
  accent: 'border-neonCyan/30 bg-neonCyan/10 text-neonCyan',
  ok: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  bad: 'border-red-500/30 bg-red-500/10 text-red-400',
}

export function Badge({ tone = 'neutral', className, children }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium', TONE[tone], className)}>
      {children}
    </span>
  )
}

/* ---------------------------------------------------------------- stats ---- */

export function Stat({ label, value, sub, className }) {
  return (
    <div className={cx('rounded-2xl border border-hair bg-fill p-5', className)}>
      <p className="font-mono text-xs text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold tracking-tight text-ink tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  )
}

/* ------------------------------------------------------------ form fields -- */

export function Field({ label, hint, error, htmlFor, className, children }) {
  return (
    <label htmlFor={htmlFor} className={cx('block', className)}>
      {label && <span className="mb-1.5 block font-mono text-xs text-muted">{label}</span>}
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-red-400">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  )
}

const CONTROL =
  'w-full rounded-xl border border-hair bg-fill px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 transition-colors focus:border-neonCyan/50 focus:outline-none focus:ring-2 focus:ring-neonCyan/20'

export function Input({ className, invalid, ...props }) {
  return <input className={cx(CONTROL, invalid && 'border-red-500/60', className)} {...props} />
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cx(CONTROL, 'appearance-none pr-9', className)} {...props}>
      {children}
    </select>
  )
}

export function Textarea({ className, invalid, rows = 4, ...props }) {
  return (
    <textarea
      rows={rows}
      className={cx(CONTROL, 'min-h-[88px] resize-y leading-relaxed', invalid && 'border-red-500/60', className)}
      {...props}
    />
  )
}

export function Toggle({ checked, onChange, label, id }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors',
          checked ? 'border-neonCyan/40 bg-neonCyan/80' : 'border-hair bg-fill',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 h-4 w-4 rounded-full bg-void transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
      {label && <span className="text-sm text-ink">{label}</span>}
    </label>
  )
}

/* --------------------------------------------------------------- callout --- */

const CALLOUT = {
  info: 'border-neonCyan/25 bg-neonCyan/[0.06] text-ink',
  ok: 'border-emerald-500/25 bg-emerald-500/[0.07] text-ink',
  warn: 'border-amber-500/25 bg-amber-500/[0.07] text-ink',
  bad: 'border-red-500/25 bg-red-500/[0.07] text-ink',
}

export function Callout({ tone = 'info', icon: Icon, title, className, children }) {
  return (
    <div className={cx('flex gap-3 rounded-xl border p-4', CALLOUT[tone], className)} role={tone === 'bad' ? 'alert' : undefined}>
      {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0" />}
      <div className="min-w-0 text-sm leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cx(title && 'mt-1', 'text-muted')}>{children}</div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ empty state -- */

export function EmptyState({ icon: Icon, title, children, action, className }) {
  return (
    <div className={cx('flex flex-col items-center justify-center rounded-2xl border border-dashed border-hair bg-fill/50 px-6 py-16 text-center', className)}>
      {Icon && (
        <span className="grid h-12 w-12 place-items-center rounded-xl border border-hair bg-fill text-neonCyan">
          <Icon className="h-6 w-6" />
        </span>
      )}
      {title && <h3 className="mt-4 font-display text-lg font-semibold text-ink">{title}</h3>}
      {children && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export { cx }
