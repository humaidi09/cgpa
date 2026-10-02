import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileText, Presentation, FlaskConical, Quote, Mail,
  ArrowRight, Plus, Pencil, Copy, Trash2, Download, Clock, GraduationCap,
} from 'lucide-react'
import { Button, Badge, Card, EmptyState, cx } from '@/components/ui'
import { useTools } from '@/tools/toolsStore'
import CoverDocument from '@/tools/cover/CoverDocument'
import { templateById } from '@/tools/cover/templates'
import { buildFilename } from '@/tools/cover/filename'
import { downloadPDF } from '@/tools/cover/exportCover'

// Student Tools — the hub. One working tool today (Assignment Cover Page) and a
// deliberately honest set of "coming soon" placeholders so the module reads as a
// growing toolkit, not a single page. Everything here is isolated from the CGPA
// calculator; this page never touches the transcript or the grading engine.

const TOOLS = [
  {
    id: 'cover-page',
    to: '/tools/cover-page',
    title: 'Assignment Cover Page',
    desc: 'University-style cover pages, filled in seconds and ready to submit as PDF, PNG, or print.',
    icon: FileText,
    ready: true,
  },
  { id: 'presentation', to: '/tools/presentation', title: 'Presentation Slides', desc: 'Full 16:9 slide decks from your content — themed, animated preview, editable PowerPoint (.pptx) download.', icon: Presentation, ready: true },
  { id: 'lab-report', to: '/tools/lab-report', title: 'Lab Report Cover', desc: 'Structured cover sheets for lab and experiment reports.', icon: FlaskConical, ready: true },
  { id: 'citation', to: '/tools/citation', title: 'Citation Generator', desc: 'Format references in APA, MLA, and IEEE styles.', icon: Quote, ready: true },
  { id: 'email', to: '/tools/email', title: 'Academic Email', desc: 'Clear, well-phrased emails to instructors and offices.', icon: Mail, ready: true },
]

function fmtWhen(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function ToolCard({ tool }) {
  const Icon = tool.icon
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cx(
            'grid h-11 w-11 place-items-center rounded-xl border',
            tool.ready ? 'border-neonCyan/30 bg-neonCyan/10 text-neonCyan' : 'border-hair bg-fill text-muted',
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        {tool.ready ? (
          <ArrowRight className="h-5 w-5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-neonCyan" />
        ) : (
          <Badge tone="neutral">
            <Clock className="h-3 w-3" />
            Soon
          </Badge>
        )}
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-ink">{tool.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{tool.desc}</p>
    </>
  )

  if (tool.ready) {
    return (
      <Link
        to={tool.to}
        className="group rounded-2xl border border-hair bg-fill p-5 transition-colors hover:border-neonCyan/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neonCyan"
      >
        {inner}
      </Link>
    )
  }
  return <div className="rounded-2xl border border-dashed border-hair bg-fill/50 p-5 opacity-75">{inner}</div>
}

function RecentRow({ cover, onEdit, onDuplicate, onDelete, onDownload, busy }) {
  const tpl = templateById(cover.template)
  const title = cover.assignment?.title?.trim() || 'Untitled cover page'
  const uni = cover.university?.name?.trim() || 'No university set'
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-hair bg-fill/50 p-3 sm:flex-nowrap">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-hair bg-fill text-muted">
        <FileText className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{title}</p>
        <p className="truncate font-mono text-[11px] text-muted">
          {uni} · {tpl.label} · {fmtWhen(cover.updatedAt)}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onDownload}
          disabled={busy}
          title="Download PDF"
          aria-label="Download PDF"
          className="grid h-9 w-9 place-items-center rounded-lg border border-hair bg-fill text-muted transition-colors hover:border-neonCyan/40 hover:text-neonCyan disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          title="Duplicate"
          aria-label="Duplicate"
          className="grid h-9 w-9 place-items-center rounded-lg border border-hair bg-fill text-muted transition-colors hover:border-neonCyan/40 hover:text-neonCyan"
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onEdit}
          title="Edit"
          aria-label="Edit"
          className="grid h-9 w-9 place-items-center rounded-lg border border-hair bg-fill text-muted transition-colors hover:border-neonCyan/40 hover:text-neonCyan"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete"
          aria-label="Delete"
          className="grid h-9 w-9 place-items-center rounded-lg border border-hair bg-fill text-muted transition-colors hover:border-red-500/40 hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default function StudentTools() {
  const navigate = useNavigate()
  const covers = useTools((s) => s.covers)
  const duplicateCover = useTools((s) => s.duplicateCover)
  const deleteCover = useTools((s) => s.deleteCover)

  // Off-screen host used to re-render + rasterise a saved cover for re-download.
  const [exporting, setExporting] = useState(null)
  const hostRef = useRef(null)

  useEffect(() => {
    if (!exporting) return
    let cancelled = false
    // Wait a frame so the off-screen document has painted, then rasterise it.
    const id = requestAnimationFrame(async () => {
      try {
        if (hostRef.current) await downloadPDF(hostRef.current, buildFilename(exporting))
      } catch {
        /* surfaced by the disabled state clearing; a failed export is non-fatal */
      } finally {
        if (!cancelled) setExporting(null)
      }
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(id)
    }
  }, [exporting])

  const onDelete = (cover) => {
    const title = cover.assignment?.title?.trim() || 'this cover page'
    if (window.confirm(`Delete "${title}"? This cannot be undone.`)) deleteCover(cover.id)
  }

  const onDuplicate = (cover) => {
    const copy = duplicateCover(cover.id)
    if (copy) navigate(`/tools/cover-page?id=${copy.id}`)
  }

  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Practical tools for coursework
        </h1>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
          <ToolCard key={t.id} tool={t} />
        ))}
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-ink">Recent cover pages</h2>
          <Button as={Link} to="/tools/cover-page" variant="outline" size="sm">
            <Plus className="h-4 w-4" />
            New cover page
          </Button>
        </div>

        {covers.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No cover pages yet"
            action={
              <Button as={Link} to="/tools/cover-page">
                <Plus className="h-4 w-4" />
                Create your first cover page
              </Button>
            }
          >
            Cover pages you create are saved here so you can edit, duplicate, or download them again.
          </EmptyState>
        ) : (
          <Card className="divide-y divide-hair/60 p-2">
            <div className="space-y-2 p-1">
              {covers.map((c) => (
                <RecentRow
                  key={c.id}
                  cover={c}
                  busy={!!exporting}
                  onEdit={() => navigate(`/tools/cover-page?id=${c.id}`)}
                  onDuplicate={() => onDuplicate(c)}
                  onDelete={() => onDelete(c)}
                  onDownload={() => setExporting(c)}
                />
              ))}
            </div>
          </Card>
        )}
      </section>

      {/* Off-screen capture host for re-download (natural A4 size, off-canvas). */}
      {exporting && (
        <div className="cover-capture-host" aria-hidden="true">
          <div id="cover-print">
            <CoverDocument ref={hostRef} cover={exporting} />
          </div>
        </div>
      )}
    </div>
  )
}
