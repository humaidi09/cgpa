import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FlaskConical, RotateCcw, Plus, Trash2, ArrowRight, TrendingUp, TrendingDown, Minus, Repeat, Layers } from 'lucide-react'
import { useStore, selectActiveProfile } from '@/store'
import {
  academicOverview,
  calculateCourseImpact,
  simulateCGPA,
  calculateRetakeImpact,
  RETAKE_POLICIES,
  fmt,
  fmtCredits,
} from '@/engine/cgpa'
import { useCountUp } from '@/lib/useCountUp'
import { Badge, Button, Callout, Card, EmptyState, Field, Input, SectionHeading, Select, cx } from '@/components/ui'
import Reveal from '@/components/Reveal'

// PHASE 5 — Simulation. Every figure here is a real recomputation, never an
// estimate: change a grade, bolt on a future term, or model a retake, and the
// engine re-pools the exact same courses through the exact same CGPA formula the
// calculator uses. Current and simulated can therefore never disagree — the diff
// is the whole point, and it's always arithmetic.

const num = (v) => (v === '' || v == null ? NaN : Number(v))
const rid = () => `x-${Math.random().toString(36).slice(2, 9)}`

function DeltaPill({ delta, precision }) {
  if (delta == null) return <Badge tone="neutral"><Minus className="h-3.5 w-3.5" /> no change</Badge>
  const up = delta > 1e-9
  const down = delta < -1e-9
  const tone = up ? 'ok' : down ? 'bad' : 'neutral'
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus
  return (
    <Badge tone={tone}>
      <Icon className="h-3.5 w-3.5" />
      {delta >= 0 ? '+' : ''}
      {fmt(delta, precision)}
    </Badge>
  )
}

function RetakeAnalyzer({ profile, overview, policy, precision }) {
  const [form, setForm] = useState({ oldGrade: '', newGrade: '', credit: '3' })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const r = calculateRetakeImpact({
    oldGrade: form.oldGrade,
    newGrade: form.newGrade,
    credit: num(form.credit),
    currentQualityPoints: overview.qualityPoints,
    completedCredits: overview.totalCredits,
    profile,
    policy,
  })
  const policyMeta = RETAKE_POLICIES.find((p) => p.value === policy)

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-muted">
        <Repeat className="h-4 w-4" />
        <p className="font-mono text-xs">Retake / improvement analyzer</p>
      </div>
      <p className="mt-2 text-sm text-muted">
        Model repeating a course you've already taken. Uses your <span className="text-ink">{policyMeta?.label.toLowerCase()}</span> policy.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Field label="Old grade">
          <Select value={form.oldGrade} onChange={(e) => set({ oldGrade: e.target.value })}>
            <option value="">—</option>
            {profile.grades.map((g) => <option key={g.grade} value={g.grade}>{g.grade}</option>)}
          </Select>
        </Field>
        <Field label="New grade">
          <Select value={form.newGrade} onChange={(e) => set({ newGrade: e.target.value })}>
            <option value="">—</option>
            {profile.grades.map((g) => <option key={g.grade} value={g.grade}>{g.grade}</option>)}
          </Select>
        </Field>
        <Field label="Credits">
          <Input type="number" min="0" step="0.5" value={form.credit} onChange={(e) => set({ credit: e.target.value })} className="tabular-nums" />
        </Field>
      </div>

      {r.valid ? (
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <div className="flex items-baseline gap-2 font-display tabular-nums">
            <span className="text-2xl font-semibold text-muted">{fmt(r.before, precision)}</span>
            <ArrowRight className="h-4 w-4 self-center text-muted" />
            <span className="text-3xl font-bold text-ink">{fmt(r.after, precision)}</span>
          </div>
          <DeltaPill delta={r.improvement} precision={precision} />
          <span className="font-mono text-[11px] text-muted">
            {policy === 'all' ? 'new attempt added on top' : 'old attempt swapped out'}
          </span>
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted">Pick both grades and a credit value — and enter some graded courses first — to see the effect.</p>
      )}
    </Card>
  )
}

