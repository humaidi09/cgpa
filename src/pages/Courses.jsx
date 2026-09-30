import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BookOpen, ArrowLeft, Plus, Trash2, GraduationCap, Percent, ListChecks, Link2, ScanLine,
  User, MapPin, Clock, CalendarClock, Target, Check, TriangleAlert, CheckCircle2, Info, ExternalLink, FileText,
} from 'lucide-react'
import { useStore, selectActiveProfile } from '@/store'
import { courseDetail, statusMeta, calculateComponentGrade, calculateRequiredFinalScore, fmt, fmtCredits } from '@/engine/cgpa'
import { Badge, Button, Callout, Card, EmptyState, Field, Input, SectionHeading, Segmented, cx } from '@/components/ui'
import Reveal from '@/components/Reveal'

// PHASE 6 — Course workspace. A course here is a place to actually run the
// course from: meta, a weighted grade tracker that answers "what do I need on
// the final?", a plan of topics / assignments / exams, resources, and a syllabus
// scanner. Two rules hold the line the brief drew:
//   1. The workspace never touches academic fields (credit / grade / status) —
//      those stay in the calculator, so a note can't move a CGPA.
//   2. The syllabus scanner is a plain regex parser, not "AI", and it never
//      writes silently: it shows what it found for you to confirm, item by item.

const num = (v) => (v === '' || v == null ? NaN : Number(v))
const pct = (n, p = 1) => (Number.isFinite(Number(n)) ? `${Number(n).toFixed(p)}%` : '—')
const count = (c, k) => (Array.isArray(c?.[k]) ? c[k].length : 0)

