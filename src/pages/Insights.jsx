import { Link } from 'react-router-dom'
import {
  Fingerprint, Activity, HeartPulse, Anchor, Zap, ArrowUpRight,
  TrendingUp, TrendingDown, Minus, Trophy,
} from 'lucide-react'
import { useStore, selectActiveProfile } from '@/store'
import { academicOverview, academicFingerprint, cgpaInertia, academicLeverage, maxPoint, minPoint, fmt, fmtCredits } from '@/engine/cgpa'
import { classificationInfo } from '@/lib/classification'
import { Badge, Button, Card, EmptyState, SectionHeading, Stat, cx } from '@/components/ui'
import Reveal from '@/components/Reveal'

// PHASE 7 — Advanced intelligence. Five derived measures, each with its formula
// on the card and an honest "not enough data yet" when the record is too short.
// No scores are invented: consistency is a real standard deviation, recovery is a
// real rebound ratio, inertia and leverage are exact CGPA arithmetic. When a
// figure can't be computed we say so rather than printing a comforting number.

const MOMENTUM = {
  improving: { label: 'Improving', tone: 'ok', Icon: TrendingUp },
  declining: { label: 'Declining', tone: 'bad', Icon: TrendingDown },
  stable: { label: 'Stable', tone: 'neutral', Icon: Minus },
  insufficient: { label: 'Too early', tone: 'neutral', Icon: Minus },
}

// Signature element: a ridgeline of the counted semesters, each bar scaled to the
// grade scale's ceiling — a literal fingerprint of the record, drawn from real GPAs.
function Ridge({ points, maxPt }) {
  if (points.length < 2 || !maxPt) return null
  return (
    <div className="flex h-14 items-end gap-1" aria-hidden="true">
      {points.map((p, i) => (
        <div key={p.id ?? i} className="flex-1 rounded-sm bg-neonCyan/50" style={{ height: `${Math.max(6, (p.gpa / maxPt) * 100)}%` }} title={`${p.name}: ${fmt(p.gpa, 2)}`} />
      ))}
    </div>
  )
}

function Trait({ label, value, sub }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 truncate font-display text-lg font-semibold text-ink">{value}</p>
      {sub && <p className="truncate font-mono text-[11px] text-muted/70">{sub}</p>}
    </div>
  )
}

function ScoreCard({ icon: Icon, title, score, defined, formula, children }) {
  const s = defined && Number.isFinite(score) ? Math.round(score) : null
  return (
    <Card className="flex flex-col p-6">
      <div className="flex items-center gap-2 text-muted"><Icon className="h-4 w-4" /><p className="font-mono text-xs">{title}</p></div>
      <div className="mt-3 flex items-end gap-2">
        <span className="font-display text-5xl font-bold text-ink tabular-nums">{s == null ? '—' : s}</span>
        {s != null && <span className="mb-1.5 font-mono text-xs text-muted">/ 100</span>}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill">
        <div className="h-full rounded-full bg-neonCyan/70 transition-[width] duration-500" style={{ width: `${s ?? 0}%` }} />
      </div>
      <div className="mt-3 flex-1 text-sm text-muted">{children}</div>
      {formula && <p className="mt-3 font-mono text-[11px] text-muted/70">{formula}</p>}
    </Card>
  )
}

