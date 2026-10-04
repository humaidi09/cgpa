// Step 4 — Design.
//
// The look of the deck, plus any slide that does not fit the section structure
// (a timeline, a comparison, a quote). The theme picker shows real swatches so
// the choice is a picture, not a dropdown of names.

import { Plus, Trash2 } from 'lucide-react'
import { Card, Field, Select, cx } from '@/components/ui'
import { THEMES } from '../themes'
import { TRANSITIONS } from '../exportPptx'
import { LAYOUT_MENU, ExtraEditor, friendlyFor, labelFor } from '../editors'

export default function StepDesign({
  themeId, onTheme, transition, onTransition,
  extras, onAddExtra, onRemoveExtra, onPatchExtra,
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">Make it look the way you want</h2>
        <p className="mt-1 text-sm text-muted">
          Pick a colour theme and how slides change in PowerPoint. You can preview every choice as you go.
        </p>
      </div>

      {/* theme swatches */}
      <Card className="p-5 sm:p-6">
        <h3 className="font-display text-base font-semibold text-ink">Colour theme</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEMES.map((t) => {
            const active = themeId === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTheme(t.id)}
                aria-pressed={active}
                className={cx(
                  'rounded-xl border p-3 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neonCyan',
                  active ? 'border-neonCyan/60 bg-neonCyan/[0.06]' : 'border-hair bg-fill/40 hover:border-neonCyan/30',
                )}
              >
                <span className="flex gap-1.5">
                  <span className="h-6 w-6 rounded-md" style={{ background: `#${t.bg}` }} />
                  <span className="h-6 w-6 rounded-md" style={{ background: `#${t.accent}` }} />
                  <span className="h-6 w-6 rounded-md" style={{ background: `#${t.accent2}` }} />
                  <span className="h-6 w-6 rounded-md" style={{ background: `#${t.ink}` }} />
                </span>
                <span className="mt-2 block text-sm font-semibold text-ink">{t.name}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted">{t.note}</span>
              </button>
            )
          })}
        </div>
      </Card>

      {/* transition */}
      <Card className="p-5 sm:p-6">
        <Field
          label="Slide transition"
          hint="How one slide moves to the next when you present in PowerPoint."
        >
          <Select value={transition} onChange={(e) => onTransition(e.target.value)}>
            {TRANSITIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </Field>
      </Card>

      {/* extra slides */}
      <Card className="p-5 sm:p-6">
        <h3 className="font-display text-base font-semibold text-ink">Add an extra slide</h3>
        <p className="mt-1 text-sm text-muted">
          Some ideas need a different shape — a timeline, a comparison, a big number, a quote. Add one
          and it slots in before your closing slide.
        </p>

        {extras.length > 0 && (
          <div className="mt-4 space-y-4">
            {extras.map((s, ei) => (
              <div key={s.__id} className="rounded-2xl border border-hair bg-fill/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-xs text-neonCyan">{friendlyFor(s.type)}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveExtra(ei)}
                    aria-label="Remove slide"
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <ExtraEditor slide={s} onChange={(ns) => onPatchExtra(ei, ns)} />
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <Field label="Add a slide">
            <Select value="" onChange={(e) => e.target.value && onAddExtra(e.target.value)}>
              <option value="">Choose a type…</option>
              {LAYOUT_MENU.filter((m) => m.type !== 'title' && m.type !== 'closing').map((m) => (
                <option key={m.type} value={m.type}>{friendlyFor(m.type) || labelFor(m.type)}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>
    </div>
  )
}
