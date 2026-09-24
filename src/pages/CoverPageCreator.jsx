import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Download, Image as ImageIcon, Printer, Upload, Plus, Trash2,
  Save, Sparkles, RotateCcw, FileWarning, Check, X,
} from 'lucide-react'
import { Button, Card, Field, Input, Select, Segmented, Toggle, Callout, cx } from '@/components/ui'
import CoverDocument from '@/tools/cover/CoverDocument'
import { useFitScale } from '@/tools/cover/useFitScale'
import { downloadPDF, downloadPNG, printCover } from '@/tools/cover/exportCover'
import { downscaleImage } from '@/tools/cover/image'
import { validateCover } from '@/tools/cover/validation'
import { buildFilename } from '@/tools/cover/filename'
import {
  blankCover, blankStudent, demoCover,
  ASSIGNMENT_TYPES, ACCENTS, FONTS, LOGO_SIZES, LOGO_POSITIONS, ALIGNS, BORDERS, SPACINGS, HEADER_SPACINGS, FONT_SCALES,
} from '@/tools/cover/defaults'
import { TEMPLATES } from '@/tools/cover/templates'
import { useTools, applyProfile } from '@/tools/toolsStore'

/* --------------------------------------------------------------- small bits -- */

function Section({ title, desc, right, children }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          {desc && <p className="mt-0.5 text-sm text-muted">{desc}</p>}
        </div>
        {right}
      </div>
      {children}
    </Card>
  )
}

function OptionRow({ label, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-1.5">
      <span className="font-mono text-xs text-muted">{label}</span>
      {children}
    </div>
  )
}

const seg = (list) => list.map((o) => ({ value: o.id, label: o.label }))

// Build the initial working cover: an explicit ?id= edits a saved cover; else an
// in-progress draft is resumed; else a fresh cover, pre-filled from the saved
// academic profile if the student has one.
function makeInitialCover(editId) {
  const { getCover, draft, academicProfile } = useTools.getState()
  if (editId) {
    const existing = getCover(editId)
    if (existing) return structuredClone(existing)
  }
  if (draft) return draft
  return applyProfile(blankCover(), academicProfile)
}

/* ------------------------------------------------------------------ page ----- */