/* -------- syllabus scanner: transparent regex, never AI, never silent -------- */
const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec'
function scanSyllabus(text) {
  const lines = (text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const components = []
  const assignments = []
  const seen = new Set()
  const clean = (s) => s.replace(/[\s:.\-–—]+$/, '').replace(/^[\s:.\-–—]+/, '').trim()
  for (const line of lines) {
    // "Midterm Exam — 25%", "Final: 40%", "Quizzes 10 %"
    const w = line.match(/^(.{2,60}?)\s*[:\-–—]?\s*(\d{1,3})\s*%/)
    if (w && Number(w[2]) > 0 && Number(w[2]) <= 100) {
      const name = clean(w[1])
      const key = `c:${name.toLowerCase()}:${w[2]}`
      if (name && !seen.has(key)) { seen.add(key); components.push({ kind: 'component', name, weight: Number(w[2]) }) }
      continue
    }
    // "Assignment 1 due Sep 20", "Project — 12/05", "Quiz 2026-03-05"
    const d = line.match(new RegExp(`(.{2,60}?)\\s*[:\\-–—]?\\s*(?:due\\s*)?((?:\\d{1,2}[\\/.\\-]\\d{1,2}(?:[\\/.\\-]\\d{2,4})?)|(?:(?:${MONTHS})[a-z]*\\.?\\s+\\d{1,2}(?:,?\\s*\\d{4})?))`, 'i'))
    if (d) {
      const title = clean(d[1])
      const key = `a:${title.toLowerCase()}:${d[2]}`
      if (title && !seen.has(key)) { seen.add(key); assignments.push({ kind: 'assignment', title, due: d[2] }) }
    }
  }
  return [...components, ...assignments]
}

function StatusBadge({ status }) {
  const m = statusMeta(status)
  return <Badge tone={m.tone}>{m.label}</Badge>
}

/* ------------------------------------------------------------------ list mode */
function CourseList() {
  const semesters = useStore((s) => s.semesters)

  const groups = semesters
    .map((s) => ({ sem: s, courses: (s.courses || []).filter((c) => c.code || c.name || c.grade) }))
    .filter((g) => g.courses.length)

  const header = <SectionHeading title="Course workspace" />

  if (!groups.length) {
    return (
      <div className="space-y-8">
        {header}
        <EmptyState icon={BookOpen} title="No courses to open yet" action={<Button as={Link} to="/">Go to the calculator</Button>}>
          Add named courses in the calculator and each one gets its own workspace here.
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {header}
      {groups.map(({ sem, courses }) => (
        <div key={sem.id}>
          <div className="mb-3 flex items-center gap-2">
            <p className="font-mono text-xs text-muted">{sem.name}</p>
            {sem.archived && <Badge tone="neutral">Archived</Badge>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => {
              const items = count(c, 'components') + count(c, 'assignments') + count(c, 'exams') + count(c, 'topics') + count(c, 'resources')
              return (
                <Link
                  key={c.id}
                  to={`/courses/${c.id}`}
                  className="glass group rounded-2xl border border-hair p-4 transition-colors hover:border-neonCyan/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-neonCyan">{c.code || '—'}</p>
                      <p className="mt-1 truncate font-display text-base font-semibold text-ink" title={c.name}>{c.name || 'Untitled course'}</p>
                    </div>
                    {c.grade ? <Badge tone="accent">{c.grade}</Badge> : <Badge tone="neutral">no grade</Badge>}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={c.status} />
                    <span className="font-mono text-[11px] text-muted">{fmtCredits(c.credits) === '—' ? '—' : `${fmtCredits(c.credits)} cr`}</span>
                    {items > 0 && <span className="ml-auto font-mono text-[11px] text-muted">{items} item{items === 1 ? '' : 's'}</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------- workspace mode */
function ItemList({ items, onAdd, onPatch, onRemove, fields, addLabel, empty, toggleKey }) {
  return (
    <div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-2.5 rounded-xl border border-hair bg-fill/50 px-3 py-2">
            {toggleKey && (
              <button
                type="button"
                onClick={() => onPatch(it.id, { [toggleKey]: !it[toggleKey] })}
                aria-pressed={Boolean(it[toggleKey])}
                aria-label={it[toggleKey] ? 'Mark not done' : 'Mark done'}
                className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors', it[toggleKey] ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400' : 'border-hair text-transparent hover:border-neonCyan/50')}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            )}
            {fields.map((f) => (
              <input
                key={f.key}
                value={it[f.key] ?? ''}
                onChange={(e) => onPatch(it.id, { [f.key]: e.target.value })}
                placeholder={f.placeholder}
                type={f.type || 'text'}
                aria-label={f.placeholder}
                className={cx(
                  'min-w-0 rounded-lg border border-hair bg-fill px-2.5 py-1.5 text-sm text-ink placeholder:text-muted/60 focus:border-neonCyan/50 focus:outline-none',
                  f.grow ? 'flex-1' : 'w-24 shrink-0 text-center tabular-nums',
                  toggleKey && it[toggleKey] && f.grow && 'text-muted line-through',
                )}
              />
            ))}
            <button type="button" onClick={() => onRemove(it.id)} aria-label="Remove" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:text-red-400">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="py-2 text-sm text-muted">{empty}</p>}
      <button type="button" onClick={onAdd} className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs text-muted transition-colors hover:text-neonCyan">
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </button>
    </div>
  )
}

function CourseWorkspace({ courseId }) {
  const semesters = useStore((s) => s.semesters)
  const profile = useStore(selectActiveProfile)
  const policy = useStore((s) => s.settings.retakePolicy)
  const updateCourseWorkspace = useStore((s) => s.updateCourseWorkspace)
  const addCourseItem = useStore((s) => s.addCourseItem)
  const updateCourseItem = useStore((s) => s.updateCourseItem)
  const removeCourseItem = useStore((s) => s.removeCourseItem)

  const [tab, setTab] = useState('details')
  const [target, setTarget] = useState('80')
  const [syllabus, setSyllabus] = useState('')
  const [candidates, setCandidates] = useState(null) // null = not scanned; [] = scanned, nothing found

  let course = null
  let sem = null
  for (const s of semesters) {
    const f = (s.courses || []).find((c) => c.id === courseId)
    if (f) { course = f; sem = s; break }
  }

  if (!course) {
    return (
      <div className="space-y-6">
        <Button as={Link} to="/courses" variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /> All courses</Button>
        <Callout tone="warn" icon={TriangleAlert} title="Course not found">
          It may have been removed. <Link to="/courses" className="text-neonCyan hover:underline">Back to all courses</Link>.
        </Callout>
      </div>
    )
  }

  const cid = course.id
  const detail = courseDetail(course, profile, policy)
  const components = Array.isArray(course.components) ? course.components : []
  const grade = calculateComponentGrade(components)
  const req = calculateRequiredFinalScore({ components, targetOverall: num(target) })
  const weightOff = grade.totalWeight > 0 && Math.abs(grade.totalWeight - 100) > 0.01

  const topics = Array.isArray(course.topics) ? course.topics : []
  const assignments = Array.isArray(course.assignments) ? course.assignments : []
  const exams = Array.isArray(course.exams) ? course.exams : []
  const resources = Array.isArray(course.resources) ? course.resources : []
  const doneTopics = topics.filter((t) => t.done).length
  const doneAssign = assignments.filter((a) => a.done).length

  const runScan = () => setCandidates(scanSyllabus(syllabus).map((x, i) => ({ ...x, _id: i, keep: true })))
  const addSelected = () => {
    for (const c of candidates.filter((x) => x.keep)) {
      if (c.kind === 'component') addCourseItem(cid, 'components', { name: c.name, weight: c.weight, score: '' })
      else addCourseItem(cid, 'assignments', { title: c.title, due: c.due, done: false })
    }
    if (syllabus.trim()) updateCourseWorkspace(cid, { syllabus })
    setCandidates(null)
    setSyllabus('')
  }

  const TABS = [
    { value: 'details', label: 'Details', icon: <BookOpen className="h-3.5 w-3.5" /> },
    { value: 'grade', label: 'Grade', icon: <Percent className="h-3.5 w-3.5" /> },
    { value: 'plan', label: 'Plan', icon: <ListChecks className="h-3.5 w-3.5" /> },
    { value: 'resources', label: 'Resources', icon: <Link2 className="h-3.5 w-3.5" /> },
    { value: 'syllabus', label: 'Syllabus', icon: <ScanLine className="h-3.5 w-3.5" /> },
  ]

  const meta = (key, label, Icon, placeholder) => (
    <Field label={label}>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input value={course[key] ?? ''} onChange={(e) => updateCourseWorkspace(cid, { [key]: e.target.value })} placeholder={placeholder} className="pl-9" />
      </div>
    </Field>
  )

  return (
    <div className="space-y-6">
      <Button as={Link} to="/courses" variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /> All courses</Button>

      {/* Header */}
      <Card glow className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs text-neonCyan">{course.code || 'No code'} · {sem.name}</p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{course.name || 'Untitled course'}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={course.status} />
            <Badge tone="neutral">{fmtCredits(course.credits) === '—' ? 'no credits' : `${fmtCredits(course.credits)} cr`}</Badge>
            {course.grade ? <Badge tone="accent"><GraduationCap className="h-3.5 w-3.5" />{course.grade}</Badge> : <Badge tone="neutral">no grade</Badge>}
          </div>
        </div>
        {detail.reason && <p className="mt-3 font-mono text-[11px] text-muted">{detail.reason}</p>}
      </Card>

      <div className="overflow-x-auto pb-1">
        <Segmented options={TABS} value={tab} onChange={setTab} ariaLabel="Course sections" />
      </div>

      {/* ---- Details ---- */}
      {tab === 'details' && (
        <Reveal>
          <Card className="p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {meta('instructor', 'Instructor', User, 'e.g. Dr. Rahman')}
              {meta('section', 'Section', MapPin, 'e.g. Section B')}
              {meta('schedule', 'Schedule', Clock, 'e.g. Sun/Tue 10:00–11:20')}
              {meta('classroom', 'Classroom', MapPin, 'e.g. Room 4021')}
            </div>
            <Callout tone="info" icon={Info} title="Academic fields live in the calculator" className="mt-5">
              Credit, grade, and status are edited on the <Link to="/" className="text-neonCyan hover:underline">calculator</Link> so a note here can never change your CGPA.
            </Callout>
          </Card>
        </Reveal>
      )}

      {/* ---- Grade tracker ---- */}
      {tab === 'grade' && (
        <Reveal className="space-y-4">
          <Card className="p-6">
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-xs text-muted">Weighted components</p>
              <p className={cx('font-mono text-xs tabular-nums', weightOff ? 'text-amber-400' : 'text-muted')}>weights {fmt(grade.totalWeight, 0)}%</p>
            </div>

            {components.length > 0 && (
              <div className="mt-4 grid grid-cols-[1fr_5rem_5rem_2rem] gap-2 px-1 font-mono text-[11px] text-muted">
                <span>Component</span><span className="text-center">Weight %</span><span className="text-center">Your %</span><span />
              </div>
            )}
            <ul className="mt-1 space-y-2">
              {components.map((c) => (
                <li key={c.id} className="grid grid-cols-[1fr_5rem_5rem_2rem] items-center gap-2">
                  <input value={c.name ?? ''} onChange={(e) => updateCourseItem(cid, 'components', c.id, { name: e.target.value })} placeholder="e.g. Midterm" aria-label="Component name" className="min-w-0 rounded-lg border border-hair bg-fill px-2.5 py-1.5 text-sm text-ink placeholder:text-muted/60 focus:border-neonCyan/50 focus:outline-none" />
                  <input value={c.weight ?? ''} onChange={(e) => updateCourseItem(cid, 'components', c.id, { weight: e.target.value })} placeholder="25" inputMode="decimal" aria-label="Weight percent" className="rounded-lg border border-hair bg-fill px-2 py-1.5 text-center text-sm text-ink tabular-nums placeholder:text-muted/60 focus:border-neonCyan/50 focus:outline-none" />
                  <input value={c.score ?? ''} onChange={(e) => updateCourseItem(cid, 'components', c.id, { score: e.target.value })} placeholder="—" inputMode="decimal" aria-label="Your score percent" className="rounded-lg border border-hair bg-fill px-2 py-1.5 text-center text-sm text-ink tabular-nums placeholder:text-muted/60 focus:border-neonCyan/50 focus:outline-none" />
                  <button type="button" onClick={() => removeCourseItem(cid, 'components', c.id)} aria-label="Remove component" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
            {components.length === 0 && <p className="py-2 text-sm text-muted">Add the graded pieces of this course — midterm, final, quizzes, project — with each one's weight.</p>}
            <button type="button" onClick={() => addCourseItem(cid, 'components', { name: '', weight: '', score: '' })} className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs text-muted transition-colors hover:text-neonCyan"><Plus className="h-3.5 w-3.5" /> Add component</button>

            {weightOff && <Callout tone="warn" icon={TriangleAlert} title="Weights don't sum to 100%" className="mt-4">They add up to {fmt(grade.totalWeight, 0)}% — the projection assumes the weights you enter, so adjust them to match the syllabus.</Callout>}
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5"><p className="font-mono text-xs text-muted">On graded work</p><p className="mt-2 font-display text-3xl font-bold text-ink tabular-nums">{pct(grade.current)}</p><p className="mt-1 text-sm text-muted">{fmt(grade.completedWeight, 0)}% of the grade graded</p></Card>
            <Card className="p-5"><p className="font-mono text-xs text-muted">Locked so far</p><p className="mt-2 font-display text-3xl font-bold text-ink tabular-nums">{pct(grade.floor)}</p><p className="mt-1 text-sm text-muted">final if you scored 0 on the rest</p></Card>
            <Card className="p-5"><p className="font-mono text-xs text-muted">Best possible</p><p className="mt-2 font-display text-3xl font-bold text-ink tabular-nums">{pct(grade.ceiling)}</p><p className="mt-1 text-sm text-muted">final if you ace the rest</p></Card>
          </div>

          <Card className="p-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2 text-muted"><Target className="h-4 w-4" /><p className="font-mono text-xs">What do I need?</p></div>
              <Field label="Target overall %" className="w-36">
                <Input type="number" min="0" max="100" value={target} onChange={(e) => setTarget(e.target.value)} className="tabular-nums" />
              </Field>
            </div>
            {req.valid ? (
              req.noRemaining ? (
                <Callout tone={req.met ? 'ok' : 'bad'} icon={req.met ? CheckCircle2 : TriangleAlert} title={`Final grade: ${pct(req.projected)}`} className="mt-4">Every component is graded — {req.met ? 'you reached the target.' : 'the target is no longer reachable for this course.'}</Callout>
              ) : req.guaranteed ? (
                <Callout tone="ok" icon={CheckCircle2} title="Already secured" className="mt-4">You've locked in {pct(target, 0)} overall — even a 0 on the remaining {fmt(req.remainingWeight, 0)}% keeps you at target.</Callout>
              ) : req.impossible ? (
                <Callout tone="bad" icon={TriangleAlert} title="Out of reach" className="mt-4">Reaching {pct(target, 0)} would need {pct(req.needed)} on the remaining {fmt(req.remainingWeight, 0)}% — above 100%. Lower the target.</Callout>
              ) : (
                <Callout tone="info" icon={Target} title={`Need ${pct(req.needed)} on what's left`} className="mt-4">Score {pct(req.needed)} across the remaining {fmt(req.remainingWeight, 0)}% of the grade to finish at {pct(target, 0)} overall.</Callout>
              )
            ) : (
              <p className="mt-4 text-sm text-muted">Add components with weights, then set a target to see the score you need.</p>
            )}
            <p className="mt-3 font-mono text-[11px] text-muted/70">needed = (target − points earned) ÷ remaining weight × 100</p>
          </Card>
        </Reveal>
      )}

      {/* ---- Plan ---- */}
      {tab === 'plan' && (
        <Reveal className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-6">
              <div className="mb-3 flex items-baseline justify-between"><p className="font-mono text-xs text-muted">Topics</p>{topics.length > 0 && <p className="font-mono text-[11px] text-muted tabular-nums">{doneTopics}/{topics.length} done</p>}</div>
              <ItemList items={topics} onAdd={() => addCourseItem(cid, 'topics', { title: '', done: false })} onPatch={(id, p) => updateCourseItem(cid, 'topics', id, p)} onRemove={(id) => removeCourseItem(cid, 'topics', id)} toggleKey="done" fields={[{ key: 'title', placeholder: 'Topic or lecture', grow: true }]} addLabel="Add topic" empty="List the topics you need to cover." />
            </Card>
            <Card className="p-6">
              <div className="mb-3 flex items-baseline justify-between"><p className="font-mono text-xs text-muted">Assignments</p>{assignments.length > 0 && <p className="font-mono text-[11px] text-muted tabular-nums">{doneAssign}/{assignments.length} done</p>}</div>
              <ItemList items={assignments} onAdd={() => addCourseItem(cid, 'assignments', { title: '', due: '', done: false })} onPatch={(id, p) => updateCourseItem(cid, 'assignments', id, p)} onRemove={(id) => removeCourseItem(cid, 'assignments', id)} toggleKey="done" fields={[{ key: 'title', placeholder: 'Assignment', grow: true }, { key: 'due', placeholder: 'Due' }]} addLabel="Add assignment" empty="Track what's due and when." />
            </Card>
          </div>
          <Card className="p-6">
            <p className="mb-3 font-mono text-xs text-muted">Exams</p>
            <ItemList items={exams} onAdd={() => addCourseItem(cid, 'exams', { title: '', date: '' })} onPatch={(id, p) => updateCourseItem(cid, 'exams', id, p)} onRemove={(id) => removeCourseItem(cid, 'exams', id)} fields={[{ key: 'title', placeholder: 'e.g. Final', grow: true }, { key: 'date', placeholder: 'Date' }]} addLabel="Add exam" empty="Add exam dates so nothing sneaks up." />
          </Card>
        </Reveal>
      )}

      {/* ---- Resources ---- */}
      {tab === 'resources' && (
        <Reveal className="space-y-4">
          <Card className="p-6">
            <p className="mb-3 font-mono text-xs text-muted">Links &amp; materials</p>
            <ul className="space-y-2">
              {resources.map((r) => (
                <li key={r.id} className="flex items-center gap-2.5 rounded-xl border border-hair bg-fill/50 px-3 py-2">
                  <input value={r.label ?? ''} onChange={(e) => updateCourseItem(cid, 'resources', r.id, { label: e.target.value })} placeholder="Label" aria-label="Resource label" className="w-40 shrink-0 rounded-lg border border-hair bg-fill px-2.5 py-1.5 text-sm text-ink placeholder:text-muted/60 focus:border-neonCyan/50 focus:outline-none" />
                  <input value={r.url ?? ''} onChange={(e) => updateCourseItem(cid, 'resources', r.id, { url: e.target.value })} placeholder="https://…" aria-label="Resource URL" className="min-w-0 flex-1 rounded-lg border border-hair bg-fill px-2.5 py-1.5 text-sm text-ink placeholder:text-muted/60 focus:border-neonCyan/50 focus:outline-none" />
                  {/^https?:\/\//i.test(r.url || '') && <a href={r.url} target="_blank" rel="noreferrer noopener" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:text-neonCyan" aria-label="Open link"><ExternalLink className="h-4 w-4" /></a>}
                  <button type="button" onClick={() => removeCourseItem(cid, 'resources', r.id)} aria-label="Remove resource" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
            {resources.length === 0 && <p className="py-2 text-sm text-muted">Keep the syllabus PDF, slides, or reading links within reach.</p>}
            <button type="button" onClick={() => addCourseItem(cid, 'resources', { label: '', url: '' })} className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs text-muted transition-colors hover:text-neonCyan"><Plus className="h-3.5 w-3.5" /> Add resource</button>
          </Card>
          <Card className="p-6">
            <p className="mb-3 font-mono text-xs text-muted">Notes</p>
            <textarea value={course.notes ?? ''} onChange={(e) => updateCourseWorkspace(cid, { notes: e.target.value })} rows={5} placeholder="Anything worth remembering about this course…" className="w-full resize-y rounded-xl border border-hair bg-fill px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-neonCyan/50 focus:outline-none focus:ring-2 focus:ring-neonCyan/20" />
          </Card>
        </Reveal>
      )}

      {/* ---- Syllabus scanner ---- */}
      {tab === 'syllabus' && (
        <Reveal className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 text-muted"><FileText className="h-4 w-4" /><p className="font-mono text-xs">Paste your syllabus</p></div>
            <textarea value={syllabus} onChange={(e) => setSyllabus(e.target.value)} rows={8} placeholder={'Paste the grading and schedule text, e.g.\nMidterm — 25%\nFinal Exam: 40%\nProject 1 due Mar 15'} className="mt-3 w-full resize-y rounded-xl border border-hair bg-fill px-3.5 py-2.5 font-mono text-[13px] text-ink placeholder:text-muted/50 focus:border-neonCyan/50 focus:outline-none focus:ring-2 focus:ring-neonCyan/20" />
            <div className="mt-3 flex items-center gap-3">
              <Button size="sm" onClick={runScan} disabled={!syllabus.trim()}><ScanLine className="h-4 w-4" /> Scan text</Button>
              <p className="font-mono text-[11px] text-muted">Plain pattern-matching — no data leaves your device.</p>
            </div>
          </Card>

          {candidates && (
            <Card className="p-6">
              {candidates.length === 0 ? (
                <Callout tone="info" icon={Info} title="Nothing recognised">Add lines like “Final — 40%” or “Quiz due Sep 20”, then scan again.</Callout>
              ) : (
                <>
                  <Callout tone="warn" icon={TriangleAlert} title="Review before adding" className="mb-4">
                    These were read from your text and may be imperfect. Untick anything wrong — nothing is saved until you add it.
                  </Callout>
                  <ul className="space-y-2">
                    {candidates.map((c) => (
                      <li key={c._id} className={cx('flex items-center gap-3 rounded-xl border px-3 py-2.5', c.keep ? 'border-neonCyan/30 bg-neonCyan/[0.05]' : 'border-hair bg-fill/40 opacity-60')}>
                        <button type="button" onClick={() => setCandidates((cs) => cs.map((x) => (x._id === c._id ? { ...x, keep: !x.keep } : x)))} aria-pressed={c.keep} aria-label={c.keep ? 'Exclude' : 'Include'} className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors', c.keep ? 'border-neonCyan/50 bg-neonCyan/20 text-neonCyan' : 'border-hair text-transparent')}><Check className="h-3.5 w-3.5" /></button>
                        <Badge tone={c.kind === 'component' ? 'accent' : 'neutral'}>{c.kind === 'component' ? 'Component' : 'Assignment'}</Badge>
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">{c.kind === 'component' ? c.name : c.title}</span>
                        <span className="shrink-0 font-mono text-xs text-muted tabular-nums">{c.kind === 'component' ? `${c.weight}%` : c.due}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-center gap-3">
                    <Button size="sm" onClick={addSelected} disabled={!candidates.some((c) => c.keep)}><Plus className="h-4 w-4" /> Add selected</Button>
                    <button type="button" onClick={() => setCandidates(null)} className="font-mono text-xs text-muted hover:text-ink">Discard</button>
                  </div>
                </>
              )}
            </Card>
          )}
        </Reveal>
      )}
    </div>
  )
}

export default function Courses() {
  const { courseId } = useParams()
  return courseId ? <CourseWorkspace courseId={courseId} /> : <CourseList />
}
