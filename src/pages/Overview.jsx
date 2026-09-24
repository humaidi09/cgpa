import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Minus,
  TrendingDown,
  TrendingUp,
  Trophy,
  CalendarRange,
  Layers,
} from 'lucide-react'
import { useStore, selectActiveProfile } from '@/store'
import { academicOverview, fmt, fmtCredits } from '@/engine/cgpa'
import { classificationInfo } from '@/lib/classification'
import { Trend } from '@/components/Trend'
import { useCountUp } from '@/lib/useCountUp'
import { Badge, Button, Card, EmptyState, SectionHeading, Stat, cx } from '@/components/ui'
import Reveal from '@/components/Reveal'

// PHASE 3 — Academic overview. A read-only lens on the transcript the calculator
// already holds: every figure here is derived by the engine's academicOverview()
// (which itself reuses the same GPA core as the calculator), so nothing can drift
// out of sync and nothing is invented. Visualisations appear only when they add
// signal — the trend needs at least two graded semesters to mean anything.

const MOMENTUM = {
  improving: { label: 'Improving', tone: 'ok', Icon: TrendingUp },
  declining: { label: 'Declining', tone: 'bad', Icon: TrendingDown },
  stable: { label: 'Stable', tone: 'neutral', Icon: Minus },
  insufficient: { label: 'Not enough data', tone: 'neutral', Icon: Minus },
}

function HeroCGPA({ cgpa, precision, classification }) {
  const anim = useCountUp(cgpa ?? 0)
  const info = classificationInfo(cgpa ?? 0)
  return (
    <Card glow className="relative overflow-hidden p-6 sm:p-8">
      <p className="eyebrow">Cumulative</p>
      <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
        <span className="font-display text-6xl font-bold tracking-tight text-ink tabular-nums sm:text-7xl">
          {cgpa == null ? '—' : fmt(anim, precision)}
        </span>
        {cgpa != null && (
          <Badge tone={info.tone} className="mb-2">
            <info.Icon className="h-3.5 w-3.5" />
            {classification}
          </Badge>
        )}
      </div>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        {cgpa == null ? 'Add graded courses to see your cumulative standing.' : info.blurb}
      </p>
    </Card>
  )
}

