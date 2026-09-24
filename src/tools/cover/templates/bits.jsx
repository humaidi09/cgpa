import { createContext, useContext, Fragment } from 'react'
import { cx } from '@/lib/cx'
import { LOGO_SIZES, opt } from '../defaults'

// Shared building blocks for the cover templates. Keeping them here means every
// template renders a value, a logo, a date, or a student the same way — so the
// five layouts differ in composition, not in how a field is shown.

// preview = true  → show muted placeholders for empty fields (helps the student
//                   see the structure while filling the form)
// preview = false → the real document: empty optional fields render nothing, so
//                   the exported / printed page is never padded with placeholders.
export const PreviewCtx = createContext(false)

// A value, or (in preview only) a light-grey placeholder. Returns null in the
// real document when empty, so callers can also branch on the raw value.
export function Val({ value, ph = '' }) {
  const preview = useContext(PreviewCtx)
  const v = typeof value === 'string' ? value.trim() : value
  if (v) return <>{v}</>
  if (preview && ph) return <span className="cd-ph">{ph}</span>
  return null
}

const has = (v) => typeof v === 'string' && v.trim().length > 0

export function Spacer({ y = 20 }) {
  return <div aria-hidden="true" style={{ height: `calc(${y}px * var(--cd-k))` }} />
}

// The gap between the institution header and the assignment block. Driven by the
// "header spacing" option (--cd-header-gap) so that control actually moves the
// document, and still scaled by the overall spacing (--cd-k).
export function HeaderGap() {
  return <div aria-hidden="true" style={{ height: `calc(var(--cd-header-gap) * var(--cd-k))` }} />
}

export function Logo({ cover, className }) {
  const u = cover.university
  const preview = useContext(PreviewCtx)
  if (!u.logoEnabled) return null
  const px = opt(LOGO_SIZES, cover.options.logoSize).px
  if (!u.logo) {
    // In preview, hint where the logo will sit; in the real doc, nothing.
    if (!preview) return null
    return (
      <div
        className={cx('cd-logo', `cd-logo--${cover.options.logoPosition}`, className)}
        style={{ height: px, width: px, border: '1px dashed #c7cbd0', display: 'grid', placeItems: 'center', color: '#b6bac0', fontSize: 11 }}
      >
        Logo
      </div>
    )
  }
  return (
    <img
      src={u.logo}
      alt=""
      className={cx('cd-logo', `cd-logo--${cover.options.logoPosition}`, className)}
      style={{ height: px }}
    />
  )
}

// Format an ISO date (YYYY-MM-DD) as "18 September 2026" without timezone drift.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export function fmtDate(iso) {
  if (!has(iso)) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const [, y, mo, d] = m
  const month = MONTHS[Number(mo) - 1]
  if (!month) return iso
  return `${Number(d)} ${month} ${y}`
}

// The detail lines for one student, in a stable order, skipping empties.
export function studentLines(s) {
  const lines = []
  if (has(s.studentId)) lines.push(['ID', s.studentId])
  if (has(s.program)) lines.push(['Program', s.program])
  if (has(s.department)) lines.push(['Department', s.department])
  if (has(s.batch)) lines.push(['Batch', s.batch])
  if (has(s.section)) lines.push(['Section', s.section])
  if (has(s.group)) lines.push(['Group', s.group])
  return lines
}

// Assignment metadata rows (course, code, credit, semester, section, date),
// skipping empties — used by templates that show a key/value block.
export function assignmentRows(cover, { withDate = true } = {}) {
  const a = cover.assignment
  const rows = []
  if (has(a.courseName)) rows.push(['Course', a.courseName])
  if (has(a.courseCode)) rows.push(['Course Code', a.courseCode])
  if (has(a.courseCredit)) rows.push(['Credit', a.courseCredit])
  if (has(a.semester)) rows.push(['Semester', a.semester])
  if (has(a.section)) rows.push(['Section', a.section])
  if (withDate && has(a.submissionDate)) rows.push(['Date of Submission', fmtDate(a.submissionDate)])
  return rows
}

