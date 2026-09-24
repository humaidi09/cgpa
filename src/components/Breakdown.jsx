import { DEFAULT_RETAKE_POLICY, courseDetail, fmt, fmtCredits } from '@/engine/cgpa'

// The "show your work" panel — the calculation laid out like a worked solution,
// so a student can see exactly where every figure comes from. Monospace and
// right-aligned numbers so the columns line up like a ledger. Purely presented
// from the engine's own numbers; nothing is recomputed here by hand.

function Line({ label, value, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={strong ? 'text-ink' : 'text-muted'}>{label}</span>
      <span className={strong ? 'tabular-nums text-ink' : 'tabular-nums text-muted'}>{value}</span>
    </div>
  )
}

function Scope({ name, courses, summary, profile, precision, policy }) {
  const counted = (courses || [])
    .map((c) => ({ c, d: courseDetail(c, profile, policy) }))
    .filter((x) => x.d.includedInGpa)
  const gpaExact = summary.gpa

  return (
    <div className="rounded-xl border border-hair bg-fill/40 p-4 font-mono text-xs leading-relaxed">
      <p className="mb-2 font-sans text-sm font-semibold text-ink">{name}</p>

      {counted.length === 0 ? (
        <p className="text-muted">No counted courses yet.</p>
      ) : (
        <>
          <div className="space-y-0.5">
            {counted.map(({ c, d }) => (
              <div key={c.id} className="flex items-baseline justify-between gap-4">
                <span className="min-w-0 truncate text-muted">
                  {(c.code || c.name || 'Course').toString()}
                  <span className="text-muted/60">
                    {' '}
                    {fmtCredits(d.credits)} × {fmt(d.point, precision)}
                  </span>
                </span>
                <span className="tabular-nums text-ink">{fmt(d.qualityPoints, precision)}</span>
              </div>
            ))}
          </div>

          <div className="my-2 h-px bg-hair" />
          <Line label="Σ quality points" value={fmt(summary.qualityPoints, precision)} strong />
          <Line label="Σ credits" value={fmtCredits(summary.credits)} strong />
          <div className="mt-2 rounded-lg bg-neonCyan/[0.07] px-2 py-1.5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-muted">
                {fmt(summary.qualityPoints, precision)} ÷ {fmtCredits(summary.credits)}
              </span>
              <span className="tabular-nums font-semibold text-neonCyan">= {fmt(gpaExact, precision)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function Breakdown({ scopes, cumulative, cumulativeLabel = 'Cumulative CGPA', profile, precision, policy = DEFAULT_RETAKE_POLICY }) {
  return (
    <div className="space-y-3">
      {scopes.map((s) => (
        <Scope
          key={s.id || s.name}
          name={s.name}
          courses={s.courses}
          summary={s.summary}
          profile={profile}
          precision={precision}
          policy={policy}
        />
      ))}

      {cumulative && (
        <div className="rounded-xl border border-neonCyan/25 bg-neonCyan/[0.05] p-4 font-mono text-xs leading-relaxed">
          <p className="mb-2 font-sans text-sm font-semibold text-ink">{cumulativeLabel}</p>
          <Line label="Σ quality points (all courses)" value={fmt(cumulative.qualityPoints, precision)} strong />
          <Line label="Σ credits (all courses)" value={fmtCredits(cumulative.credits)} strong />
          <div className="mt-2 flex items-baseline justify-between gap-4 rounded-lg bg-neonCyan/[0.1] px-2 py-1.5">
            <span className="text-muted">
              {fmt(cumulative.qualityPoints, precision)} ÷ {fmtCredits(cumulative.credits)}
            </span>
            <span className="tabular-nums font-semibold text-neonCyan">= {fmt(cumulative.gpa, precision)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
