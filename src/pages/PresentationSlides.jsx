import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, Download, ChevronLeft, ChevronRight,
  Play, Pause, Loader2, Layers, Palette, Sparkles,
} from 'lucide-react'
import { Button, Card, Field, Input, Select, Textarea, cx } from '@/components/ui'
import { THEMES, themeById, DEFAULT_THEME } from '@/tools/deck/themes'
import { buildDeck, blankSlide, LAYOUT_MENU } from '@/tools/deck/layouts'
import { exportDeck, TRANSITIONS } from '@/tools/deck/exportPptx'
import DeckStage from '@/tools/deck/DeckStage'

// Presentation Slides — build a full deck (cover, sections, closing) and any
// extra slide types, preview it live with the deck's real motion, then download
// it as an editable .pptx. Everything here is isolated from the CGPA engine.

const rid = () => `s-${Math.random().toString(36).slice(2, 9)}`

const SAMPLE = {
  cover: {
    eyebrow: 'CSE 2101 · Algorithms',
    title: 'Breadth-First Search, Explained',
    subtitle: 'Traversal, shortest paths, and where it breaks down',
    author: 'Your Name',
    org: 'Department of Computer Science',
    date: 'October 2026',
  },
  sections: [
    {
      heading: 'The idea',
      body: 'A queue, a visited set, and one rule: explore by distance.',
      points: [
        { title: 'Start at the source', body: 'Enqueue the source node and mark it visited.' },
        { title: 'Expand in order', body: 'Dequeue a node, enqueue its unvisited neighbours.' },
        { title: 'Level by level', body: 'Every node is reached by the shortest number of edges.' },
      ],
    },
    {
      heading: 'Shortest paths',
      body: 'In an unweighted graph, the first time you reach a node is via a shortest path.',
      points: [
        { title: 'Distance array', body: 'dist[v] = dist[u] + 1 when v is first discovered.' },
        { title: 'Parent pointers', body: 'Reconstruct the path by walking parents back to the source.' },
        { title: 'Uniform cost', body: 'Works only when every edge costs the same.' },
      ],
    },
    {
      heading: 'Limits',
      body: 'Where BFS stops being the right tool.',
      points: [
        { title: 'Weighted graphs', body: 'Use Dijkstra instead — BFS ignores edge weights.' },
        { title: 'Memory', body: 'The frontier can hold a whole level of the graph at once.' },
        { title: 'Infinite spaces', body: 'Unbounded graphs may never terminate without a goal test.' },
      ],
    },
  ],
  closing: { eyebrow: 'Thank you', title: 'Questions?', body: 'Happy to walk through the traversal on the board.' },
}

/* ------------------------------------------------------- extra-slide schema -- */

// A compact description of the editable fields for each slide type, so an added
// slide gets a friendly form instead of raw structure.
const EDIT = {
  title: { fields: [['eyebrow', 'Eyebrow'], ['title', 'Title'], ['subtitle', 'Subtitle']] },
  divider: { fields: [['number', 'Number', 'num'], ['title', 'Heading'], ['body', 'Body', 'area']] },
  indexBig: {
    fields: [['eyebrow', 'Eyebrow'], ['title', 'Heading']],
    list: { k: 'items', label: 'Points', item: [['title', 'Point'], ['body', 'Detail', 'area']] },
  },
  bullets: {
    fields: [['eyebrow', 'Eyebrow'], ['title', 'Heading']],
    list: { k: 'items', label: 'Points', item: [['title', 'Point'], ['body', 'Detail', 'area']] },
  },
  cards: {
    fields: [['eyebrow', 'Eyebrow'], ['title', 'Heading']],
    list: { k: 'items', label: 'Cards', item: [['title', 'Title'], ['body', 'Body', 'area']], max: 3 },
  },
  process: {
    fields: [['eyebrow', 'Eyebrow'], ['title', 'Heading']],
    list: { k: 'items', label: 'Steps', item: [['title', 'Step'], ['body', 'Detail', 'area']] },
  },
  funnel: {
    fields: [['eyebrow', 'Eyebrow'], ['title', 'Heading']],
    list: { k: 'items', label: 'Stages', item: [['title', 'Stage'], ['body', 'Note']] },
  },
  pyramid: {
    fields: [['eyebrow', 'Eyebrow'], ['title', 'Heading']],
    list: { k: 'items', label: 'Levels (bottom first)', item: [['title', 'Level']] },
  },
  radial: {
    fields: [['eyebrow', 'Eyebrow'], ['title', 'Heading'], ['center', 'Centre label']],
    list: { k: 'items', label: 'Nodes', item: [['title', 'Node']] },
  },
  stats: {
    fields: [['eyebrow', 'Eyebrow'], ['title', 'Heading']],
    list: { k: 'items', label: 'Figures', item: [['value', 'Value'], ['label', 'Label'], ['body', 'Note', 'area']] },
  },
  timeline: {
    fields: [['eyebrow', 'Eyebrow'], ['title', 'Heading']],
    list: { k: 'items', label: 'Milestones', item: [['label', 'Label'], ['title', 'Title']] },
  },
  quote: { fields: [['text', 'Quote', 'area'], ['by', 'Attribution']] },
  agenda: { fields: [['title', 'Heading']], lines: { k: 'items', label: 'Items (one per line)' } },
  closing: { fields: [['eyebrow', 'Eyebrow'], ['title', 'Title'], ['body', 'Body', 'area']] },
}

