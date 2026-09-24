import { ListTree } from 'lucide-react'
import { fmt, fmtCredits } from '@/engine/cgpa'
import { Callout, Toggle, cx } from '@/components/ui'

// The result rail — the number the student came for, shown large, with the raw
// totals it was built from and a toggle for the full breakdown. Values are the
// engine's; this only formats them. A null figure renders as an em dash, never a
// broken number.

function Metric({ label, value, mono = true }) {
  return (
    <div className="rounded-xl border border-hair bg-fill/60 px-3 py-2.5">
      <p className="font-mono text-[11px] text-muted">{label}</p>
      <p className={cx('mt-0.5 text-lg font-semibold text-ink tabular-nums', mono && 'font-display')}>{value}</p>
    </div>
  )
}

export function ResultPanel({
  label,
  value,
  precision,
  credits,
  qualityPoints,
  counted,
  total,
  earnedCredits,
  secondary,
  warnings = [],
  showBreakdown,
  onToggleBreakdown,
}) {
  // Earned credit only tells a different story than GPA credit when a course
  // earns credit without grade points (a passed Pass/Fail). Show it only then,
  // so the rail stays quiet in the common case.
  const showEarned = Number.isFinite(earnedCredits) && earnedCredits !== credits

  return (
    <div className="glass glass-glow rounded-2xl border border-hair p-5 sm:p-6">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 font-display text-6xl font-bold leading-none tabular-nums text-gradient">
        {fmt(value, precision)}
      </p>

      {secondary && (
        <p className="mt-2 font-mono text-xs text-muted">
          {secondary.label}: <span className="text-ink">{fmt(secondary.value, precision)}</span>
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Metric label="Total credits" value={fmtCredits(credits)} />
        <Metric label="Quality points" value={fmt(qualityPoints, precision)} />
        <div className="col-span-2">
          <Metric
            label="Courses counted"
            value={
              <span>
                {counted}
                <span className="text-sm font-normal text-muted"> / {total} entered</span>
              </span>
            }
            mono={false}
          />
        </div>
      </div>

      {showEarned && (
        <p className="mt-2 font-mono text-[11px] text-muted">
          Earned credits: <span className="text-ink">{fmtCredits(earnedCredits)}</span>{' '}
          <span className="opacity-70">— includes pass/fail credit not in the GPA</span>
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-hair bg-fill/60 px-3 py-2.5">
        <span className="inline-flex items-center gap-2 text-sm text-ink">
          <ListTree className="h-4 w-4 text-muted" />
          Calculation breakdown
        </span>
        <Toggle checked={showBreakdown} onChange={onToggleBreakdown} id="breakdown-toggle" />
      </div>

      {warnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {warnings.map((w, i) => (
            <Callout key={i} tone="warn">
              {w}
            </Callout>
          ))}
        </div>
      )}
    </div>
  )
}