export default function Insights() {
  const semesters = useStore((s) => s.semesters)
  const profile = useStore(selectActiveProfile)
  const precision = useStore((s) => s.settings.precision)
  const policy = useStore((s) => s.settings.retakePolicy)

  const o = academicOverview(semesters, profile, policy)
  const fp = academicFingerprint(semesters, profile, policy)
  const maxPt = maxPoint(profile)
  const minPt = minPoint(profile)
  const inertia = cgpaInertia({ completedCredits: o.totalCredits, currentCGPA: o.cgpa, maxPt, minPt })
  const leverage = academicLeverage(semesters, profile, policy)

  const header = <SectionHeading eyebrow="Phase 7 · Intelligence" title="Academic intelligence" sub="Five measures read straight off your record — each with its formula, and an honest blank where there isn't enough data yet." />

  if (!o.countedCourses) {
    return (
      <div className="space-y-8">
        {header}
        <EmptyState icon={Fingerprint} title="No record to read yet" action={<Button as={Link} to="/">Go to the calculator</Button>}>
          These measures need graded semesters. Add courses in the calculator and your academic fingerprint takes shape here.
        </EmptyState>
      </div>
    )
  }

  const mom = MOMENTUM[fp.momentum.trend] ?? MOMENTUM.insufficient
  const bestLoad = fp.creditStrength.filter((c) => c.avgPoint != null).sort((a, b) => b.avgPoint - a.avgPoint)[0]
  const info = classificationInfo(o.cgpa ?? 0)

  return (
    <div className="space-y-8">
      {header}

      {/* Fingerprint — the signature summary */}
      <Card glow className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2 text-muted">
            <Fingerprint className="h-4 w-4" />
            <p className="font-mono text-xs">Academic fingerprint</p>
          </div>
          {o.cgpa != null && <Badge tone={info.tone}><info.Icon className="h-3.5 w-3.5" />{o.classification}</Badge>}
        </div>

        <div className="mt-5"><Ridge points={o.points} maxPt={maxPt} /></div>

        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
          <Trait label="Standing" value={o.cgpa == null ? '—' : fmt(o.cgpa, precision)} sub="cumulative CGPA" />
          <Trait label="Trajectory" value={mom.label} sub={fp.momentum.trend !== 'insufficient' ? `${fp.momentum.slope >= 0 ? '+' : ''}${fmt(fp.momentum.slope, precision)}/sem` : 'need 2 sems'} />
          <Trait label="Consistency" value={fp.consistency.defined ? `${Math.round(fp.consistency.score)}/100` : '—'} sub={fp.consistency.defined ? `SD ${fmt(fp.consistency.sd, 2)}` : 'need 2 sems'} />
          <Trait label="Resilience" value={fp.recovery.defined ? `${Math.round(fp.recovery.score)}/100` : '—'} sub={fp.recovery.defined ? `${fp.recovery.events} dip${fp.recovery.events === 1 ? '' : 's'}` : (fp.recovery.noDips ? 'no dips' : 'need 3 sems')} />
          <Trait label="Best at" value={bestLoad ? `${fmtCredits(bestLoad.credits)}-cr` : '—'} sub={bestLoad ? `avg ${fmt(bestLoad.avgPoint, 2)}` : 'courses'} />
          <Trait label="Top grade" value={fp.topGrade ? fp.topGrade.grade : '—'} sub={fp.topGrade ? `×${fp.topGrade.count}` : 'no grades'} />
        </div>
      </Card>

      {/* Consistency + Recovery */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ScoreCard icon={Activity} title="Consistency index" score={fp.consistency.score} defined={fp.consistency.defined} formula="100 × (1 − SD ÷ 0.5) · SD = population std-dev of semester GPAs">
          {fp.consistency.defined ? (
            <>Your semester GPAs hold a standard deviation of <span className="text-ink tabular-nums">{fmt(fp.consistency.sd, 3)}</span> around a mean of <span className="text-ink tabular-nums">{fmt(fp.consistency.mean, precision)}</span> across {fp.consistency.n} semesters. Higher means steadier.</>
          ) : (
            <>Needs at least <span className="text-ink">2 graded semesters</span> to measure how tightly your GPAs cluster. You have {fp.consistency.n}.</>
          )}
        </ScoreCard>

        <ScoreCard icon={HeartPulse} title="Recovery index" score={fp.recovery.score} defined={fp.recovery.defined} formula="mean rebound ÷ mean drop × 100 · measured across every dip">
          {fp.recovery.defined ? (
            <>After a dip your GPA rebounds by <span className="text-ink tabular-nums">{fmt(fp.recovery.meanRebound, 2)}</span> on average against a mean drop of <span className="text-ink tabular-nums">{fmt(fp.recovery.meanDrop, 2)}</span>, over {fp.recovery.events} recovery event{fp.recovery.events === 1 ? '' : 's'}.</>
          ) : fp.recovery.noDips ? (
            <>No dips to recover from — your semester GPA hasn't fallen from one term to the next. Nothing to score, and that's a good sign.</>
          ) : (
            <>Needs at least <span className="text-ink">3 graded semesters</span> to see how you rebound after a dip. You have {fp.recovery.n}.</>
          )}
        </ScoreCard>
      </div>

      {/* CGPA inertia */}
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted"><Anchor className="h-4 w-4" /><p className="font-mono text-xs">CGPA inertia</p></div>
        {inertia.defined ? (
          <>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              With <span className="text-ink tabular-nums">{fmtCredits(inertia.completedCredits)}</span> credits banked at <span className="text-ink tabular-nums">{fmt(inertia.currentCGPA, precision)}</span>, this is how far one more credit — or a full {inertia.termCredits}-credit term — can still move your CGPA. The more you've completed, the smaller each move.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="+1 credit at top" value={`+${fmt(inertia.perCreditUp, 3)}`} sub="best a single credit can do" />
              <Stat label="+1 credit at bottom" value={fmt(inertia.perCreditDown, 3)} sub="worst a single credit can do" />
              <Stat label={`+${inertia.termCredits} cr all top`} value={`+${fmt(inertia.termMaxSwingUp, 3)}`} sub="a perfect term ahead" />
              <Stat label={`+${inertia.termCredits} cr all bottom`} value={fmt(inertia.termMaxSwingDown, 3)} sub="a failed term ahead" />
            </div>
            <p className="mt-4 font-mono text-[11px] text-muted/70">
              move = (points + added) ÷ (credits + added) − current · exact from the same pooling the calculator uses
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">Add graded credits to see how much weight your CGPA already carries.</p>
        )}
      </Card>

      {/* Academic leverage */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hair px-6 py-4">
          <div className="flex items-center gap-2 text-muted"><Zap className="h-4 w-4" /><p className="font-mono text-xs">Academic leverage</p></div>
          <Link to="/simulator" className="inline-flex items-center gap-1 font-mono text-xs text-neonCyan hover:underline">Model in simulator <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </div>
        {leverage.opportunities.length ? (
          <>
            <p className="px-6 pt-4 text-sm text-muted">Lifting these to the top grade moves your CGPA the most — ranked by exact gain.</p>
            <ul className="mt-2 divide-y divide-hair">
              {leverage.opportunities.map((it) => (
                <li key={it.id} className="flex items-center gap-4 px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <Link to={`/courses/${it.id}`} className="truncate text-sm text-ink hover:text-neonCyan">
                      <span className="font-mono text-muted">{it.code || '—'}</span> {it.name || 'Untitled course'}
                    </Link>
                    <p className="truncate font-mono text-[11px] text-muted/70">{it.semesterName} · {fmtCredits(it.credits)} cr · now {it.grade}</p>
                  </div>
                  <Badge tone="ok"><TrendingUp className="h-3.5 w-3.5" />+{fmt(it.gainToMax, 3)}</Badge>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="flex items-center gap-3 px-6 py-8 text-sm text-muted">
            <Trophy className="h-5 w-5 text-amber-400" />
            Every counted course is already at the top grade — there's no leverage left to find.
          </div>
        )}
      </Card>
    </div>
  )
}
