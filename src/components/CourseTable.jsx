import { useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from 'lucide-react'
import { useStore } from '@/store'
import { COURSE_STATUSES, DEFAULT_RETAKE_POLICY, courseDetail, creditsError, fmt, fmtCredits } from '@/engine/cgpa'
import { Button, Input, Select, cx } from '@/components/ui'

// The course entry grid — the calculator's main input surface. It drives one
// collection of courses, identified by `sid` (a semester id, or 'quick' for the
// scratch list). Every figure it shows comes from the engine; it only edits raw
// course data through the store.
//
// Keyboard model (spec: "feel like a real professional calculation tool"):
//   • Tab / Shift+Tab move across fields natively.
//   • Enter adds the next course (or jumps to the next row) and focuses it.
//   • The grade <select> has native type-ahead — press A / B / C to pick.
//   • Credit preset chips (1–4) fill common values in one tap.

const CREDIT_PRESETS = [1, 2, 3, 4]

function fieldId(sid, cid, field) {
  return `c-${sid}-${cid}-${field}`
}

// A terse, status-aware note for the row's contribution cell when a course
// doesn't feed the GPA — so an excluded row is never a silent blank. The full
// explanation lives in the engine's `reason`; this is its one-line shorthand.
function rowNote(detail) {
  if (detail.includedInGpa) return null
  if (detail.reason === 'Add a grade to count this') return 'Add a grade'
  if (detail.reason === 'Add credit hours to count this') return 'Add credit'
  if (detail.status === 'pass-fail') return detail.earnedCredits > 0 ? 'Earns credit' : 'No credit'
  if (detail.status === 'ongoing') return 'In progress'
  if (detail.status === 'planned') return 'Planned'
  if (detail.status === 'withdrawn') return 'Withdrawn'
  if (detail.status === 'retaken') return 'Retaken'
  return 'Not counted'
}

function CourseRow({ sid, course, index, count, profile, precision, policy, onEnter, actions }) {
  const detail = courseDetail(course, profile, policy)
  const err = creditsError(course.credits)
  const canUp = index > 0
  const canDown = index < count - 1
  const note = rowNote(detail)

  const set = (patch) => actions.updateCourse(sid, course.id, patch)
  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onEnter(index)
    }
  }

  const iconBtn =
    'grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-hair bg-fill text-muted transition-colors hover:text-ink disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neonCyan'

  return (
    <div
      data-row
      className="grid grid-cols-2 gap-3 rounded-xl border border-hair bg-fill/40 p-3 sm:flex sm:items-start sm:gap-2 sm:rounded-xl sm:border-transparent sm:bg-transparent sm:p-0"
    >
      {/* Code */}
      <label className="block sm:w-[6rem] sm:shrink-0">
        <span className="mb-1 block font-mono text-[11px] text-muted sm:hidden">Code</span>
        <Input
          id={fieldId(sid, course.id, 'code')}
          data-first
          aria-label="Course code"
          value={course.code}
          placeholder="CSE101"
          className="font-mono uppercase"
          onKeyDown={onKeyDown}
          onChange={(e) => set({ code: e.target.value })}
        />
      </label>

      {/* Name */}
      <label className="block sm:min-w-0 sm:flex-1">
        <span className="mb-1 block font-mono text-[11px] text-muted sm:hidden">Course</span>
        <Input
          aria-label="Course name"
          value={course.name}
          placeholder="Course name"
          onKeyDown={onKeyDown}
          onChange={(e) => set({ name: e.target.value })}
        />
      </label>

      {/* Credit hours + presets */}
      <div className="block sm:w-[5.5rem] sm:shrink-0">
        <span className="mb-1 block font-mono text-[11px] text-muted sm:hidden">Credit</span>
        <Input
          aria-label="Credit hours"
          type="number"
          min="0"
          step="0.5"
          inputMode="decimal"
          invalid={!!err}
          aria-invalid={!!err}
          value={course.credits}
          placeholder="0"
          className="tabular-nums"
          onKeyDown={onKeyDown}
          onChange={(e) => set({ credits: e.target.value })}
        />
        <div className="mt-1 flex gap-1">
          {CREDIT_PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              tabIndex={-1}
              aria-label={`Set ${n} credit${n > 1 ? 's' : ''}`}
              onClick={() => set({ credits: n })}
              className={cx(
                'h-6 flex-1 rounded-md border border-hair font-mono text-[11px] tabular-nums transition-colors',
                Number(course.credits) === n
                  ? 'bg-neonCyan/15 text-neonCyan border-neonCyan/30'
                  : 'text-muted hover:text-ink hover:border-hair-strong',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Grade */}
      <label className="block sm:w-[5.5rem] sm:shrink-0">
        <span className="mb-1 block font-mono text-[11px] text-muted sm:hidden">Grade</span>
        <Select
          aria-label="Grade"
          value={course.grade}
          onKeyDown={onKeyDown}
          onChange={(e) => set({ grade: e.target.value })}
        >
          <option value="">—</option>
          {profile.grades.map((g) => (
            <option key={g.grade} value={g.grade}>
              {g.grade} · {fmtCredits(g.point)}
            </option>
          ))}
        </Select>
      </label>

      {/* Status */}
      <label className="col-span-2 block sm:w-[7rem] sm:shrink-0">
        <span className="mb-1 block font-mono text-[11px] text-muted sm:hidden">Status</span>
        <Select
          aria-label="Course status"
          value={detail.status}
          onKeyDown={onKeyDown}
          onChange={(e) => set({ status: e.target.value })}
        >
          {COURSE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </label>

      {/* Contribution readout + row actions */}
      <div className="col-span-2 flex items-center justify-between gap-2 sm:w-[11.5rem] sm:shrink-0 sm:justify-end">
        <span className="font-mono text-xs tabular-nums text-muted sm:mr-1 sm:text-right">
          {detail.includedInGpa ? (
            <>
              {fmtCredits(detail.credits)} × {fmt(detail.point, precision)} ={' '}
              <span className="text-ink">{fmt(detail.qualityPoints, precision)}</span>
            </>
          ) : (
            <span className="italic opacity-70">{note}</span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={iconBtn}
            disabled={!canUp}
            aria-label="Move up"
            onClick={() => actions.moveCourse(sid, course.id, 'up')}
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={iconBtn}
            disabled={!canDown}
            aria-label="Move down"
            onClick={() => actions.moveCourse(sid, course.id, 'down')}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={iconBtn}
            aria-label="Duplicate course"
            onClick={() => actions.duplicateCourse(sid, course.id)}
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cx(iconBtn, 'hover:border-red-500/40 hover:text-red-400')}
            aria-label="Delete course"
            onClick={() => actions.removeCourse(sid, course.id)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function CourseTable({ sid, courses, profile, precision, policy = DEFAULT_RETAKE_POLICY }) {
  // Select actions individually — each is a stable reference, so we never hand
  // useSyncExternalStore a fresh object (which would loop under StrictMode).
  const updateCourse = useStore((s) => s.updateCourse)
  const removeCourse = useStore((s) => s.removeCourse)
  const addCourse = useStore((s) => s.addCourse)
  const duplicateCourse = useStore((s) => s.duplicateCourse)
  const moveCourse = useStore((s) => s.moveCourse)
  const actions = { updateCourse, removeCourse, addCourse, duplicateCourse, moveCourse }

  const listRef = useRef(null)
  const focusLastRef = useRef(false)

  // After a row is appended, move focus into its first field so entry flows
  // without reaching for the mouse.
  useEffect(() => {
    if (!focusLastRef.current) return
    focusLastRef.current = false
    const rows = listRef.current?.querySelectorAll('[data-row]')
    const last = rows?.[rows.length - 1]
    last?.querySelector('[data-first]')?.focus()
  }, [courses.length])

  const addRow = () => {
    focusLastRef.current = true
    actions.addCourse(sid)
  }

  // Enter from a row: if it's the last row, add a new one; otherwise jump to the
  // next row's first field.
  const onEnter = (index) => {
    if (index >= courses.length - 1) {
      addRow()
    } else {
      const rows = listRef.current?.querySelectorAll('[data-row]')
      rows?.[index + 1]?.querySelector('[data-first]')?.focus()
    }
  }

  return (
    <div>
      {/* Column headers (desktop) */}
      {courses.length > 0 && (
        <div className="mb-2 hidden items-center gap-2 px-0.5 sm:flex">
          <span className="w-[6rem] font-mono text-[11px] text-muted">Code</span>
          <span className="min-w-0 flex-1 font-mono text-[11px] text-muted">Course</span>
          <span className="w-[5.5rem] font-mono text-[11px] text-muted">Credit</span>
          <span className="w-[5.5rem] font-mono text-[11px] text-muted">Grade</span>
          <span className="w-[7rem] font-mono text-[11px] text-muted">Status</span>
          <span className="w-[11.5rem] text-right font-mono text-[11px] text-muted">
            credit × point = quality
          </span>
        </div>
      )}

      <div ref={listRef} className="space-y-2 sm:space-y-1.5">
        {courses.map((course, i) => (
          <CourseRow
            key={course.id}
            sid={sid}
            course={course}
            index={i}
            count={courses.length}
            profile={profile}
            precision={precision}
            policy={policy}
            onEnter={onEnter}
            actions={actions}
          />
        ))}
      </div>

      {courses.length === 0 && (
        <p className="rounded-lg border border-dashed border-hair px-4 py-6 text-center text-sm text-muted">
          No courses yet — add one to start.
        </p>
      )}

      <div className="mt-3">
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4" />
          Add course
        </Button>
      </div>
    </div>
  )
}
