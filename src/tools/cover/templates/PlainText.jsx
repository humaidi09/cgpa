import { useContext } from 'react'
import {
  Logo, Val, Spacer, HeaderGap, fmtDate, has, cx, PreviewCtx, MetaList,
} from './bits'

// Plain Text — a monospace, typewriter-style cover: a fillable skeleton with
// UPPERCASE section headers and bracketed [placeholders] you type over. It is the
// deliberately plain option — no crest chrome, no accent rules — for departments
// that want a typed cover sheet. Only "Submitted By" is boxed (a single ruled
// frame around every member); every other section sits as plain typed lines.
// Bracketed hints show only in the live preview; the exported page prints just
// the filled values, empty fields removed.

// Course rows carry a bracketed placeholder for every field so the preview reads
// as a complete skeleton; empties vanish in the exported document.
const ptCourseRows = (a) => [
  ['Course Title', a.courseName, '[Course Title]'],
  ['Course Code', a.courseCode, '[Course Code]'],
  ['Credit', a.courseCredit, '[Credit]'],
  ['Semester', a.semester, '[Semester]'],
  ['Section', a.section, '[Section]'],
]

// The first student shows the full bracketed skeleton; additional group members
// only carry a name hint, so the preview does not repeat seven empty rows each.
const ptStudentRows = (s, i) => [
  ['Name', s.name, i === 0 ? '[Student Name]' : `[Student ${i + 1} Name]`],
  ['Student ID', s.studentId, i === 0 ? '[Student ID]' : ''],
  ['Program', s.program, i === 0 ? '[Program]' : ''],
  ['Department', s.department, i === 0 ? '[Department]' : ''],
  ['Batch', s.batch, i === 0 ? '[Batch]' : ''],
  ['Section', s.section, i === 0 ? '[Section]' : ''],
  ['Group', s.group, i === 0 ? '[Group]' : ''],
]

export default function PlainText({ cover }) {
  const preview = useContext(PreviewCtx)
  const u = cover.university
  const a = cover.assignment
  const t = cover.submittedTo
  const multi = cover.students.length > 1
  const titled = has(a.title)
  const type = a.type || 'Assignment'

  return (
    <div className="cd-body">
      {/* Header — logo, institution, faculty, department, address */}
      <Logo cover={cover} />
      <Spacer y={12} />
      <h1 className="cd-univ"><Val value={u.name} ph="[University Name]" /></h1>
      {(has(u.faculty) || preview) && (
        <div className="cd-univ-sub"><Val value={u.faculty} ph="[Faculty]" /></div>
      )}
      <div className="cd-univ-sub cd-univ-sub--lg"><Val value={u.department} ph="[Department]" /></div>
      {(has(u.address) || preview) && (
        <div className="cd-univ-addr"><Val value={u.address} ph="[Address]" /></div>
      )}

      <HeaderGap />

      {/* Assignment on <title> */}
      <div className="cd-pt-eyebrow">{titled || preview ? `${type} on` : type}</div>
      {(titled || preview) && (
        <>
          <Spacer y={6} />
          <h2 className="cd-pt-title">
            {titled ? a.title : <span className="cd-ph">[Assignment Title]</span>}
          </h2>
        </>
      )}

      <Spacer y={26} />

      {/* Course information */}
      <div className="cd-pt-head">Course Information</div>
      <MetaList rows={ptCourseRows(a)} />

      <Spacer y={26} />

      {/* Submitted to — plain stacked lines, no labels */}
      <div className="cd-pt-head">Submitted To</div>
      <div className="cd-pt-lines">
        <div className="cd-pt-strong"><Val value={t.name} ph="[Instructor Name]" /></div>
        {(has(t.designation) || preview) && <div><Val value={t.designation} ph="[Designation]" /></div>}
        {(has(t.department) || preview) && <div><Val value={t.department} ph="[Department]" /></div>}
      </div>

      <Spacer y={26} />

      {/* Submitted by — the one boxed section (a member per row, numbered) */}
      <div className="cd-pt-head">Submitted By{multi ? ' (Group)' : ''}</div>
      <div className="cd-pt-box">
        {cover.students.map((s, i) => (
          <div key={s.id} className={cx(i > 0 && 'cd-pt-member')}>
            {multi && <div className="cd-pt-idx">Student {i + 1}</div>}
            <MetaList rows={ptStudentRows(s, i)} className="cd-dl--fill" />
          </div>
        ))}
      </div>

      {/* Date of submission, pinned to the foot */}
      <div className="cd-foot">
        <div className="cd-pt-date">
          Date of Submission:{' '}
          {has(a.submissionDate)
            ? <b>{fmtDate(a.submissionDate)}</b>
            : preview ? <span className="cd-ph">[Date]</span> : null}
        </div>
      </div>
    </div>
  )
}