function MomentumCard({ momentum, precision }) {
  const m = MOMENTUM[momentum.trend] ?? MOMENTUM.insufficient
  return (
    <Card className="p-6">
      <p className="font-mono text-xs text-muted">Academic momentum</p>
      <div className="mt-3 flex items-center gap-2.5">
        <span
          className={cx(
            'grid h-10 w-10 place-items-center rounded-xl border',
            m.tone === 'ok' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
            m.tone === 'bad' && 'border-red-500/30 bg-red-500/10 text-red-400',
            m.tone === 'neutral' && 'border-hair bg-fill text-muted',
          )}
        >
          <m.Icon className="h-5 w-5" />
        </span>
        <span className="font-display text-2xl font-semibold text-ink">{m.label}</span>
      </div>
      {momentum.trend !== 'insufficient' ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs">
          <div>
            <dt className="text-muted">Trend / semester</dt>
            <dd className="mt-0.5 text-ink tabular-nums">
              {momentum.slope >= 0 ? '+' : ''}
              {fmt(momentum.slope, precision)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">First → last</dt>
            <dd className="mt-0.5 text-ink tabular-nums">
              {momentum.delta >= 0 ? '+' : ''}
              {fmt(momentum.delta, precision)}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-4 text-sm text-muted">Two graded semesters reveal a trend.</p>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-muted/80">
        Least-squares slope of semester GPA over time — a real trend, not a label.
      </p>
    </Card>
  )
}

function Distribution({ distribution }) {
  const rows = distribution.filter((d) => d.count > 0).sort((a, b) => b.point - a.point)
  const total = rows.reduce((a, b) => a + b.count, 0)
  const max = Math.max(1, ...rows.map((d) => d.count))
  if (!rows.length) return null
  return (
    <Card className="p-6">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-xs text-muted">Grade distribution</p>
        <p className="font-mono text-xs text-muted tabular-nums">{total} graded</p>
      </div>
      <ul className="mt-4 space-y-2.5">
        {rows.map((d) => (
          <li key={d.grade} className="flex items-center gap-3">
            <span className="w-9 shrink-0 font-mono text-sm text-ink tabular-nums">{d.grade}</span>
            <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-fill">
              <div
                className="h-full rounded-full bg-neonCyan/70"
                style={{ width: `${(d.count / max) * 100}%` }}
              />
            </div>
            <span className="w-7 shrink-0 text-right font-mono text-xs text-muted tabular-nums">
              {d.count}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function SemesterHighlight({ label, point, precision, tone, Icon }) {
  if (!point) return null
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-muted">
        <Icon className={cx('h-4 w-4', tone === 'ok' && 'text-emerald-400', tone === 'bad' && 'text-red-400')} />
        <p className="font-mono text-xs">{label}</p>
      </div>
      <p className="mt-2 truncate font-display text-lg font-semibold text-ink" title={point.name}>
        {point.name}
      </p>
      <p className="mt-1 font-mono text-sm text-muted tabular-nums">
        GPA {fmt(point.gpa, precision)} · {fmtCredits(point.credits)} cr
      </p>
    </Card>
  )
}

export default function Overview() {
  const semesters = useStore((s) => s.semesters)
  const profile = useStore(selectActiveProfile)
  const precision = useStore((s) => s.settings.precision)
  const policy = useStore((s) => s.settings.retakePolicy)

  const o = academicOverview(semesters, profile, policy)

  const header = (
    <SectionHeading
      eyebrow="Phase 3 · Analytics"
      title="Academic overview"
      sub="Everything here is computed from your entered courses — no estimates, no invented figures."
    />
  )

  if (!o.countedCourses) {
    return (
      <div className="space-y-8">
        {header}
        <EmptyState
          icon={Layers}
          title="Nothing to analyse yet"
          action={
            <Button as={Link} to="/">
              Go to the calculator
            </Button>
          }
        >
          Add graded courses in the calculator and this page fills in with your CGPA, trend, and
          grade distribution.
        </EmptyState>
      </div>
    )
  }

  const showTrend = o.points.length >= 2

  return (
    <div className="space-y-8">
      {header}

      {/* Hero + the six headline figures */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <HeroCGPA cgpa={o.cgpa} precision={precision} classification={o.classification} />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:col-span-2">
          <Stat label="Graded credits" value={fmtCredits(o.totalCredits)} sub="carry grade points" />
          <Stat label="Completed credits" value={fmtCredits(o.earnedCredits)} sub="toward your degree" />
          <Stat label="Counted courses" value={o.countedCourses} sub={`${o.countedSemesters} semesters`} />
          <Stat label="Recent GPA" value={o.recent ? fmt(o.recent.gpa, precision) : '—'} sub={o.recent?.name} />
          <Stat label="Highest GPA" value={o.highest ? fmt(o.highest.gpa, precision) : '—'} sub={o.highest?.name} />
          <Stat label="Lowest GPA" value={o.lowest ? fmt(o.lowest.gpa, precision) : '—'} sub={o.lowest?.name} />
        </div>
      </div>

      {/* Trend — only when there are enough semesters to show movement */}
      {showTrend && (
        <Reveal>
          <Card className="p-6">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="font-mono text-xs text-muted">GPA by semester</p>
              <Link
                to="/planner"
                className="inline-flex items-center gap-1 font-mono text-xs text-neonCyan hover:underline"
              >
                Plan ahead <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <Trend points={o.points.map((p) => ({ label: p.name.replace(/^Semester\s*/i, 'S'), gpa: p.gpa }))} />
          </Card>
        </Reveal>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <MomentumCard momentum={o.momentum} precision={precision} />
        <Distribution distribution={o.distribution} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SemesterHighlight label="Strongest semester" point={o.highest} precision={precision} tone="ok" Icon={Trophy} />
        <SemesterHighlight label="Weakest semester" point={o.lowest} precision={precision} tone="bad" Icon={CalendarRange} />
      </div>
    </div>
  )
}