// A person: a bold name plus stacked meta lines (already "Label: Value"
// strings, or plain lines). Inherits alignment from its container.
export function Person({ name, namePh, lines = [] }) {
  return (
    <div>
      <div className="cd-name">
        <Val value={name} ph={namePh} />
      </div>
      {lines.filter(Boolean).map((ln, i) => (
        <div key={i} className="cd-meta">{ln}</div>
      ))}
    </div>
  )
}

// One student rendered from the data model, with a sensible line order.
export function StudentBlock({ student, index, showIndex = false }) {
  const lines = studentLines(student).map(([k, v]) => `${k}: ${v}`)
  return (
    <div className="cd-student">
      <div className="cd-name">
        {showIndex ? `${index + 1}. ` : ''}
        <Val value={student.name} ph={index === 0 ? 'Student name' : `Student ${index + 1}`} />
      </div>
      {lines.map((ln, i) => (
        <div key={i} className="cd-meta">{ln}</div>
      ))}
    </div>
  )
}

// The instructor ("Submitted To") as a Person.
export function Instructor({ cover }) {
  const t = cover.submittedTo
  const lines = []
  if (has(t.designation)) lines.push(t.designation)
  if (has(t.department)) lines.push(t.department)
  return <Person name={t.name} namePh="Instructor name" lines={lines} />
}

/* -------------------------------------------------------------- vertical bits */
// The shared building blocks for the single-column academic covers. Every
// template composes these, so all five show the SAME fields in the SAME order
// and render each row identically — the templates differ only in their chrome
// (alignment, rules, bands, frames), never in the information they present.

// A vertical "Label: value" list: a bold label with its colon, then the value
// in an aligned second column so every value starts at the same x. Empty
// optional rows vanish in the real document; in preview, a row carrying a
// placeholder shows a muted hint so the structure stays legible while the form
// is still being filled. Each row is [label, value, placeholder?].
export function MetaList({ rows, className }) {
  const preview = useContext(PreviewCtx)
  const items = rows.filter(([, v, ph]) => has(v) || (preview && ph))
  if (!items.length) return null
  return (
    <dl className={cx('cd-dl', className)}>
      {items.map(([k, v, ph]) => (
        <Fragment key={k}>
          <dt className="cd-dl__key">{k}:</dt>
          <dd className="cd-dl__val">{has(v) ? v : <span className="cd-ph">{ph}</span>}</dd>
        </Fragment>
      ))}
    </dl>
  )
}

// The canonical field orders, shared by every template.
export const courseMetaRows = (a) => [
  ['Course Title', a.courseName, 'Course name'],
  ['Course Code', a.courseCode],
  ['Credit', a.courseCredit],
  ['Semester', a.semester],
  ['Section', a.section],
]
export const instructorMetaRows = (t) => [
  ['Name', t.name, 'Instructor name'],
  ['Designation', t.designation],
  ['Department', t.department],
]
export const studentMetaRows = (s, i) => [
  ['Name', s.name, i === 0 ? 'Student name' : `Student ${i + 1}`],
  ['Student ID', s.studentId, i === 0 ? 'Student ID' : ''],
  ['Program', s.program],
  ['Department', s.department],
  ['Batch', s.batch],
  ['Section', s.section],
  ['Group', s.group],
]

// The "Submitted By" students as one bordered card each (a group gets a card
// per member, numbered). `boxClass` lets a template restyle the card border to
// match its character while the contents stay identical.
export function StudentCards({ students, boxClass }) {
  const multi = students.length > 1
  return (
    <div className="cd-substack">
      {students.map((s, i) => (
        <div className={cx('cd-sbox', boxClass)} key={s.id}>
          {multi && <div className="cd-subindex">Student {i + 1}</div>}
          <MetaList rows={studentMetaRows(s, i)} className="cd-dl--fill" />
        </div>
      ))}
    </div>
  )
}

// The submission date, formatted, for the foot of the page. Shows a muted hint
// in preview when empty; renders nothing in the real document.
export function SubmissionDate({ cover, className }) {
  const a = cover.assignment
  return (
    <div className={cx('cd-date', className)}>
      {has(a.submissionDate)
        ? <>Date of Submission: <b>{fmtDate(a.submissionDate)}</b></>
        : <Val value="" ph="Date of Submission" />}
    </div>
  )
}

export { has, cx }
