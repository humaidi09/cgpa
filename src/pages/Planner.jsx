import { useMemo, useState } from 'react'
import { Target, ArrowDownToLine, ArrowUpToLine, CheckCircle2, TriangleAlert, Info, RotateCcw } from 'lucide-react'
import { useStore, selectActiveProfile } from '@/store'
import {
  academicOverview,
  calculateRequiredGPA,
  calculateCGPACeiling,
  calculateCGPAFloor,
  gradeBudget,
  goalToGrades,
  gradeForAverage,
  maxPoint,
  minPoint,
  fmt,
  fmtCredits,
} from '@/engine/cgpa'
import { useCountUp } from '@/lib/useCountUp'
import { Badge, Callout, Card, Field, Input, SectionHeading, Stat } from '@/components/ui'
import Reveal from '@/components/Reveal'

// PHASE 4 — Planning. Turns the transcript into a plan: what the remaining
// credits must average to hit a target, the best/worst still reachable, the
// grade combinations that get there, and how much room the target leaves for
// slips. Prefilled from the calculator but fully editable — you can plan a
// degree you haven't started. All arithmetic is the engine's; formulas shown.

const num = (v) => (v === '' || v == null ? NaN : Number(v))

function GoalToGrades({ requiredAvg, profile }) {
  const [count, setCount] = useState('5')
  const k = Math.max(1, Math.min(8, Math.round(num(count)) || 5))
  const combos = useMemo(() => goalToGrades({ requiredAvg, courseCount: k, profile, limit: 6 }), [requiredAvg, k, profile])
  const single = gradeForAverage(profile, requiredAvg)

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted">Goal → grades</p>
          <p className="mt-1 text-sm text-muted">Grade combinations that clear the required average.</p>
        </div>
        <Field label="Courses ahead" className="w-28">
          <Input type="number" min="1" max="8" value={count} onChange={(e) => setCount(e.target.value)} className="tabular-nums" />
        </Field>
      </div>

      {Number.isFinite(requiredAvg) ? (
        <>
          <p className="mt-4 text-sm text-ink">
            Straight grades: you'd need{' '}
            {single ? <Badge tone="accent">{single.grade} in every course</Badge> : <span className="text-muted">no single grade reaches it</span>}.
          </p>
          {combos.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {combos.map((c, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-hair bg-fill/50 px-4 py-2.5">
                  <span className="font-mono text-sm text-ink">
                    {c.breakdown.map((b) => `${b.count}× ${b.grade}`).join('  +  ')}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted tabular-nums">avg {fmt(c.avg)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No combination of {k} courses can reach that average — the target is out of reach over this many courses.</p>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-muted">Enter a target and remaining credits to see grade combinations.</p>
      )}
    </Card>
  )
}

export default function Planner() {
  const semesters = useStore((s) => s.semesters)
  const profile = useStore(selectActiveProfile)
  const precision = useStore((s) => s.settings.precision)
  const policy = useStore((s) => s.settings.retakePolicy)

  const o = academicOverview(semesters, profile, policy)
  const maxPt = maxPoint(profile)
  const minPt = minPoint(profile)

  // Prefill from the transcript, but every field is editable so a plan can start
  // from scratch. "Use my transcript" re-syncs after edits.
  const transcript = () => ({
    currentCGPA: o.cgpa != null ? fmt(o.cgpa, precision) : '',
    completedCredits: o.totalCredits ? String(o.totalCredits) : '',
  })
  const [form, setForm] = useState(() => ({ ...transcript(), remainingCredits: '15', targetCGPA: '3.75' }))
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const cur = num(form.currentCGPA)
  const done = num(form.completedCredits)
  const rem = num(form.remainingCredits)
  const target = num(form.targetCGPA)
  const qp = (Number.isFinite(cur) ? cur : 0) * (Number.isFinite(done) ? done : 0)

  const req = calculateRequiredGPA({ currentCGPA: cur, completedCredits: done, remainingCredits: rem, targetCGPA: target, maxPt, minPt })
  const ceiling = calculateCGPACeiling({ currentQualityPoints: qp, completedCredits: done, remainingCredits: rem, maxPt })
  const floor = calculateCGPAFloor({ currentQualityPoints: qp, completedCredits: done, remainingCredits: rem, minPt })
  const budget = gradeBudget({ currentQualityPoints: qp, completedCredits: done, remainingCredits: rem, targetCGPA: target, maxPt })

  const needed = req.valid && req.needsRemaining ? req.needed : null
  const anim = useCountUp(needed ?? 0)

  // Feasibility verdict — honest about impossible targets.
  let verdict = null
  if (req.valid && req.needsRemaining) {
    if (req.alreadyMet) verdict = { tone: 'ok', Icon: CheckCircle2, title: 'Target already reached', body: 'Your current CGPA is at or above the target. Any passing grades keep you there or higher.' }
    else if (needed <= minPt + 1e-9) verdict = { tone: 'ok', Icon: CheckCircle2, title: 'Effectively guaranteed', body: `Even the lowest grades over ${fmtCredits(rem)} credits keep you at the target.` }
    else if (req.feasible) verdict = { tone: needed > (maxPt ?? 4) - 0.25 ? 'warn' : 'info', Icon: needed > (maxPt ?? 4) - 0.25 ? TriangleAlert : Info, title: `Need ${fmt(needed, precision)} average`, body: `Across the remaining ${fmtCredits(rem)} credits — the ceiling with all top grades is ${fmt(ceiling, precision)}.` }
    else verdict = { tone: 'bad', Icon: TriangleAlert, title: 'Not reachable', body: `Even straight ${profile.grades[0]?.grade ?? 'top'} grades top out at ${fmt(ceiling, precision)} over ${fmtCredits(rem)} credits. Add more credits or lower the target.` }
  } else if (req.valid && !req.needsRemaining) {
    verdict = { tone: req.alreadyMet ? 'ok' : 'warn', Icon: req.alreadyMet ? CheckCircle2 : Info, title: req.alreadyMet ? 'Target met' : 'Add remaining credits', body: req.alreadyMet ? 'Your current CGPA already meets the target.' : 'Enter how many credits you have left to plan for.' }
  }

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Phase 4 · Planning" title="Plan your CGPA" sub="Set a target and see exactly what the road ahead requires — every figure is calculated, nothing is guessed." />

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Inputs */}
        <Card className="p-6 lg:col-span-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-muted">Target calculator</p>
            <button
              type="button"
              onClick={() => set(transcript())}
              className="inline-flex items-center gap-1.5 font-mono text-xs text-muted transition-colors hover:text-neonCyan"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Use my transcript
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Field label="Current CGPA" hint={o.cgpa != null ? `transcript: ${fmt(o.cgpa, precision)}` : 'no data yet'}>
              <Input type="number" step="0.01" min="0" value={form.currentCGPA} onChange={(e) => set({ currentCGPA: e.target.value })} className="tabular-nums" placeholder="0.00" />
            </Field>
            <Field label="Completed credits" hint={o.totalCredits ? `transcript: ${fmtCredits(o.totalCredits)}` : 'no data yet'}>
              <Input type="number" step="0.5" min="0" value={form.completedCredits} onChange={(e) => set({ completedCredits: e.target.value })} className="tabular-nums" placeholder="0" />
            </Field>
            <Field label="Remaining credits">
              <Input type="number" step="0.5" min="0" value={form.remainingCredits} onChange={(e) => set({ remainingCredits: e.target.value })} className="tabular-nums" placeholder="15" />
            </Field>
            <Field label="Target CGPA">
              <Input type="number" step="0.01" min="0" max={maxPt ?? 4} value={form.targetCGPA} onChange={(e) => set({ targetCGPA: e.target.value })} className="tabular-nums" placeholder="3.75" />
            </Field>
          </div>
        </Card>

        {/* Required GPA headline */}
        <Card glow className="flex flex-col justify-center p-6 lg:col-span-2">
          <div className="flex items-center gap-2 text-muted">
            <Target className="h-4 w-4" />
            <p className="font-mono text-xs">Required future GPA</p>
          </div>
          <p className="mt-2 font-display text-6xl font-bold tracking-tight text-ink tabular-nums">
            {needed == null ? '—' : fmt(anim, precision)}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted/80">
            needed = (target × (done + remaining) − points done) ÷ remaining
          </p>
        </Card>
      </div>

      {verdict && (
        <Reveal>
          <Callout tone={verdict.tone} icon={verdict.Icon} title={verdict.title}>
            {verdict.body}
          </Callout>
        </Reveal>
      )}

      {/* Ceiling / Floor / Budget */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="CGPA ceiling" value={fmt(ceiling, precision)} sub={<span className="inline-flex items-center gap-1"><ArrowUpToLine className="h-3 w-3" /> all top grades ahead</span>} />
        <Stat label="CGPA floor" value={fmt(floor, precision)} sub={<span className="inline-flex items-center gap-1"><ArrowDownToLine className="h-3 w-3" /> all lowest grades ahead</span>} />
        <Stat
          label="Grade budget"
          value={budget.valid ? `${fmtCredits(budget.forgivableCredits)} cr` : '—'}
          sub={budget.valid ? `${fmt(budget.slack)} quality points of slack` : 'set a target + credits'}
        />
      </div>
      {budget.valid && budget.slack < 0 && (
        <Callout tone="warn" icon={TriangleAlert} title="Over budget">
          The target needs more quality points than the remaining credits can hold at top grades — it isn't reachable without more credits.
        </Callout>
      )}

      <GoalToGrades requiredAvg={needed} profile={profile} />

      <p className="text-center font-mono text-[11px] text-muted/70">
        Ceiling / floor pool your current {fmt(qp, precision)} quality points over {fmtCredits(done)} credits with the remaining {fmtCredits(rem)} at the top / bottom grade.
      </p>
    </div>
  )
}
