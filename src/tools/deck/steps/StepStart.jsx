// Step 1 — Start.
//
// Two ways in: describe a topic and let AI write the whole deck, or pick a
// starter and fill it yourself. Either way the student lands in the wizard with
// a real deck to edit — never an empty form.

import { useState } from 'react'
import { Check, FileText, Sparkles, Loader2, Wand2 } from 'lucide-react'
import { Button, Card, Textarea, Segmented, cx } from '@/components/ui'
import { STARTERS } from '../templates'
import { themeById } from '../themes'

// A tiny monochrome rendering of a cover slide, in the starter's theme — just
// enough to read as "a slide" at a glance.
function MiniSlide({ themeId, active }) {
  const t = themeById(themeId)
  return (
    <div
      className={cx('relative w-full overflow-hidden rounded-lg border', active ? 'border-neonCyan/50' : 'border-hair')}
      style={{ aspectRatio: '16 / 9', background: `#${t.bg}` }}
      aria-hidden="true"
    >
      <span className="absolute left-[10%] top-[22%] h-[3%] w-[16%]" style={{ background: `#${t.accent}` }} />
      <span className="absolute left-[10%] top-[36%] h-[9%] w-[62%] rounded-sm" style={{ background: `#${t.ink}`, opacity: 0.92 }} />
      <span className="absolute left-[10%] top-[52%] h-[5%] w-[44%] rounded-sm" style={{ background: `#${t.muted}`, opacity: 0.7 }} />
      <span className="absolute left-[10%] top-[70%] h-[3%] w-[30%] rounded-sm" style={{ background: `#${t.muted}`, opacity: 0.5 }} />
      <span className="absolute -bottom-[30%] -right-[10%] h-[80%] w-[40%] rounded-full border" style={{ borderColor: `#${t.accent}`, opacity: 0.35 }} />
      <span className="absolute -bottom-[20%] -right-[4%] h-[55%] w-[28%] rounded-full border" style={{ borderColor: `#${t.accent}`, opacity: 0.5 }} />
    </div>
  )
}

export default function StepStart({ starterId, themeId, onPick, onGenerate, aiBusy, aiErr }) {
  const [topic, setTopic] = useState('')
  const [detail, setDetail] = useState('medium')
  const canGen = topic.trim().length >= 3 && !aiBusy

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">How would you like to start?</h2>
        <p className="mt-1 text-sm text-muted">
          Describe your topic and let AI draft the whole deck, or pick a starter and fill it in. You can
          edit every word afterwards.
        </p>
      </div>

      {/* ---- AI generation ---------------------------------------------------- */}
      <Card glow className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-ink">
          <Sparkles className="h-4 w-4 text-neonCyan" />
          <h3 className="font-display text-base font-semibold">Generate with AI</h3>
        </div>
        <p className="mt-1 text-sm text-muted">
          Write what your presentation is about — the more specific, the better.
        </p>
        <Textarea
          className="mt-3"
          rows={3}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. How breadth-first search finds shortest paths in unweighted graphs, for a 2nd-year algorithms class"
          disabled={aiBusy}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Segmented
            size="sm"
            ariaLabel="How much detail"
            value={detail}
            onChange={setDetail}
            options={[
              { value: 'short', label: 'Short' },
              { value: 'medium', label: 'Medium' },
              { value: 'long', label: 'Detailed' },
            ]}
          />
          <Button onClick={() => onGenerate(topic.trim(), detail)} disabled={!canGen}>
            {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {aiBusy ? 'Writing your deck…' : 'Generate deck'}
          </Button>
        </div>
        {aiBusy && (
          <p className="mt-2 text-xs text-muted">
            The server may be waking up — this can take up to a minute on the first try.
          </p>
        )}
        {aiErr && <p className="mt-2 text-xs text-red-400">{aiErr}</p>}
      </Card>

      {/* ---- manual starters -------------------------------------------------- */}
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-hair" />
        <span className="font-mono text-xs text-muted">or pick a starter</span>
        <span className="h-px flex-1 bg-hair" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STARTERS.map((s) => {
          const active = starterId === s.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onPick(s.id)}
              aria-pressed={active}
              className={cx(
                'group rounded-2xl border p-3 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neonCyan',
                active
                  ? 'border-neonCyan/60 bg-neonCyan/[0.06]'
                  : 'border-hair bg-fill/40 hover:border-neonCyan/30 hover:bg-fill',
              )}
            >
              <MiniSlide themeId={themeId} active={active} />
              <div className="mt-3 flex items-center justify-between gap-2">
                <h3 className="font-display text-sm font-semibold text-ink">{s.name}</h3>
                {active && (
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-neonCyan text-void">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{s.blurb}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-muted/80">{s.useFor}</p>
            </button>
          )
        })}
      </div>

      <Card className="flex items-start gap-3 p-4">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-neonCyan" />
        <p className="text-sm leading-relaxed text-muted">
          AI writes a first draft you then edit — it never copies anyone's slides. Prefer to write it
          yourself? <span className="text-ink">Class presentation</span> is the safest manual start.
        </p>
      </Card>
    </div>
  )
}
