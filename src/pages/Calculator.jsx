import { Link } from 'react-router-dom'
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Copy,
  GraduationCap,
  Layers,
  Plus,
  Save,
  Settings2,
  Trash2,
  Zap,
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useStore, selectActiveProfile, selectProfiles } from '@/store'
import { fmt, fmtCredits, scopeWarnings, summarizeCourses, summarizeSemesters } from '@/engine/cgpa'
import { CourseTable } from '@/components/CourseTable'
import { ResultPanel } from '@/components/ResultPanel'
import { Breakdown } from '@/components/Breakdown'
import { Badge, Button, EmptyState, Segmented, Select, cx } from '@/components/ui'

const MODES = [
  { value: 'quick', label: 'Quick', icon: <Zap className="h-4 w-4" /> },
  { value: 'semester', label: 'Semester', icon: <BookOpen className="h-4 w-4" /> },
  { value: 'full', label: 'Full CGPA', icon: <GraduationCap className="h-4 w-4" /> },
]

/* --------------------------------------------------------- semester block --- */

// The per-semester summary the spec asks for: GPA (in the header), total credits,
// quality points, course count, and the grade distribution — read straight from
// the engine, never recomputed here.
function SemesterStats({ summary, precision }) {
  const { credits, qualityPoints, counted, total, earnedCredits, distribution } = summary
  const showEarned = Number.isFinite(earnedCredits) && earnedCredits !== credits

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] text-muted">
      <span>
        Credits <span className="tabular-nums text-ink">{fmtCredits(credits)}</span>
      </span>
      <span>
        Quality <span className="tabular-nums text-ink">{fmt(qualityPoints, precision)}</span>
      </span>
      <span>
        Courses{' '}
        <span className="tabular-nums text-ink">
          {counted}/{total}
        </span>
      </span>
      {showEarned && (
        <span>
          Earned <span className="tabular-nums text-ink">{fmtCredits(earnedCredits)}</span>
        </span>
      )}
      {distribution.length > 0 && (
        <>
          <span className="hidden h-3 w-px bg-hair sm:inline-block" aria-hidden="true" />
          <span className="flex flex-wrap items-center gap-1" aria-label="Grade distribution">
            {distribution.map((d) => (
              <span
                key={d.grade || 'blank'}
                className="inline-flex items-center gap-1 rounded-md border border-hair bg-fill px-1.5 py-0.5"
              >
                <span className="text-ink">{d.grade || '—'}</span>
                <span className="opacity-70">×{d.count}</span>
              </span>
            ))}
          </span>
        </>
      )}
    </div>
  )
}

