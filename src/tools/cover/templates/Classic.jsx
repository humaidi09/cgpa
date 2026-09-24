import { useContext } from 'react'
import {
  Logo, Val, Spacer, HeaderGap, has, PreviewCtx,
  MetaList, StudentCards, SubmissionDate,
  courseMetaRows, instructorMetaRows,
} from './bits'

// Classic University — the vertical, single-column title page a South-Asian /
// Commonwealth department actually expects: the crest on top, the institution
// name and department beneath it, the report title, then "Label: Value" rows
// whose values line up in a column. Submitted To / Submitted By are stacked
// (never side-by-side); the student's details sit in a bordered box, and the
// submission date is pinned to the foot of the page.
export default function Classic({ cover }) {
  const preview = useContext(PreviewCtx)
  const u = cover.university
  const a = cover.assignment
  const multi = cover.students.length > 1
  const titled = has(a.title)

  return (
    <div className="cd-body">
      {/* Header — crest on top, then institution name, faculty & department */}
      <Logo cover={cover} />
      <Spacer y={16} />
      <h1 className="cd-univ"><Val value={u.name} ph="University Name" /></h1>
      {has(u.faculty) && <div className="cd-univ-sub"><Val value={u.faculty} /></div>}
      <div className="cd-univ-sub cd-univ-sub--lg"><Val value={u.department} ph="Department" /></div>
      {has(u.address) && <div className="cd-univ-addr"><Val value={u.address} /></div>}

      <HeaderGap />

      {/* Report title — the type headlines when there is no separate title */}
      {(titled || preview) && has(a.type) && (
        <>
          <div className="cd-doctype"><Val value={a.type} /></div>
          <Spacer y={8} />
        </>
      )}
      <h2 className="cd-title">
        {titled ? a.title : preview ? <span className="cd-ph">Assignment Title</span> : <Val value={a.type} />}
      </h2>

      <Spacer y={26} />
      <MetaList rows={courseMetaRows(a)} />

      <Spacer y={28} />
      <div className="cd-subhead">Submitted To:</div>
      <MetaList rows={instructorMetaRows(cover.submittedTo)} />

      <Spacer y={26} />
      <div className="cd-subhead">Submitted By{multi ? ' (Group)' : ''}:</div>
      <StudentCards students={cover.students} />

      {/* Submission date, pinned to the foot of the page */}
      <div className="cd-foot">
        <SubmissionDate cover={cover} />
      </div>
    </div>
  )
}
