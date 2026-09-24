import { useContext } from 'react'
import {
  Logo, Val, Spacer, HeaderGap, has, PreviewCtx,
  MetaList, StudentCards, SubmissionDate,
  courseMetaRows, instructorMetaRows,
} from './bits'

// Minimal Academic — left-aligned, generous whitespace, hairline rules, and no
// colour beyond a single accent eyebrow. The crest sits small beside the
// institution name; sections are introduced by spaced uppercase labels rather
// than headings, and the student's details rest in a soft-keyline card. The
// restraint is the point — it reads like a well-set department handout.
export default function Minimal({ cover }) {
  const preview = useContext(PreviewCtx)
  const u = cover.university
  const a = cover.assignment
  const multi = cover.students.length > 1
  const titled = has(a.title)

  return (
    <div className="cd-body cd-align-left">
      {/* Header — small crest beside a quiet institution block */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, width: '100%' }}>
        <Logo cover={cover} />
        <div>
          <h1 className="cd-univ" style={{ fontSize: 'calc(24px * var(--cd-scale))', letterSpacing: 'normal' }}>
            <Val value={u.name} ph="University Name" />
          </h1>
          <div className="cd-univ-sub cd-univ-sub--muted"><Val value={u.department} ph="Department" /></div>
          {has(u.faculty) && <div className="cd-univ-addr"><Val value={u.faculty} /></div>}
        </div>
      </div>

      <Spacer y={20} />
      <hr className="cd-hr" />
      <HeaderGap />

      {/* Report title — a spaced eyebrow over a restrained title */}
      <div className="cd-eyebrow cd-eyebrow--accent"><Val value={a.type} /></div>
      <h2 className="cd-title" style={{ maxWidth: '92%' }}>
        {titled ? a.title : preview ? <span className="cd-ph">Assignment Title</span> : <Val value={a.type} />}
      </h2>

      <Spacer y={30} />
      <MetaList rows={courseMetaRows(a)} />

      <Spacer y={30} />
      <div className="cd-eyebrow">Submitted To</div>
      <MetaList rows={instructorMetaRows(cover.submittedTo)} />

      <Spacer y={26} />
      <div className="cd-eyebrow">Submitted By{multi ? ' (Group)' : ''}</div>
      <StudentCards students={cover.students} boxClass="cd-sbox--soft" />

      <div className="cd-foot">
        <hr className="cd-hr" style={{ marginBottom: 'calc(18px * var(--cd-k))' }} />
        <SubmissionDate cover={cover} />
      </div>
    </div>
  )
}
