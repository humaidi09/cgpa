// Step 5 — Download.
//
// The payoff. Confirms what the deck contains, then hands over the .pptx. The
// note under the button is deliberately specific about what "editable" means, so
// nobody is surprised when they open it in PowerPoint.

import { Check, Download, Loader2, ShieldCheck } from 'lucide-react'
import { Button, Callout, Card } from '@/components/ui'
import { themeById } from '../themes'
import { labelFor } from '../editors'

export default function StepDownload({ slides, themeId, cover, busy, err, onExport }) {
  const theme = themeById(themeId)
  const titles = slides.filter((s) => s.type !== 'title').map((s) => labelFor(s.type))
  const counts = titles.reduce((acc, t) => ({ ...acc, [t]: (acc[t] || 0) + 1 }), {})
  const filename = `${(cover.title || 'presentation').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'presentation'}.pptx`

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">Your deck is ready</h2>
        <p className="mt-1 text-sm text-muted">
          {slides.length} slides in <span className="text-ink">{theme.name}</span>. Download it and open it in
          PowerPoint, Google Slides, or Keynote.
        </p>
      </div>

      <Card className="p-5 sm:p-6">
        <p className="font-mono text-xs text-muted">WHAT'S INSIDE</p>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <li className="flex items-center gap-2 text-sm text-ink">
            <Check className="h-4 w-4 shrink-0 text-neonCyan" />
            Title slide
          </li>
          {Object.entries(counts).map(([label, n]) => (
            <li key={label} className="flex items-center gap-2 text-sm text-ink">
              <Check className="h-4 w-4 shrink-0 text-neonCyan" />
              {n > 1 ? `${n} × ${label.toLowerCase()}` : label}
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-col gap-3">
        <Button onClick={onExport} disabled={busy} size="lg" className="w-full sm:w-auto">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          {busy ? 'Building your deck…' : `Download ${filename}`}
        </Button>
        {err && <p className="text-sm text-red-400">{err}</p>}
      </div>

      <Callout tone="info" icon={ShieldCheck} title="Fully editable in PowerPoint">
        Every shape, chart, and text box in the file is a real object — not a picture of a slide. Change any
        wording, colour, or position inside PowerPoint, and it stays sharp at any size. Slide transitions are
        already set; for per-element animation, use PowerPoint's Animations tab on any object.
      </Callout>
    </div>
  )
}