export default function CoverPageCreator() {
  const [params] = useSearchParams()
  const editId = params.get('id')

  const setDraft = useTools((s) => s.setDraft)
  const upsertCover = useTools((s) => s.upsertCover)
  const saveProfile = useTools((s) => s.saveProfile)

  const [cover, setCover] = useState(() => makeInitialCover(editId))
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState(null)

  const fileRef = useRef(null)
  const captureRef = useRef(null)
  const fitRef = useRef(null)
  const scale = useFitScale(fitRef)

  // Persist the in-progress cover so a reload never loses work.
  useEffect(() => {
    setDraft(cover)
  }, [cover, setDraft])

  // Auto-dismiss the little status line.
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 3600)
    return () => clearTimeout(t)
  }, [notice])

  /* ---- field updaters (targeted, immutable) ---- */
  const setUni = (k, v) => setCover((c) => ({ ...c, university: { ...c.university, [k]: v } }))
  const setAssign = (k, v) => setCover((c) => ({ ...c, assignment: { ...c.assignment, [k]: v } }))
  const setTo = (k, v) => setCover((c) => ({ ...c, submittedTo: { ...c.submittedTo, [k]: v } }))
  const setOpt = (k, v) => setCover((c) => ({ ...c, options: { ...c.options, [k]: v } }))
  const setStudent = (id, k, v) =>
    setCover((c) => ({ ...c, students: c.students.map((s) => (s.id === id ? { ...s, [k]: v } : s)) }))
  const addStudent = () => setCover((c) => ({ ...c, students: [...c.students, blankStudent()] }))
  const removeStudent = (id) =>
    setCover((c) => (c.students.length > 1 ? { ...c, students: c.students.filter((s) => s.id !== id) } : c))
  const setTemplate = (t) => setCover((c) => ({ ...c, template: t }))

  /* ---- filename (auto until edited) ---- */
  const autoName = useMemo(() => buildFilename(cover), [cover])
  const filename = cover.filenameEdited ? cover.filename : autoName
  const onFilename = (v) => setCover((c) => ({ ...c, filename: v, filenameEdited: true }))
  const resetFilename = () => setCover((c) => ({ ...c, filename: '', filenameEdited: false }))

  /* ---- validation ---- */
  const missing = useMemo(() => validateCover(cover), [cover])
  const complete = missing.length === 0

  /* ---- actions ---- */
  const onLogo = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const dataUrl = await downscaleImage(file)
      setCover((c) => ({ ...c, university: { ...c.university, logo: dataUrl, logoEnabled: true } }))
    } catch {
      setNotice({ tone: 'bad', msg: 'That image could not be read. Try a PNG or JPG.' })
    }
  }

  const loadDemo = async () => {
    const c = await demoCover()
    setCover(c)
    setNotice({ tone: 'ok', msg: 'Loaded the Leading University demo — edit any field to make it yours.' })
  }

  const onSaveProfile = () => {
    saveProfile(cover)
    setNotice({ tone: 'ok', msg: 'Saved. Your university and details will auto-fill next time.' })
  }

  const resetAll = () => {
    const { academicProfile } = useTools.getState()
    setCover(applyProfile(blankCover(), academicProfile))
    setNotice({ tone: 'info', msg: 'Cleared. Started a fresh cover page.' })
  }

  const runExport = async (kind) => {
    if (!complete || busy) return
    setBusy(kind)
    try {
      const node = captureRef.current
      if (kind === 'pdf') await downloadPDF(node, filename)
      else await downloadPNG(node, filename)
      upsertCover({ ...cover, filename })
      setNotice({ tone: 'ok', msg: `Downloaded ${filename}.${kind}` })
    } catch {
      setNotice({ tone: 'bad', msg: 'Export failed. Please try again.' })
    } finally {
      setBusy('')
    }
  }

  const onPrint = () => {
    if (!complete) return
    upsertCover({ ...cover, filename })
    printCover()
  }

  const u = cover.university
  const a = cover.assignment
  const to = cover.submittedTo
  const multi = cover.students.length > 1

  return (
    <div className="pb-24 lg:pb-0">
      {/* header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/tools" className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
            Student Tools
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Assignment Cover Page</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Fill in your details, pick a template, and download a submission-ready cover page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={loadDemo}>
            <Sparkles className="h-4 w-4" />
            Load demo
          </Button>
          <Button variant="outline" size="sm" onClick={onSaveProfile}>
            <Save className="h-4 w-4" />
            Save my info
          </Button>
          <Button variant="ghost" size="sm" onClick={resetAll}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {notice && (
        <div className="mb-5">
          <Callout tone={notice.tone === 'bad' ? 'bad' : notice.tone === 'ok' ? 'ok' : 'info'} icon={notice.tone === 'bad' ? X : Check}>
            {notice.msg}
          </Callout>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
        {/* ---------------------------------------------------------- form ---- */}
        <div className="space-y-5">
          {/* University */}
          <Section
            title="University"
            desc="Nothing is preset — enter your own institution."
            right={<Toggle id="logo-on" checked={u.logoEnabled} onChange={(v) => setUni('logoEnabled', v)} label="Logo" />}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="University name" className="sm:col-span-2">
                <Input value={u.name} onChange={(e) => setUni('name', e.target.value)} placeholder="e.g. University of Dhaka" />
              </Field>
              <Field label="Department">
                <Input value={u.department} onChange={(e) => setUni('department', e.target.value)} placeholder="e.g. Computer Science & Engineering" />
              </Field>
              <Field label="Faculty / School (optional)">
                <Input value={u.faculty} onChange={(e) => setUni('faculty', e.target.value)} placeholder="e.g. Faculty of Science" />
              </Field>
              <Field label="Address (optional)" className="sm:col-span-2">
                <Input value={u.address} onChange={(e) => setUni('address', e.target.value)} placeholder="City, country" />
              </Field>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogo} />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" />
                {u.logo ? 'Replace logo' : 'Upload logo'}
              </Button>
              {u.logo && (
                <>
                  <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-lg border border-hair bg-white">
                    <img src={u.logo} alt="University logo preview" className="max-h-9 max-w-9 object-contain" />
                  </span>
                  <button
                    type="button"
                    onClick={() => setUni('logo', '')}
                    className="inline-flex items-center gap-1 text-xs text-muted hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </>
              )}
            </div>
          </Section>

          {/* Assignment */}
          <Section title="Assignment">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Title" className="sm:col-span-2">
                <Input value={a.title} onChange={(e) => setAssign('title', e.target.value)} placeholder="e.g. Analysis of Sorting Algorithms" />
              </Field>
              <Field label="Type">
                <Select value={a.type} onChange={(e) => setAssign('type', e.target.value)}>
                  {ASSIGNMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Course name">
                <Input value={a.courseName} onChange={(e) => setAssign('courseName', e.target.value)} placeholder="e.g. Data Structures" />
              </Field>
              <Field label="Course code">
                <Input value={a.courseCode} onChange={(e) => setAssign('courseCode', e.target.value)} placeholder="e.g. CSE 2101" />
              </Field>
              <Field label="Course credit (optional)">
                <Input value={a.courseCredit} onChange={(e) => setAssign('courseCredit', e.target.value)} placeholder="e.g. 3.0" />
              </Field>
              <Field label="Semester">
                <Input value={a.semester} onChange={(e) => setAssign('semester', e.target.value)} placeholder="e.g. Spring 2026" />
              </Field>
              <Field label="Section">
                <Input value={a.section} onChange={(e) => setAssign('section', e.target.value)} placeholder="e.g. A" />
              </Field>
              <Field label="Submission date" className="sm:col-span-2">
                <Input type="date" value={a.submissionDate} onChange={(e) => setAssign('submissionDate', e.target.value)} className="max-w-[220px]" />
              </Field>
            </div>
          </Section>

          {/* Submitted To */}
          <Section title="Submitted to" desc="Your course instructor.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Instructor name" className="sm:col-span-2">
                <Input value={to.name} onChange={(e) => setTo('name', e.target.value)} placeholder="e.g. Dr. Ayesha Rahman" />
              </Field>
              <Field label="Designation">
                <Input value={to.designation} onChange={(e) => setTo('designation', e.target.value)} placeholder="e.g. Associate Professor" />
              </Field>
              <Field label="Department">
                <Input value={to.department} onChange={(e) => setTo('department', e.target.value)} placeholder="e.g. CSE" />
              </Field>
            </div>
          </Section>

          {/* Submitted By */}
          <Section
            title="Submitted by"
            desc={multi ? 'Group submission — add each member.' : 'You. Add more members for a group assignment.'}
            right={
              <Button variant="outline" size="sm" onClick={addStudent}>
                <Plus className="h-4 w-4" />
                Add student
              </Button>
            }
          >
            <div className="space-y-4">
              {cover.students.map((s, i) => (
                <div key={s.id} className={cx(i > 0 && 'border-t border-hair pt-4')}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-xs text-muted">{multi ? `Student ${i + 1}` : 'Student'}</span>
                    {cover.students.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStudent(s.id)}
                        className="inline-flex items-center gap-1 text-xs text-muted hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Full name">
                      <Input value={s.name} onChange={(e) => setStudent(s.id, 'name', e.target.value)} placeholder="e.g. Hussain Ahmed" />
                    </Field>
                    <Field label="Student ID">
                      <Input value={s.studentId} onChange={(e) => setStudent(s.id, 'studentId', e.target.value)} placeholder="e.g. 2011020001" />
                    </Field>
                    <Field label="Program">
                      <Input value={s.program} onChange={(e) => setStudent(s.id, 'program', e.target.value)} placeholder="e.g. B.Sc. in CSE" />
                    </Field>
                    <Field label="Department">
                      <Input value={s.department} onChange={(e) => setStudent(s.id, 'department', e.target.value)} placeholder="e.g. CSE" />
                    </Field>
                    <Field label="Batch">
                      <Input value={s.batch} onChange={(e) => setStudent(s.id, 'batch', e.target.value)} placeholder="e.g. 60th" />
                    </Field>
                    <Field label="Section">
                      <Input value={s.section} onChange={(e) => setStudent(s.id, 'section', e.target.value)} placeholder="e.g. A" />
                    </Field>
                    <Field label="Group (optional)" className="sm:col-span-2">
                      <Input value={s.group} onChange={(e) => setStudent(s.id, 'group', e.target.value)} placeholder="e.g. 4" className="max-w-[160px]" />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Template */}
          <Section title="Template" desc="Five submission-grade layouts.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TEMPLATES.map((t) => {
                const active = cover.template === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    aria-pressed={active}
                    className={cx(
                      'rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neonCyan',
                      active ? 'border-neonCyan bg-neonCyan/[0.06]' : 'border-hair bg-fill hover:border-neonCyan/40',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{t.label}</span>
                      {active && <Check className="h-4 w-4 shrink-0 text-neonCyan" />}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{t.desc}</p>
                  </button>
                )
              })}
            </div>
          </Section>

          {/* Customize */}
          <Section title="Customize" desc="Small adjustments — the document stays professional.">
            <div className="divide-y divide-hair/60">
              <OptionRow label="Accent colour">
                <div className="flex gap-2">
                  {ACCENTS.map((ac) => (
                    <button
                      key={ac.id}
                      type="button"
                      onClick={() => setOpt('accent', ac.id)}
                      aria-label={ac.label}
                      aria-pressed={cover.options.accent === ac.id}
                      title={ac.label}
                      className={cx(
                        'h-7 w-7 rounded-full border-2 transition-transform',
                        cover.options.accent === ac.id ? 'scale-110 border-ink' : 'border-transparent hover:scale-105',
                      )}
                      style={{ background: ac.hex }}
                    />
                  ))}
                </div>
              </OptionRow>
              <OptionRow label="Font">
                <Select value={cover.options.font} onChange={(e) => setOpt('font', e.target.value)} className="max-w-[180px]">
                  {FONTS.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </Select>
              </OptionRow>
              <OptionRow label="Font size">
                <Segmented size="sm" ariaLabel="Font size" value={cover.options.fontScale} onChange={(v) => setOpt('fontScale', v)} options={seg(FONT_SCALES)} />
              </OptionRow>
              <OptionRow label="Text alignment">
                <Segmented size="sm" ariaLabel="Text alignment" value={cover.options.align} onChange={(v) => setOpt('align', v)} options={seg(ALIGNS)} />
              </OptionRow>
              <OptionRow label="Logo size">
                <Segmented size="sm" ariaLabel="Logo size" value={cover.options.logoSize} onChange={(v) => setOpt('logoSize', v)} options={seg(LOGO_SIZES)} />
              </OptionRow>
              <OptionRow label="Logo position">
                <Segmented size="sm" ariaLabel="Logo position" value={cover.options.logoPosition} onChange={(v) => setOpt('logoPosition', v)} options={seg(LOGO_POSITIONS)} />
              </OptionRow>
              <OptionRow label="Border">
                <Select value={cover.options.border} onChange={(e) => setOpt('border', e.target.value)} className="max-w-[160px]">
                  {BORDERS.map((b) => (
                    <option key={b.id} value={b.id}>{b.label}</option>
                  ))}
                </Select>
              </OptionRow>
              <OptionRow label="Page spacing">
                <Segmented size="sm" ariaLabel="Page spacing" value={cover.options.spacing} onChange={(v) => setOpt('spacing', v)} options={seg(SPACINGS)} />
              </OptionRow>
              <OptionRow label="Header spacing">
                <Segmented size="sm" ariaLabel="Header spacing" value={cover.options.headerSpacing} onChange={(v) => setOpt('headerSpacing', v)} options={seg(HEADER_SPACINGS)} />
              </OptionRow>
            </div>
          </Section>

          {/* Filename */}
          <Section title="File name" desc="Used for the downloaded PDF and PNG.">
            <div className="flex flex-wrap items-center gap-2">
              <Input value={filename} onChange={(e) => onFilename(e.target.value)} className="min-w-0 flex-1" aria-label="File name" />
              {cover.filenameEdited && (
                <Button variant="ghost" size="sm" onClick={resetFilename}>
                  <RotateCcw className="h-4 w-4" />
                  Auto
                </Button>
              )}
            </div>
            <p className="mt-2 font-mono text-[11px] text-muted">Saves as {filename || 'cover-page'}.pdf</p>
          </Section>
        </div>

        {/* ------------------------------------------------------- preview ---- */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-4">
            <div ref={fitRef} className="w-full">
              <div
                className="relative mx-auto overflow-hidden rounded-lg border border-hair bg-white shadow-2xl shadow-black/40"
                style={{ width: '100%', height: Math.round(1123 * scale) }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, width: 794, height: 1123, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                  <CoverDocument cover={cover} preview />
                </div>
              </div>
            </div>

            {!complete && (
              <Callout tone="warn" icon={FileWarning} title="Add a few details to download">
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </Callout>
            )}

            {/* Desktop actions */}
            <div className="hidden flex-col gap-2 lg:flex">
              <Button onClick={() => runExport('pdf')} disabled={!complete || !!busy} className="w-full">
                <Download className="h-4 w-4" />
                {busy === 'pdf' ? 'Preparing…' : 'Download PDF'}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => runExport('png')} disabled={!complete || !!busy}>
                  <ImageIcon className="h-4 w-4" />
                  {busy === 'png' ? '…' : 'PNG'}
                </Button>
                <Button variant="outline" onClick={onPrint} disabled={!complete}>
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile fixed action bar */}
      <div className="glass-strong fixed inset-x-0 bottom-0 z-40 border-t border-hair p-3 lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-2">
          <Button onClick={() => runExport('pdf')} disabled={!complete || !!busy} className="flex-1">
            <Download className="h-4 w-4" />
            {busy === 'pdf' ? 'Preparing…' : 'Download PDF'}
          </Button>
          <Button variant="outline" onClick={() => runExport('png')} disabled={!complete || !!busy} aria-label="Download PNG">
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={onPrint} disabled={!complete} aria-label="Print">
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Off-screen capture host — natural A4 size, rasterised on export / print. */}
      <div className="cover-capture-host" aria-hidden="true">
        <div id="cover-print">
          <CoverDocument ref={captureRef} cover={cover} />
        </div>
      </div>
    </div>
  )
}
