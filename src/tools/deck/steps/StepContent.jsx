// Step 3 — Content.
//
// The body of the deck. Each section becomes a divider slide plus a slide of key
// points, so the wording here ("Section", "Opening line", "Key points") matches
// what the student will actually see in the finished deck.

import { Plus, Trash2 } from 'lucide-react'
import { Button, Card, Field, Input } from '@/components/ui'
import { ListEditor } from '../editors'

export default function StepContent({ sections, onAdd, onRemove, onPatch }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">What will you cover?</h2>
          <p className="mt-1 text-sm text-muted">
            Each section becomes two slides — a divider, then its key points. Add as many as you need.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add section
        </Button>
      </div>

      <div className="space-y-4">
        {sections.map((s, si) => (
          <Card key={si} className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-xs text-neonCyan">Section {String(si + 1).padStart(2, '0')}</span>
              {sections.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemove(si)}
                  aria-label={`Remove section ${si + 1}`}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              <Field label="Section heading" hint="Short — it appears on the divider slide.">
                <Input value={s.heading} onChange={(e) => onPatch(si, { heading: e.target.value })} placeholder="e.g. The idea" />
              </Field>
              <Field label="Opening line" hint="Optional — one sentence setting up the section.">
                <Input value={s.body} onChange={(e) => onPatch(si, { body: e.target.value })} placeholder="e.g. A queue, a visited set, and one rule: explore by distance." />
              </Field>
              <div>
                <p className="mb-2 font-mono text-xs text-muted">Key points</p>
                <ListEditor
                  spec={{ item: [['title', 'Point'], ['body', 'Detail']] }}
                  value={s.points}
                  onChange={(v) => onPatch(si, { points: v })}
                  addLabel="Add point"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