const labelFor = (type) => LAYOUT_MENU.find((m) => m.type === type)?.label || type

/* ------------------------------------------------------------- sub-editors --- */

function ListEditor({ spec, value, onChange }) {
  const items = value || []
  const setItem = (i, k, v) => onChange(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const add = () => onChange([...items, Object.fromEntries(spec.item.map(([k]) => [k, '']))])
  const remove = (i) => onChange(items.filter((_, j) => j !== i))
  const atMax = spec.max && items.length >= spec.max
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-hair bg-fill/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[11px] text-muted">#{i + 1}</span>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove"
              className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {spec.item.map(([k, l, t]) => (
              <Input
                key={k}
                value={it[k] ?? ''}
                onChange={(e) => setItem(i, k, e.target.value)}
                placeholder={l}
              />
            ))}
          </div>
        </div>
      ))}
      {!atMax && (
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      )}
    </div>
  )
}

function ExtraEditor({ slide, onChange }) {
  const spec = EDIT[slide.type] || { fields: [['title', 'Title']] }
  const set = (k, v) => onChange({ ...slide, [k]: v })

  if (slide.type === 'twoCol' || slide.type === 'compare') {
    const isCmp = slide.type === 'compare'
    const side = (key) => {
      const col = slide[key] || {}
      return (
        <div className="space-y-2">
          <Input value={col.heading ?? ''} onChange={(e) => set(key, { ...col, heading: e.target.value })} placeholder="Heading" />
          {isCmp ? (
            <Textarea
              value={(col.items || []).join('\n')}
              onChange={(e) => set(key, { ...col, items: e.target.value.split('\n').filter(Boolean) })}
              placeholder="One item per line"
              rows={3}
            />
          ) : (
            <Textarea value={col.body ?? ''} onChange={(e) => set(key, { ...col, body: e.target.value })} placeholder="Body text" rows={4} />
          )}
        </div>
      )
    }
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><p className="mb-1.5 font-mono text-xs text-muted">Left</p>{side('left')}</div>
        <div><p className="mb-1.5 font-mono text-xs text-muted">Right</p>{side('right')}</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {(spec.fields || []).map(([k, l, t]) => (
        <Field key={k} label={l}>
          {t === 'area' ? (
            <Textarea value={slide[k] ?? ''} onChange={(e) => set(k, e.target.value)} rows={2} />
          ) : (
            <Input type={t === 'num' ? 'number' : 'text'} value={slide[k] ?? ''} onChange={(e) => set(k, t === 'num' ? Number(e.target.value) : e.target.value)} />
          )}
        </Field>
      ))}
      {spec.lines && (
        <Field label={spec.lines.label}>
          <Textarea
            value={(slide[spec.lines.k] || []).join('\n')}
            onChange={(e) => set(spec.lines.k, e.target.value.split('\n'))}
            rows={4}
          />
        </Field>
      )}
      {spec.list && (
        <div>
          <p className="mb-2 font-mono text-xs text-muted">{spec.list.label}</p>
          <ListEditor spec={spec.list} value={slide[spec.list.k]} onChange={(v) => set(spec.list.k, v)} />
        </div>
      )}
    </div>
  )
}

/* --------------------------------------------------------------- composition -- */

function compose(content, extras) {
  const base = buildDeck(content)
  const closing = base.pop()
  return [...base, ...extras, closing]
}

/* ------------------------------------------------------------------- page ----- */

