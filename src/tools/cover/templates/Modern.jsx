import { useContext } from 'react'
import {
  Logo, Val, Spacer, HeaderGap, has, PreviewCtx,
  MetaList, StudentCards, SubmissionDate,
  courseMetaRows, instructorMetaRows,
} from './bits'

// Modern Academic — a slim solid accent band runs the full height of the left
// edge and the report title picks up the same colour: one restrained hue, used
// with intent, for a contemporary but sober cover. The institution sits at the
// top with the crest to its right; sections are spaced uppercase labels, and
// each student's card carries a matching accent spine. No gradients, no graphics.
export default function Modern({ cover }) {
  const preview = useContext(PreviewCtx)
  const u = cover.university
  const a = cover.assignment
  const multi = cover.students.length > 1
  const titled = has(a.title)

  return (
    <>
      <div className="cd-sideband" />
      <div
        className="cd-body cd-align-left"
        style={{ paddingLeft: 'calc(var(--cd-pad) + 34px)' }}
      >
        {/* Header — institution left, crest right */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, width: '100%' }}>
          <div>
            <h1 className="cd-univ" style={{ fontSize: 'calc(26px * var(--cd-scale))' }}>
              <Val value={u.name} ph="University Name" />
            </h1>
            <div className="cd-univ-sub cd-univ-sub--lg" style={{ fontSize: 'calc(16px * var(--cd-scale))' }}>
              <Val value={u.department} ph="Department" />
            </div>
            {has(u.faculty) && <div className="cd-univ-addr"><Val value={u.faculty} /></div>}
          </div>
          <Logo cover={cover} />
        </div>

        <Spacer y={18} />
        <hr className="cd-rule" style={{ marginLeft: 0 }} />
        <HeaderGap />

        {/* Report title carries the accent colour */}
        <div className="cd-eyebrow cd-eyebrow--accent"><Val value={a.type} /></div>
        <h2 className="cd-title cd-title--accent" style={{ maxWidth: '92%' }}>
          {titled ? a.title : preview ? <span className="cd-ph">Assignment Title</span> : <Val value={a.type} />}
        </h2>

        <Spacer y={28} />
        <MetaList rows={courseMetaRows(a)} />

        <Spacer y={30} />
        <div className="cd-eyebrow cd-eyebrow--accent">Submitted To</div>
        <MetaList rows={instructorMetaRows(cover.submittedTo)} />

        <Spacer y={26} />
        <div className="cd-eyebrow cd-eyebrow--accent">Submitted By{multi ? ' (Group)' : ''}</div>
        <StudentCards students={cover.students} boxClass="cd-sbox--accent" />

        <div className="cd-foot">
          <SubmissionDate cover={cover} />
        </div>
      </div>
    </>
  )
}
