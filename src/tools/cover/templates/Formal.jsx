import { useContext } from 'react'
import {
  Logo, Val, Spacer, HeaderGap, fmtDate, has, PreviewCtx,
  MetaList, studentMetaRows, instructorMetaRows,
} from './bits'

// Formal Report — a report / thesis title page. The institution is centred at
// the top, the title is framed by a double rule, and every party is gathered
// into one official ruled panel whose rows stack top to bottom: Submitted To,
// Submitted By, then the date. The framed title and the paneled form are the
// signature — together they read as a document an office would file.
export default function Formal({ cover }) {
  const preview = useContext(PreviewCtx)
  const u = cover.university
  const a = cover.assignment
  const multi = cover.students.length > 1
  const titled = has(a.title)

  const courseBits = [
    has(a.courseName) ? a.courseName : '',
    has(a.courseCode) ? a.courseCode : '',
    has(a.courseCredit) ? `${a.courseCredit} Credit` : '',
    has(a.semester) ? a.semester : '',
    has(a.section) ? `Section ${a.section}` : '',
  ].filter(Boolean)

  return (
    <div className="cd-body">
      <Logo cover={cover} />
      <Spacer y={8} />
      <h1 className="cd-univ"><Val value={u.name} ph="University Name" /></h1>
      {has(u.faculty) && <div className="cd-univ-sub"><Val value={u.faculty} /></div>}
      <div className="cd-univ-sub cd-univ-sub--muted"><Val value={u.department} ph="Department" /></div>

      <HeaderGap />

      {/* Title framed by top + bottom double rules */}
      <div style={{ width: '100%', borderTop: '3px double var(--cd-accent)', borderBottom: '3px double var(--cd-accent)', padding: '22px 0' }}>
        <div className="cd-type"><Val value={a.type} /></div>
        <Spacer y={10} />
        <h2 className="cd-title">
          {titled ? a.title : preview ? <span className="cd-ph">Report Title</span> : <Val value={a.type} />}
        </h2>
      </div>

      <Spacer y={14} />
      <div className="cd-course">
        {courseBits.length ? courseBits.join('  ·  ') : preview ? <span className="cd-ph">Course details</span> : null}
      </div>

      <Spacer y={30} />

      {/* One official ruled panel, rows stacked top to bottom */}
      <div className="cd-fpanel">
        <div className="cd-fpanel__row">
          <div className="cd-partytitle">Submitted To</div>
          <MetaList rows={instructorMetaRows(cover.submittedTo)} className="cd-dl--fill" />
        </div>
        <div className="cd-fpanel__row">
          <div className="cd-partytitle">Submitted By{multi ? ' (Group)' : ''}</div>
          <div className="cd-fpanel__stack">
            {cover.students.map((s, i) => (
              <div key={s.id}>
                {multi && <div className="cd-subindex">Student {i + 1}</div>}
                <MetaList rows={studentMetaRows(s, i)} className="cd-dl--fill" />
              </div>
            ))}
          </div>
        </div>
        <div className="cd-fpanel__row">
          <div className="cd-partytitle">Date of Submission</div>
          <div className="cd-meta" style={{ fontSize: 'calc(15px * var(--cd-scale))', color: '#14181d' }}>
            {has(a.submissionDate) ? fmtDate(a.submissionDate) : preview ? <span className="cd-ph">Submission date</span> : '—'}
          </div>
        </div>
      </div>
    </div>
  )
}