export default function PresentationSlides() {
  const [themeId, setThemeId] = useState(DEFAULT_THEME)
  const [transition, setTransition] = useState('fade')
  const [content, setContent] = useState(SAMPLE)
  const [extras, setExtras] = useState([])
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const theme = themeById(themeId)
  const slides = useMemo(() => compose(content, extras), [content, extras])
  const total = slides.length
  const cur = Math.min(i, total - 1)

  useEffect(() => {
    if (cur !== i) setI(cur)
  }, [cur, i])

  const go = useCallback((d) => setI((n) => (n + d + total) % total), [total])

  // Auto-play: advance through the deck on a timer so the motion reads as a deck.
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setI((n) => (n + 1) % total), 3600)
    return () => clearInterval(t)
  }, [playing, total])

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const setCover = (k, v) => setContent((c) => ({ ...c, cover: { ...c.cover, [k]: v } }))
  const setClosing = (k, v) => setContent((c) => ({ ...c, closing: { ...c.closing, [k]: v } }))

  const setSection = (si, patch) =>
    setContent((c) => ({ ...c, sections: c.sections.map((s, j) => (j === si ? { ...s, ...patch } : s)) }))
  const addSection = () =>
    setContent((c) => ({ ...c, sections: [...c.sections, { heading: 'New section', body: '', points: [{ title: '', body: '' }] }] }))
  const removeSection = (si) => setContent((c) => ({ ...c, sections: c.sections.filter((_, j) => j !== si) }))

  const addExtra = (type) => {
    const s = blankSlide(type, content.sections.length + 1)
    s.__id = rid()
    setExtras((x) => [...x, s])
  }

  const meta = { author: content.cover.author, org: content.cover.org, course: content.cover.course || content.cover.eyebrow }

  const onExport = async () => {
    setBusy(true)
    setErr('')
    try {
      await exportDeck({
        slides,
        theme,
        meta,
        transition,
        title: content.cover.title,
      })
    } catch (e) {
      setErr(e?.message || 'Export failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pb-10">
      <div className="mb-6">
        <Link to="/tools" className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          Student Tools
        </Link>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Presentation Slides</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Write your content once, pick a theme, and get a full slide deck — animated preview here, editable
          PowerPoint (.pptx) to download.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
        {/* ------------------------------------------------------- editor ---- */}
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-ink">
              <Palette className="h-4 w-4 text-neonCyan" />
              <h2 className="font-display text-lg font-semibold">Look</h2>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Theme">
                <Select value={themeId} onChange={(e) => setThemeId(e.target.value)}>
                  {THEMES.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Slide transition (in PowerPoint)">
                <Select value={transition} onChange={(e) => setTransition(e.target.value)}>
                  {TRANSITIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setThemeId(t.id)}
                  title={t.note}
                  className={cx(
                    'flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition-colors',
                    themeId === t.id ? 'border-neonCyan/50 text-ink' : 'border-hair text-muted hover:text-ink',
                  )}
                >
                  <span className="flex">
                    <span className="h-3.5 w-3.5 rounded-full" style={{ background: `#${t.bg}` }} />
                    <span className="-ml-1.5 h-3.5 w-3.5 rounded-full ring-1 ring-black/30" style={{ background: `#${t.accent}` }} />
                  </span>
                  {t.name}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-ink">
              <Sparkles className="h-4 w-4 text-neonCyan" />
              <h2 className="font-display text-lg font-semibold">Title slide</h2>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Eyebrow" className="sm:col-span-2">
                <Input value={content.cover.eyebrow} onChange={(e) => setCover('eyebrow', e.target.value)} placeholder="e.g. CSE 2101 · Algorithms" />
              </Field>
              <Field label="Title" className="sm:col-span-2">
                <Input value={content.cover.title} onChange={(e) => setCover('title', e.target.value)} placeholder="Presentation title" />
              </Field>
              <Field label="Subtitle" className="sm:col-span-2">
                <Input value={content.cover.subtitle} onChange={(e) => setCover('subtitle', e.target.value)} placeholder="One line under the title" />
              </Field>
              <Field label="Your name">
                <Input value={content.cover.author} onChange={(e) => setCover('author', e.target.value)} />
              </Field>
              <Field label="Department / course">
                <Input value={content.cover.org} onChange={(e) => setCover('org', e.target.value)} />
              </Field>
              <Field label="Date" className="sm:col-span-2">
                <Input value={content.cover.date} onChange={(e) => setCover('date', e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-ink">
                <Layers className="h-4 w-4 text-neonCyan" />
                <h2 className="font-display text-lg font-semibold">Sections</h2>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addSection}>
                <Plus className="h-4 w-4" />
                Add section
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              {content.sections.map((s, si) => (
                <div key={si} className="rounded-2xl border border-hair bg-fill/40 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-xs text-muted">Section {String(si + 1).padStart(2, '0')}</span>
                    <button
                      type="button"
                      onClick={() => removeSection(si)}
                      aria-label="Remove section"
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <Field label="Heading">
                      <Input value={s.heading} onChange={(e) => setSection(si, { heading: e.target.value })} />
                    </Field>
                    <Field label="Intro line">
                      <Input value={s.body} onChange={(e) => setSection(si, { body: e.target.value })} />
                    </Field>
                    <div>
                      <p className="mb-2 font-mono text-xs text-muted">Points</p>
                      <ListEditor
                        spec={{ item: [['title', 'Point'], ['body', 'Detail', 'area']] }}
                        value={s.points}
                        onChange={(v) => setSection(si, { points: v })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Extra slides</h2>
            <p className="mt-1 text-sm text-muted">Add any layout — statistics, timeline, comparison, funnel, pyramid, quote, and more. They slot in before the closing slide.</p>

            <div className="mt-4 space-y-4">
              {extras.map((s, ei) => (
                <div key={s.__id} className="rounded-2xl border border-hair bg-fill/40 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-xs text-neonCyan">{labelFor(s.type)}</span>
                    <button
                      type="button"
                      onClick={() => setExtras((x) => x.filter((_, j) => j !== ei))}
                      aria-label="Remove slide"
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <ExtraEditor slide={s} onChange={(ns) => setExtras((x) => x.map((y, j) => (j === ei ? { ...ns, __id: y.__id } : y)))} />
                </div>
              ))}
            </div>

            <div className="mt-4">
              <Field label="Add a slide">
                <Select value="" onChange={(e) => e.target.value && addExtra(e.target.value)}>
                  <option value="">Choose a layout…</option>
                  {LAYOUT_MENU.map((m) => (
                    <option key={m.type} value={m.type}>{m.label}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Closing slide</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Eyebrow">
                <Input value={content.closing.eyebrow} onChange={(e) => setClosing('eyebrow', e.target.value)} />
              </Field>
              <Field label="Title">
                <Input value={content.closing.title} onChange={(e) => setClosing('title', e.target.value)} />
              </Field>
              <Field label="Body" className="sm:col-span-2">
                <Input value={content.closing.body} onChange={(e) => setClosing('body', e.target.value)} />
              </Field>
            </div>
          </Card>
        </div>

        {/* ------------------------------------------------------ preview ---- */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden p-3">
            <DeckStage scene={slides[cur]} theme={theme} meta={meta} page={cur + 1} animate />

            <div className="mt-3 flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous slide"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-hair bg-fill text-muted transition-colors hover:text-ink"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  aria-label={playing ? 'Pause' : 'Play'}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-hair bg-fill text-neonCyan transition-colors hover:text-ink"
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next slide"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-hair bg-fill text-muted transition-colors hover:text-ink"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <span className="font-mono text-xs text-muted">
                {cur + 1} / {total} · {labelFor(slides[cur]?.type)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 px-1">
              <Button onClick={onExport} disabled={busy} className="flex-1">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {busy ? 'Building…' : 'Download .pptx'}
              </Button>
            </div>

            {err && <p className="mt-2 px-1 text-xs text-red-400">{err}</p>}

            <p className="mt-3 px-1 text-xs leading-relaxed text-muted">
              The downloaded file is fully editable in PowerPoint — every shape and text box is a real object, so you
              can restyle it there. Slide transitions are set; for richer per-element animation, use PowerPoint's
              Animations tab on any object.
            </p>
          </Card>

          {/* filmstrip */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {slides.map((s, idx) => (
              <button
                key={s.__id || idx}
                type="button"
                onClick={() => { setI(idx); setPlaying(false) }}
                className={cx(
                  'shrink-0 rounded-lg border px-3 py-2 text-left text-[11px] transition-colors',
                  idx === cur ? 'border-neonCyan/60 text-ink' : 'border-hair text-muted hover:text-ink',
                )}
              >
                <span className="font-mono">{String(idx + 1).padStart(2, '0')}</span>
                <span className="ml-1.5">{labelFor(s.type)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
