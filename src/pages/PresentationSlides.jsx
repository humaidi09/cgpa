import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Layers, Pause, Play } from 'lucide-react'
import { Card, cx } from '@/components/ui'
import { DEFAULT_THEME, themeById } from '@/tools/deck/themes'
import { buildDeck, blankSlide } from '@/tools/deck/layouts'
import { exportDeck } from '@/tools/deck/exportPptx'
import { STARTERS } from '@/tools/deck/templates'
import { generateDeck } from '@/tools/deck/aiGenerate'
import { labelFor } from '@/tools/deck/editors'
import DeckStage from '@/tools/deck/DeckStage'

import Stepper from '@/tools/deck/steps/Stepper'
import WizardNav from '@/tools/deck/steps/WizardNav'
import StepStart from '@/tools/deck/steps/StepStart'
import StepCover from '@/tools/deck/steps/StepCover'
import StepContent from '@/tools/deck/steps/StepContent'
import StepDesign from '@/tools/deck/steps/StepDesign'
import StepDownload from '@/tools/deck/steps/StepDownload'

// Presentation Slides — a five-step wizard. A student picks a starter, fills in
// plain-language fields, chooses a look, and downloads an editable .pptx. The
// deck engine (layouts / themes / DeckStage / exportPptx) is untouched; this page
// is only the shell that gathers the content and drives the steps.

const STEPS = ['Start', 'Cover', 'Content', 'Design', 'Download']
const rid = () => `s-${Math.random().toString(36).slice(2, 9)}`

