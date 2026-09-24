import { useContext } from 'react'
import {
  Logo, Val, Spacer, HeaderGap, has, PreviewCtx,
  MetaList, StudentCards, SubmissionDate,
  courseMetaRows, instructorMetaRows,
} from './bits'

// Clean Border — the whole cover is composed inside a fine ruled panel with a
// double keyline, giving it a poised, certificate-like frame that still reads as
// a serious document. The layout mirrors the Classic order (crest, institution,
// title, then the stacked parties), but the frame is the signature and pulls the
// content into a single considered block.
export default function CleanBorder({ cover }) {
  const preview = useContext(PreviewCtx)
  const u = cover.university
  const a = cover.assignment
  const multi = cover.students.length > 1
  const titled = has(a.title)

  return (
    <div className="cd-body cd-align-center" style={{ padding: 'calc(var(--cd-pad) - 22px)' }}>
      <div
        style={{
          flex: 1,
          width: '100%',
          border: '1px solid var(--cd-accent)',
          boxShadow: 'inset 0 0 0 4px #ffffff, inset 0 0 0 5px #e0e3e7',
          padding: '38px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Logo cover={cover} />
        <Spacer y={10} />
        <h1 className="cd-univ"><Val value={u.name} ph="University Name" /></h1>
        {has(u.faculty) && <div className="cd-univ-sub"><Val value={u.faculty} /></div>}
        <div className="cd-univ-sub cd-univ-sub--lg"><Val value={u.department} ph="Department" /></div>

        <Spacer y={12} />
        <hr className="cd-rule" />
        <HeaderGap />

        <div className="cd-doctype"><Val value={a.type} /></div>
        <Spacer y={8} />
        <h2 className="cd-title">
          {titled ? a.title : preview ? <span className="cd-ph">Assignment Title</span> : <Val value={a.type} />}
        </h2>

        <Spacer y={22} />
        <MetaList rows={courseMetaRows(a)} />

        <Spacer y={24} />
        <div className="cd-subhead">Submitted To:</div>
        <MetaList rows={instructorMetaRows(cover.submittedTo)} />

        <Spacer y={22} />
        <div className="cd-subhead">Submitted By{multi ? ' (Group)' : ''}:</div>
        <StudentCards students={cover.students} boxClass="cd-sbox--soft" />

        <div style={{ marginTop: 'auto', paddingTop: 'calc(20px * var(--cd-k))' }}>
          <SubmissionDate cover={cover} />
        </div>
      </div>
    </div>
  )
}
