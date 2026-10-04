// The ①—⑤ progress indicator across the top of the wizard.
//
// Two jobs: tell the student where they are, and let them step back to any
// earlier step to fix something. Steps ahead of the furthest-reached one are not
// clickable, so nobody lands on "Download" before there is a deck to download.

import { Check } from 'lucide-react'
import { cx } from '@/components/ui'

export default function Stepper({ steps, current, furthest, onGo }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2" aria-label="Steps">
      {steps.map((label, i) => {
        const done = i < furthest
        const active = i === current
        const reachable = i <= furthest
        return (
          <li key={label} className="flex items-center">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onGo(i)}
              aria-current={active ? 'step' : undefined}
              className={cx(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'border-neonCyan/60 bg-neonCyan/10 text-ink'
                  : done
                  ? 'border-hair bg-fill text-muted hover:text-ink'
                  : reachable
                  ? 'border-hair bg-fill text-muted hover:text-ink'
                  : 'border-hair/60 text-muted/50',
              )}
            >
              <span
                className={cx(
                  'grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[11px]',
                  active ? 'bg-neonCyan text-void' : done ? 'bg-neonCyan/20 text-neonCyan' : 'bg-fill-strong text-muted',
                )}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < steps.length - 1 && <span className="mx-1 h-px w-4 bg-hair sm:w-6" aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}