export default function PresentationSlides() {
  const [step, setStep] = useState(0)
  const [furthest, setFurthest] = useState(0)

  const [starterId, setStarterId] = useState('class')
  const [themeId, setThemeId] = useState(DEFAULT_THEME)
  const [transition, setTransition] = useState('fade')
  const [content, setContent] = useState(() => STARTERS[0].make())
  const [extras, setExtras] = useState([])

  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // AI generation (step 1) has its own in-flight + error state.
  const [aiBusy, setAiBusy] = useState(false)
  const [aiErr, setAiErr] = useState('')

  const theme = themeById(themeId)

  // Compose: cover + sections + extras + closing, exactly as before.
  const slides = useMemo(() => {
    const base = buildDeck(content)
    const closing = base.pop()
    return [...base, ...extras, closing]
  }, [content, extras])

  const total = slides.length
  const cur = Math.min(i, total - 1)
  useEffect(() => { if (cur !== i) setI(cur) }, [cur, i])

  const go = useCallback((d) => setI((n) => (n + d + total) % total), [total])

  // Auto-play the preview so the deck reads as a deck, not a static picture.
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setI((n) => (n + 1) % total), 3600)
    return () => clearInterval(t)
  }, [playing, total])

  // Left/right arrows move through the slides — ignored while typing.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  /* --------------------------------------------------------------- content -- */
  const setCover = (k, v) => setContent((c) => ({ ...c, cover: { ...c.cover, [k]: v } }))
  const setClosing = (k, v) => setContent((c) => ({ ...c, closing: { ...c.closing, [k]: v } }))
  const setSection = (si, patch) =>
    setContent((c) => ({ ...c, sections: c.sections.map((s, j) => (j === si ? { ...s, ...patch } : s)) }))
  const addSection = () =>
    setContent((c) => ({ ...c, sections: [...c.sections, { heading: 'New section', body: '', points: [{ title: '', body: '' }] }] }))
  const removeSection = (si) => setContent((c) => ({ ...c, sections: c.sections.filter((_, j) => j !== si) }))

  const pickStarter = (id) => {
    const s = STARTERS.find((x) => x.id === id)
    if (!s) return
    setStarterId(id)
    setContent(s.make())
    setExtras([])
    setI(0)
  }

  // AI: topic in, a full deck out. On success, drop the student at the Cover
  // step with every step unlocked, so they review the title then page through.
  const generateFromTopic = async (topic, detail) => {
    setAiBusy(true)
    setAiErr('')
    try {
      const generated = await generateDeck({ topic, detail })
      setContent(generated)
      setExtras([])
      setI(0)
      setStep(1)
      setFurthest(STEPS.length - 1)
    } catch (e) {
      setAiErr(e?.message || 'Generation failed. Please try again.')
    } finally {
      setAiBusy(false)
    }
  }

  const addExtra = (type) => {
    const s = blankSlide(type, content.sections.length + 1)
    s.__id = rid()
    setExtras((x) => [...x, s])
  }

  /* ----------------------------------------------------------------- export -- */
  const meta = { author: content.cover.author, org: content.cover.org, course: content.cover.eyebrow }

  const onExport = async () => {
    setBusy(true)
    setErr('')
    try {
      await exportDeck({ slides, theme, meta, transition, title: content.cover.title })
    } catch (e) {
      setErr(e?.message || 'Export failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  /* ------------------------------------------------------------ step guards -- */
  const titleOk = content.cover.title.trim().length > 0
  const canNext = step !== 1 || titleOk
  const blockedReason = step === 1 && !titleOk ? 'Add a title to continue' : ''

  const next = () => {
    const n = Math.min(step + 1, STEPS.length - 1)
    setStep(n)
    setFurthest((f) => Math.max(f, n))
  }
  const back = () => setStep((s) => Math.max(0, s - 1))
  const jump = (n) => setStep(n)

  return (
    <div className="pb-10">
      <div className="mb-6">
        <Link to="/tools" className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          Student Tools
        </Link>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Presentation Slides</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Build a full slide deck in five steps — preview it live, then download it as an editable
          PowerPoint (.pptx) file.
        </p>
      </div>

      <div className="mb-6">
        <Stepper steps={STEPS} current={step} furthest={furthest} onGo={jump} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        {/* ------------------------------------------------------------ steps -- */}
        <div>
          {step === 0 && <StepStart starterId={starterId} themeId={themeId} onPick={pickStarter} onGenerate={generateFromTopic} aiBusy={aiBusy} aiErr={aiErr} />}
          {step === 1 && <StepCover cover={content.cover} onChange={setCover} />}
          {step === 2 && (
            <StepContent
              sections={content.sections}
              onAdd={addSection}
              onRemove={removeSection}
              onPatch={setSection}
            />
          )}
          {step === 3 && (
            <StepDesign
              themeId={themeId}
              onTheme={setThemeId}
              transition={transition}
              onTransition={setTransition}
              extras={extras}
              onAddExtra={addExtra}
              onRemoveExtra={(ei) => setExtras((x) => x.filter((_, j) => j !== ei))}
              onPatchExtra={(ei, ns) => setExtras((x) => x.map((y, j) => (j === ei ? { ...ns, __id: y.__id } : y)))}
            />
          )}
          {step === 4 && (
            <StepDownload
              slides={slides}
              themeId={themeId}
              cover={content.cover}
              busy={busy}
              err={err}
              onExport={onExport}
            />
          )}

          <WizardNav
            step={step}
            lastStep={STEPS.length - 1}
            canNext={canNext}
            blockedReason={blockedReason}
            onBack={back}
            onNext={next}
          />
        </div>

        {/* ---------------------------------------------------------- preview -- */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden p-3">
            <DeckStage scene={slides[cur]} theme={theme} meta={meta} page={cur + 1} index={cur + 1} animate />

            <div className="mt-3 flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { go(-1); setPlaying(false) }}
                  aria-label="Previous slide"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-hair bg-fill text-muted transition-colors hover:text-ink"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  aria-label={playing ? 'Pause preview' : 'Play preview'}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-hair bg-fill text-neonCyan transition-colors hover:text-ink"
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => { go(1); setPlaying(false) }}
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

          <p className="mt-3 flex items-start gap-2 px-1 text-xs leading-relaxed text-muted">
            <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            This preview is built from the same elements the download uses, so what you see here is what
            opens in PowerPoint.
          </p>
        </div>
      </div>
    </div>
  )
}