export default function Simulator() {
  const semesters = useStore((s) => s.semesters)
  const profile = useStore(selectActiveProfile)
  const precision = useStore((s) => s.settings.precision)
  const policy = useStore((s) => s.settings.retakePolicy)

  const [overrides, setOverrides] = useState({}) // { [courseId]: grade }
  const [extras, setExtras] = useState([]) // [{ id, credits, grade }]

  const o = academicOverview(semesters, profile, policy)
  const impact = calculateCourseImpact(semesters, profile, policy)

  // Only overrides that actually differ from the recorded grade count as changes.
  const changed = Object.entries(overrides).filter(([id, g]) => {
    const it = impact.items.find((i) => i.id === id)
    return it && g && g !== it.grade
  })
  const ovrMap = Object.fromEntries(changed.map(([id, g]) => [id, { grade: g }]))
  const extraCourses = extras
    .map((e) => ({ credits: num(e.credits), grade: e.grade, status: 'completed' }))
    .filter((e) => Number.isFinite(e.credits) && e.credits > 0 && e.grade)

  const sim = simulateCGPA(semesters, { overrides: ovrMap, extraCourses }, profile, policy)
  // Hook must run every render (before any early return) to satisfy the rules of hooks.
  const simAnim = useCountUp(sim.simulated.gpa ?? 0)
  const dirty = changed.length > 0 || extraCourses.length > 0

  const header = <SectionHeading eyebrow="Phase 5 · Simulation" title="What-if simulator" sub="Try changes before they're real — every result is a full recalculation, not a guess." />

  if (!impact.items.length) {
    return (
      <div className="space-y-8">
        {header}
        <EmptyState icon={FlaskConical} title="Nothing to simulate yet" action={<Button as={Link} to="/">Go to the calculator</Button>}>
          Add graded courses in the calculator, then come back to model grade changes, a future term, or a retake.
        </EmptyState>
      </div>
    )
  }


  const addExtra = () => setExtras((x) => [...x, { id: rid(), credits: '3', grade: '' }])
  const setExtra = (id, patch) => setExtras((x) => x.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  const delExtra = (id) => setExtras((x) => x.filter((e) => e.id !== id))
  const reset = () => { setOverrides({}); setExtras([]) }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {header}
        {dirty && (
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reset simulation
          </Button>
        )}
      </div>

      {/* Current → Simulated headline */}
      <Card glow className="p-6 sm:p-8">
        <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto_1fr]">
          <div>
            <p className="font-mono text-xs text-muted">Current CGPA</p>
            <p className="mt-1 font-display text-4xl font-bold tracking-tight text-muted tabular-nums sm:text-5xl">
              {fmt(sim.current.gpa, precision)}
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted/70">{fmtCredits(sim.current.credits)} graded credits</p>
          </div>
          <ArrowRight className="mx-auto hidden h-6 w-6 text-muted sm:block" />
          <div>
            <p className="font-mono text-xs text-neonCyan">Simulated CGPA</p>
            <div className="mt-1 flex flex-wrap items-end gap-3">
              <p className="font-display text-5xl font-bold tracking-tight text-ink tabular-nums sm:text-6xl">
                {sim.simulated.gpa == null ? '—' : fmt(simAnim, precision)}
              </p>
              <DeltaPill delta={sim.delta} precision={precision} />
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted/70">
              {dirty ? `${changed.length} grade change${changed.length === 1 ? '' : 's'}${extraCourses.length ? ` · ${extraCourses.length} future course${extraCourses.length === 1 ? '' : 's'}` : ''}` : 'no changes yet — adjust a grade below'}
            </p>
          </div>
        </div>
      </Card>

      {/* Per-course what-if + leverage */}
      <Card className="overflow-hidden">
        <div className="flex items-baseline justify-between border-b border-hair px-6 py-4">
          <p className="font-mono text-xs text-muted">Change a grade</p>
          <p className="font-mono text-xs text-muted">leverage = credit ÷ total</p>
        </div>
        <ul className="divide-y divide-hair">
          {impact.items.map((it) => {
            const val = overrides[it.id] ?? it.grade
            const isChanged = val !== it.grade
            return (
              <li key={it.id} className={cx('flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3', isChanged && 'bg-neonCyan/[0.04]')}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">
                    <span className="font-mono text-muted">{it.code || '—'}</span> {it.name || 'Untitled course'}
                  </p>
                  <p className="truncate font-mono text-[11px] text-muted/70">{it.semesterName} · {fmtCredits(it.credits)} cr</p>
                </div>
                <span className="hidden font-mono text-[11px] text-muted sm:inline tabular-nums" title="CGPA move per +1.0 grade point">
                  ±{fmt(it.perPointDelta, 3)}/pt
                </span>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{it.grade}</Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted" />
                  <Select
                    value={val}
                    onChange={(e) => setOverrides((prev) => ({ ...prev, [it.id]: e.target.value }))}
                    className={cx('h-9 w-28 py-0', isChanged && 'border-neonCyan/50')}
                    aria-label={`New grade for ${it.name || it.code}`}
                  >
                    {profile.grades.map((g) => <option key={g.grade} value={g.grade}>{g.grade}</option>)}
                  </Select>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      {/* Future term builder */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted">
            <Layers className="h-4 w-4" />
            <p className="font-mono text-xs">Add a hypothetical term</p>
          </div>
          <Button variant="outline" size="sm" onClick={addExtra}>
            <Plus className="h-4 w-4" /> Add course
          </Button>
        </div>

        {extras.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Model a semester you haven't taken yet — its courses fold straight into the simulated CGPA above.</p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {extras.map((e, i) => (
              <li key={e.id} className="flex items-center gap-3">
                <span className="w-6 shrink-0 font-mono text-xs text-muted tabular-nums">{i + 1}</span>
                <Field label="" className="w-28" htmlFor={`cr-${e.id}`}>
                  <Input id={`cr-${e.id}`} type="number" min="0" step="0.5" placeholder="credits" value={e.credits} onChange={(ev) => setExtra(e.id, { credits: ev.target.value })} className="tabular-nums" />
                </Field>
                <Select value={e.grade} onChange={(ev) => setExtra(e.id, { grade: ev.target.value })} className="flex-1" aria-label={`Grade for future course ${i + 1}`}>
                  <option value="">Select grade…</option>
                  {profile.grades.map((g) => <option key={g.grade} value={g.grade}>{g.grade} · {fmt(g.point, 2)}</option>)}
                </Select>
                <button type="button" onClick={() => delExtra(e.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-hair text-muted transition-colors hover:border-red-500/40 hover:text-red-400" aria-label={`Remove future course ${i + 1}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <RetakeAnalyzer profile={profile} overview={o} policy={policy} precision={precision} />

      <Callout tone="info" icon={FlaskConical} title="Nothing here is saved">
        Simulations are scratch work — they never touch your real transcript. Close the page and your recorded grades are exactly as you left them.
      </Callout>
    </div>
  )
}