function SemesterBlock({ semester, index, count, profile, precision, policy, showActions = true }) {
  const renameSemester = useStore((s) => s.renameSemester)
  const updateSemester = useStore((s) => s.updateSemester)
  const removeSemester = useStore((s) => s.removeSemester)
  const duplicateSemester = useStore((s) => s.duplicateSemester)
  const moveSemester = useStore((s) => s.moveSemester)
  const toggleArchive = useStore((s) => s.toggleArchiveSemester)

  const summary = summarizeCourses(semester.courses, profile, policy)
  const archived = semester.archived
  const iconBtn =
    'grid h-9 w-9 place-items-center rounded-lg border border-hair bg-fill text-muted transition-colors hover:text-ink disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neonCyan'
  const metaField =
    'w-16 rounded-md border border-hair bg-fill px-2 py-1 font-mono text-xs tabular-nums text-ink transition-colors placeholder:text-muted/60 focus:border-neonCyan/50 focus:outline-none focus:ring-2 focus:ring-neonCyan/20'

  return (
    <div className={cx('glass rounded-2xl border transition-colors', archived ? 'border-hair/60 opacity-75' : 'border-hair')}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hair p-4 sm:p-5">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-hair bg-fill font-mono text-sm tabular-nums text-neonCyan">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={semester.name}
                onChange={(e) => renameSemester(semester.id, e.target.value)}
                aria-label="Semester name"
                className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-1 font-display text-lg font-semibold text-ink transition-colors hover:border-hair focus:border-neonCyan/50 focus:outline-none focus:ring-2 focus:ring-neonCyan/20"
              />
              {archived && <Badge tone="neutral">Archived</Badge>}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-1.5">
              <label className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted">
                Year
                <input
                  value={semester.year}
                  onChange={(e) => updateSemester(semester.id, { year: e.target.value })}
                  aria-label="Academic year"
                  placeholder="—"
                  inputMode="numeric"
                  className={metaField}
                />
              </label>
              <label className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted">
                Semester #
                <input
                  value={semester.term}
                  onChange={(e) => updateSemester(semester.id, { term: e.target.value })}
                  aria-label="Semester number"
                  placeholder="—"
                  inputMode="numeric"
                  className={cx(metaField, 'w-14')}
                />
              </label>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-mono text-[11px] text-muted">GPA</p>
            <p className="font-display text-2xl font-bold tabular-nums text-ink">{fmt(summary.gpa, precision)}</p>
          </div>
          {showActions && (
            <div className="flex items-center gap-1">
              <button type="button" className={iconBtn} disabled={index === 0} aria-label="Move semester up" onClick={() => moveSemester(semester.id, 'up')}>
                <ChevronUp className="h-4 w-4" />
              </button>
              <button type="button" className={iconBtn} disabled={index === count - 1} aria-label="Move semester down" onClick={() => moveSemester(semester.id, 'down')}>
                <ChevronDown className="h-4 w-4" />
              </button>
              <button type="button" className={iconBtn} aria-label="Duplicate semester" onClick={() => duplicateSemester(semester.id)}>
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={iconBtn}
                aria-label={archived ? 'Unarchive semester' : 'Archive semester'}
                title={archived ? 'Unarchive — count in CGPA again' : 'Archive — keep but exclude from CGPA'}
                onClick={() => toggleArchive(semester.id)}
              >
                {archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              </button>
              <button type="button" className={cx(iconBtn, 'hover:border-red-500/40 hover:text-red-400')} aria-label="Delete semester" onClick={() => removeSemester(semester.id)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <SemesterStats summary={summary} precision={precision} />
        <CourseTable sid={semester.id} courses={semester.courses} profile={profile} precision={precision} policy={policy} />
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- page ------- */

export default function Calculator() {
  const mode = useStore((s) => s.mode)
  const setMode = useStore((s) => s.setMode)
  const quick = useStore((s) => s.quick)
  const semesters = useStore((s) => s.semesters)
  const activeSemesterId = useStore((s) => s.activeSemesterId)
  const setActiveSemester = useStore((s) => s.setActiveSemester)
  const profile = useStore(selectActiveProfile)
  const profiles = useStore(useShallow(selectProfiles))
  const activeProfileId = useStore((s) => s.activeProfileId)
  const setActiveProfile = useStore((s) => s.setActiveProfile)
  const precision = useStore((s) => s.settings.precision)
  const policy = useStore((s) => s.settings.retakePolicy)
  const showBreakdown = useStore((s) => s.settings.showBreakdown)
  const setShowBreakdown = useStore((s) => s.setShowBreakdown)

  const addSemester = useStore((s) => s.addSemester)
  const loadExample = useStore((s) => s.loadExample)
  const saveQuickAsSemester = useStore((s) => s.saveQuickAsSemester)

  // Archived semesters stay in the record but never touch the cumulative CGPA.
  const activeSemesters = semesters.filter((s) => !s.archived)
  const archivedSemesters = semesters.filter((s) => s.archived)

  // Resolve the focused semester for 'semester' mode.
  const activeSemester = semesters.find((s) => s.id === activeSemesterId) || semesters[0] || null

  // Per-mode: the result figure, its scope of courses (for warnings), the
  // breakdown scopes, and whether a cumulative line is shown.
  let resultLabel = 'Semester GPA'
  let summary
  let scopeCourses
  let secondary = null
  let breakdownScopes = []
  let cumulative = null

  if (mode === 'quick') {
    summary = summarizeCourses(quick.courses, profile, policy)
    scopeCourses = quick.courses
    breakdownScopes = [{ id: 'quick', name: 'Quick calculation', courses: quick.courses, summary }]
  } else if (mode === 'semester') {
    const sem = activeSemester
    summary = summarizeCourses(sem?.courses || [], profile, policy)
    scopeCourses = sem?.courses || []
    breakdownScopes = sem ? [{ id: sem.id, name: sem.name, courses: sem.courses, summary }] : []
    const overall = summarizeSemesters(activeSemesters, profile, policy).cumulative
    secondary = { label: 'Overall CGPA', value: overall.gpa }
  } else {
    const s = summarizeSemesters(activeSemesters, profile, policy)
    resultLabel = 'Cumulative CGPA'
    summary = s.cumulative
    cumulative = s.cumulative
    scopeCourses = activeSemesters.flatMap((x) => x.courses || [])
    breakdownScopes = s.perSemester.map((p) => ({
      id: p.id,
      name: p.name,
      courses: activeSemesters.find((x) => x.id === p.id)?.courses || [],
      summary: p.summary,
    }))
  }

  const warnings = scopeWarnings(scopeCourses, profile, policy)
  const hasSemesters = semesters.length > 0

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">Calculate your CGPA</h1>
      </div>

      {/* Controls: mode + grading system */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented options={MODES} value={mode} onChange={setMode} ariaLabel="Calculator mode" />
        <div className="flex items-center gap-2">
          <label htmlFor="grade-system" className="font-mono text-xs text-muted">
            Grade system
          </label>
          <Select
            id="grade-system"
            value={activeProfileId}
            onChange={(e) => setActiveProfile(e.target.value)}
            className="w-auto min-w-[8.5rem]"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Button as={Link} to="/settings" variant="ghost" size="sm" aria-label="Grade system settings">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Two columns: entry (main) + result (rail) */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <main className="min-w-0 space-y-5">
          {mode === 'quick' && (
            <>
              <div className="glass rounded-2xl border border-hair p-4 sm:p-5">
                <CourseTable sid="quick" courses={quick.courses} profile={profile} precision={precision} policy={policy} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={saveQuickAsSemester}>
                  <Save className="h-4 w-4" />
                  Save as semester
                </Button>
                <span className="font-mono text-xs text-muted">Keep this as a term in your full transcript.</span>
              </div>
            </>
          )}

          {mode === 'semester' &&
            (hasSemesters ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="sem-pick" className="font-mono text-xs text-muted">
                    Semester
                  </label>
                  <Select
                    id="sem-pick"
                    value={activeSemester?.id || ''}
                    onChange={(e) => setActiveSemester(e.target.value)}
                    className="w-auto min-w-[12rem]"
                  >
                    {semesters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.archived ? ' (archived)' : ''}
                      </option>
                    ))}
                  </Select>
                  <Button variant="outline" size="sm" onClick={addSemester}>
                    <Plus className="h-4 w-4" />
                    New semester
                  </Button>
                </div>
                {activeSemester && (
                  <SemesterBlock
                    semester={activeSemester}
                    index={semesters.findIndex((s) => s.id === activeSemester.id)}
                    count={semesters.length}
                    profile={profile}
                    precision={precision}
                    policy={policy}
                  />
                )}
              </>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No semesters yet"
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={addSemester}>
                      <Plus className="h-4 w-4" />
                      Add semester
                    </Button>
                    <Button variant="outline" onClick={loadExample}>
                      <Layers className="h-4 w-4" />
                      Load example
                    </Button>
                  </div>
                }
              >
                Add a semester to calculate its GPA, or load an example transcript to explore.
              </EmptyState>
            ))}

          {mode === 'full' &&
            (hasSemesters ? (
              <>
                {activeSemesters.map((s) => (
                  <SemesterBlock
                    key={s.id}
                    semester={s}
                    index={semesters.indexOf(s)}
                    count={semesters.length}
                    profile={profile}
                    precision={precision}
                    policy={policy}
                  />
                ))}
                <Button variant="outline" onClick={addSemester}>
                  <Plus className="h-4 w-4" />
                  Add semester
                </Button>

                {archivedSemesters.length > 0 && (
                  <div className="space-y-4 pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] text-muted">kept on record — not counted in your CGPA</span>
                    </div>
                    {archivedSemesters.map((s) => (
                      <SemesterBlock
                        key={s.id}
                        semester={s}
                        index={semesters.indexOf(s)}
                        count={semesters.length}
                        profile={profile}
                        precision={precision}
                        policy={policy}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={GraduationCap}
                title="Build your transcript"
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={addSemester}>
                      <Plus className="h-4 w-4" />
                      Add semester
                    </Button>
                    <Button variant="outline" onClick={loadExample}>
                      <Layers className="h-4 w-4" />
                      Load example
                    </Button>
                  </div>
                }
              >
                Add every semester and its courses — your cumulative CGPA is credit-weighted across
                them all, not an average of GPAs.
              </EmptyState>
            ))}

          {showBreakdown && breakdownScopes.length > 0 && (
            <div>
              <Breakdown
                scopes={breakdownScopes}
                cumulative={cumulative}
                profile={profile}
                precision={precision}
                policy={policy}
              />
            </div>
          )}
        </main>

        <aside className="lg:sticky lg:top-24">
          <ResultPanel
            label={resultLabel}
            value={summary.gpa}
            precision={precision}
            credits={summary.credits}
            qualityPoints={summary.qualityPoints}
            counted={summary.counted}
            total={summary.total}
            earnedCredits={summary.earnedCredits}
            secondary={secondary}
            warnings={warnings}
            showBreakdown={showBreakdown}
            onToggleBreakdown={setShowBreakdown}
          />
        </aside>
      </div>
    </div>
  )
}
